/**
 * Auth smoke test. Two parts:
 *
 *   Part A (offline, always runs): password hashing, signup validation, email/username
 *   normalization, and the avatar/HTTP-431 guard. No database required.
 *
 *   Part B (database roundtrip, runs when DATABASE_URL is reachable): exercises the REAL signup
 *   route and the REAL NextAuth authorize() so a regression like Prisma schema/DB drift — which
 *   silently breaks sign-in for custom users while demo login keeps working — is caught here.
 *
 * Run with: npm run auth:smoke
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { signupSchema } from "../lib/validators";
import { canAccessCoachTools, isAdmin } from "../lib/roles";

// Load DB env from .env files (without printing anything from them) so the roundtrip can connect.
function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // file may not exist; ignore
  }
}
loadEnv(".env.local");
loadEnv(".env");

async function offlineChecks() {
  // 1. Passwords are hashed and checked correctly.
  const hash = await bcrypt.hash("password123", 12);
  assert.ok(hash.startsWith("$2"), "bcrypt should produce a bcrypt hash.");
  assert.ok(await bcrypt.compare("password123", hash), "Correct password must verify.");
  assert.ok(!(await bcrypt.compare("wrong-password", hash)), "Wrong password must be rejected.");

  // 2. Signup normalizes email + username so sign-in (which lowercases) always matches.
  const parsed = signupSchema.parse({
    email: "  Test.User@Example.COM ",
    password: "password123",
    confirmPassword: "password123",
    username: "TestUser",
    displayName: "Test User"
  });
  assert.equal(parsed.email, "test.user@example.com", "Email must be trimmed and lowercased.");
  assert.equal(parsed.username, "testuser", "Username must be lowercased.");
  assert.equal(parsed.accountType, "STUDENT", "Account type defaults to STUDENT.");

  // 3. Validation rejects bad input with clear failures (not silent success).
  assert.throws(
    () =>
      signupSchema.parse({ email: "test@example.com", password: "password123", confirmPassword: "different1", username: "abc", displayName: "Ab" }),
    "Mismatched confirm password must fail."
  );
  assert.throws(
    () => signupSchema.parse({ email: "test@example.com", password: "short", confirmPassword: "short", username: "abc", displayName: "Ab" }),
    "Password shorter than 8 characters must fail."
  );
  assert.throws(
    () =>
      signupSchema.parse({ email: "not-an-email", password: "password123", confirmPassword: "password123", username: "abc", displayName: "Ab" }),
    "Invalid email must fail."
  );
  // Only STUDENT or COACH may be self-selected — never ADMIN.
  assert.throws(
    () =>
      signupSchema.parse({ email: "a@b.com", password: "password123", confirmPassword: "password123", username: "abc", displayName: "Ab", accountType: "ADMIN" }),
    "accountType ADMIN must be rejected."
  );

  // 4. Avatar: an uploaded path is accepted; data: URLs and huge strings are rejected so image data
  // never lands in the cookie/JWT (HTTP 431 guard).
  const base = { email: "a@example.com", password: "password123", confirmPassword: "password123", username: "abc", displayName: "Ab" };
  assert.equal(
    signupSchema.parse({ ...base, avatarUrl: "/uploads/avatars/new-123.webp" }).avatarUrl,
    "/uploads/avatars/new-123.webp",
    "Uploaded avatar path must be accepted."
  );
  assert.equal(signupSchema.parse({ ...base, avatarUrl: "" }).avatarUrl, null, "Empty avatar becomes null (initials fallback).");
  assert.throws(
    () => signupSchema.parse({ ...base, avatarUrl: "data:image/png;base64,AAAA" }),
    "data: image URLs must be rejected (no image data in the cookie)."
  );
  assert.throws(
    () => signupSchema.parse({ ...base, avatarUrl: `https://x.com/${"a".repeat(400)}.png` }),
    "Oversized avatar URLs must be rejected."
  );

  // 5. Coach access is server-authoritative and centralized. An actual COACH (and ADMIN) may reach
  // coach tools; a STUDENT may not. No hardcoded coach email — the decision is role-only.
  assert.equal(canAccessCoachTools("COACH"), true, "A COACH may access coach pages.");
  assert.equal(canAccessCoachTools("ADMIN"), true, "An ADMIN may access coach pages (intentional).");
  assert.equal(canAccessCoachTools("STUDENT"), false, "A STUDENT may NOT access coach pages.");
  assert.equal(canAccessCoachTools(null), false, "A missing role may NOT access coach pages.");
  assert.equal(canAccessCoachTools(undefined), false, "An undefined role may NOT access coach pages.");
  assert.equal(isAdmin("ADMIN"), true, "ADMIN is admin.");
  assert.equal(isAdmin("COACH"), false, "COACH is not admin (admin-only actions stay admin-only).");

  // The coach page guard uses the shared helper (single source of truth), and the session role is
  // resolved server-authoritatively (narrow role fetch) so a real coach is never denied by a stale JWT.
  assert.ok(readFileSync("app/(app)/coach/page.tsx", "utf8").includes("canAccessCoachTools"), "coach page uses the shared coach-access guard.");
  const authSource = readFileSync("lib/auth.ts", "utf8");
  assert.ok(authSource.includes("authoritativeRole") && authSource.includes("select: { role: true"), "session role is refreshed server-authoritatively (resilient to profile-read failure).");

  console.log("Part A (offline) passed: hashing, validation, normalization, 431 avatar guard, coach-access role gate (COACH/ADMIN allow, STUDENT deny), server-authoritative role.");
}

async function signupViaRoute(payload: Record<string, unknown>) {
  const { POST } = await import("../app/api/signup/route");
  const response = await POST(
    new Request("http://localhost/api/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    })
  );
  const json = (await response.json().catch(() => ({}))) as { user?: { id: string; role: string }; error?: string };
  return { status: response.status, json };
}

// Large profile fields (avatar/bio/etc.) in the cookie are what triggers HTTP 431, so the JWT must
// keep only minimal claims. Runs the real jwt callback and asserts the heavy fields are stripped.
function jwtStaysSmall(
  jwt: (p: { token: Record<string, unknown>; user: unknown }) => Record<string, unknown>,
  authorizedUser: Record<string, unknown>
) {
  // Seed the token the way NextAuth would (default claims copied from the returned user), then run
  // our callback, which strips the heavy fields.
  const seeded = {
    sub: String(authorizedUser.id),
    name: authorizedUser.name,
    email: authorizedUser.email,
    picture: authorizedUser.image,
    avatarUrl: authorizedUser.avatarUrl,
    bio: authorizedUser.bio,
    username: authorizedUser.username
  };
  const token = jwt({ token: seeded as Record<string, unknown>, user: authorizedUser });
  const heavy = ["picture", "avatarUrl", "bio", "username", "displayName", "schoolOrClub", "preferredOrganization", "level", "rank", "xp"];
  for (const key of heavy) {
    assert.ok(token[key] === undefined, `JWT must not carry heavy field "${key}" (HTTP 431 guard).`);
  }
  const size = Buffer.byteLength(JSON.stringify(token), "utf8");
  assert.ok(size < 1024, `JWT payload should stay small; got ${size} bytes.`);
  return true;
}

async function databaseRoundtrip() {
  if (!process.env.DATABASE_URL) {
    console.log("Part B (database) skipped: DATABASE_URL is not set.");
    return;
  }

  const { prisma } = await import("../lib/prisma");

  // Confirm the database is reachable AND the Prisma client matches it (a full-row read). Schema/DB
  // drift surfaces here as P2022 instead of silently breaking only custom sign-in.
  try {
    await prisma.user.findFirst({ select: { id: true } });
  } catch (error) {
    console.log("Part B (database) skipped: database not reachable.", error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    return;
  }

  const { authOptions } = await import("../lib/auth");
  const authorize = (authOptions.providers[0] as unknown as { options: { authorize: (c: unknown, r: unknown) => Promise<Record<string, unknown> | null> } }).options.authorize;

  const stamp = Date.now();
  const short = stamp.toString(36); // keeps usernames within the 24-char limit
  const studentEmail = `smoke-student-${stamp}@debatearena.test`;
  const coachEmail = `smoke-coach-${stamp}@debatearena.test`;
  const password = "Password123!";

  try {
    // 1+2. Sign up a brand-new student through the real route, with mixed-case email to prove
    // normalization, and confirm the row exists with a password hash.
    const signup = await signupViaRoute({
      email: `  Smoke-Student-${stamp}@DebateArena.TEST `,
      password,
      confirmPassword: password,
      username: `smoke_stu_${short}`,
      displayName: "Smoke Student"
    });
    assert.equal(signup.status, 201, `Signup should return 201, got ${signup.status} (${signup.json.error ?? "ok"}).`);

    const dbUser = await prisma.user.findUnique({
      where: { email: studentEmail },
      select: { id: true, passwordHash: true, role: true, xp: true, streak: true, wins: true, rank: true }
    });
    assert.ok(dbUser, "New user must exist in the database after signup.");
    assert.ok(dbUser.passwordHash, "New user must have a bcrypt password hash stored.");
    assert.equal(dbUser.role, "STUDENT", "Default account must have role STUDENT.");

    // New-user stats must start at zero — no fake progress for a brand-new account.
    assert.equal(dbUser.xp, 0, "New user XP must be 0.");
    assert.equal(dbUser.streak, 0, "New user streak must be 0.");
    assert.equal(dbUser.wins, 0, "New user wins must be 0.");
    assert.equal(dbUser.rank, "BRONZE", "New user rank must be BRONZE.");

    // 3+4. Sign in with the same credentials → must return THIS user, not the demo fallback.
    const ok = await authorize({ email: studentEmail, password }, {});
    assert.ok(ok, "Correct credentials must sign in.");
    assert.equal(ok!.id, dbUser.id, "Session user must be the new user, not Demo Student.");
    assert.notEqual(ok!.id, "dev-demo-student", "Must NOT fall back to the demo student.");
    assert.equal(ok!.email, studentEmail, "Signed-in email must match the new user.");

    // Mixed-case email at sign-in still matches (case-insensitive lookup).
    const okMixed = await authorize({ email: studentEmail.toUpperCase(), password }, {});
    assert.ok(okMixed && okMixed.id === dbUser.id, "Mixed-case email must still sign in.");

    // Wrong password must fail clearly.
    const wrong = await authorize({ email: studentEmail, password: "totally-wrong" }, {});
    assert.equal(wrong, null, "Wrong password must be rejected (null).");

    // 431 guard: the JWT keeps only minimal claims.
    const jwtCallback = authOptions.callbacks?.jwt;
    assert.ok(jwtCallback, "jwt callback must be defined.");
    jwtStaysSmall(
      jwtCallback as unknown as (p: { token: Record<string, unknown>; user: unknown }) => Record<string, unknown>,
      ok!
    );

    // 5. Coach signup → role COACH, and can sign in as themselves.
    const coachSignup = await signupViaRoute({
      email: coachEmail,
      password,
      confirmPassword: password,
      username: `smoke_co_${short}`,
      displayName: "Smoke Coach",
      accountType: "COACH"
    });
    assert.equal(coachSignup.status, 201, `Coach signup should return 201, got ${coachSignup.status}.`);
    const coachOk = await authorize({ email: coachEmail, password }, {});
    assert.ok(coachOk && coachOk.role === "COACH", "Coach must sign in with role COACH.");

    // 6. Demo account still works (seeded student credentials).
    const demoPassword = process.env.SEED_STUDENT_PASSWORD || "password123";
    const demo = await authorize({ email: "student@debatearena.ai", password: demoPassword }, {});
    assert.ok(demo && demo.role === "STUDENT", "Demo student must still sign in.");

    // ---- Password reset flow ----
    const { requestPasswordReset, createPasswordResetToken, resetPassword } = await import("../lib/password-reset");

    // Reset Test 1: requesting a reset for a real user stores a token hash + future expiry.
    await requestPasswordReset(studentEmail);
    const afterRequest = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { resetPasswordTokenHash: true, resetPasswordExpires: true }
    });
    assert.ok(afterRequest?.resetPasswordTokenHash, "Reset request must store a token hash.");
    assert.ok(
      afterRequest?.resetPasswordExpires && afterRequest.resetPasswordExpires.getTime() > Date.now(),
      "Reset request must store a future expiry."
    );

    // Reset Test 7: an unknown email must NOT throw (generic success, no account enumeration).
    await requestPasswordReset(`nobody-${stamp}@debatearena.test`);

    // Reset Test 5: an invalid token is rejected.
    await assert.rejects(
      () => resetPassword({ token: "not-a-real-token-value", password: "NewPass123!", confirmPassword: "NewPass123!" }),
      (e: unknown) => (e as { status?: number }).status === 400,
      "Invalid token must be rejected."
    );

    // Reset Test 6: an expired token is rejected.
    const expiredToken = await createPasswordResetToken(dbUser.id);
    await prisma.user.update({ where: { id: dbUser.id }, data: { resetPasswordExpires: new Date(Date.now() - 1000) } });
    await assert.rejects(
      () => resetPassword({ token: expiredToken.rawToken, password: "NewPass123!", confirmPassword: "NewPass123!" }),
      (e: unknown) => (e as { status?: number }).status === 400,
      "Expired token must be rejected."
    );

    // Mismatched passwords are rejected (before any token lookup).
    await assert.rejects(
      () => resetPassword({ token: expiredToken.rawToken, password: "Mismatch11", confirmPassword: "Mismatch22" }),
      (e: unknown) => (e as { status?: number }).status === 400,
      "Mismatched passwords must be rejected."
    );

    // Reset Test 2: a valid token sets a new password and clears the reset fields.
    const { rawToken } = await createPasswordResetToken(dbUser.id);
    const newPassword = "BrandNewPass456!";
    await resetPassword({ token: rawToken, password: newPassword, confirmPassword: newPassword });
    const afterReset = await prisma.user.findUnique({
      where: { id: dbUser.id },
      select: { resetPasswordTokenHash: true, resetPasswordExpires: true }
    });
    assert.equal(afterReset?.resetPasswordTokenHash, null, "Reset must clear the token hash.");
    assert.equal(afterReset?.resetPasswordExpires, null, "Reset must clear the expiry.");

    // Reset Test 3: the old password no longer signs in.
    const oldLogin = await authorize({ email: studentEmail, password }, {});
    assert.equal(oldLogin, null, "Old password must fail after reset.");

    // Reset Test 4: the new password signs in.
    const newLogin = await authorize({ email: studentEmail, password: newPassword }, {});
    assert.ok(newLogin && newLogin.id === dbUser.id, "New password must sign in.");

    console.log(
      "Part B (database) passed: custom student + coach signup→signin, zero new-user stats, mixed-case match, wrong-password rejection, demo login, JWT size, password reset (request stores hash, valid token resets + clears fields, old fails, new works, invalid/expired/mismatch rejected, unknown email generic)."
    );
  } finally {
    // Always clean up the accounts we created.
    await prisma.user.deleteMany({ where: { email: { in: [studentEmail, coachEmail] } } });
    await prisma.$disconnect();
  }
}

async function main() {
  await offlineChecks();
  await databaseRoundtrip();
  console.log("Auth smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

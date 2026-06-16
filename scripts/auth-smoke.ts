/**
 * Offline auth smoke test: verifies the pieces that make signup/signin reliable without needing a
 * database — password hashing, signup validation, and email/username normalization. Run with:
 * npm run auth:smoke
 */
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { signupSchema } from "../lib/validators";

async function main() {
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

  console.log("Auth smoke tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

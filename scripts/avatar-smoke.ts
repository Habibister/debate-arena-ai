/**
 * Avatar upload smoke test (deterministic — no network, no file writes, no session).
 *
 * Forces production mode with no UploadThing token so the route's "not configured" path is exercised
 * and no local files are written. Tests the real upload logic in lib/avatar.ts. Run with:
 * npm run avatar:smoke
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

function loadEnv(file: string) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n]*)"?\s*$/);
      if (match && process.env[match[1]] === undefined) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // ignore
  }
}
loadEnv(".env.local");
loadEnv(".env");

// Force "not configured in production" so the test never writes a local file or hits the network.
(process.env as Record<string, string | undefined>).NODE_ENV = "production";
delete process.env.UPLOADTHING_TOKEN;

async function main() {
  const { processAvatarUpload, avatarUploadEnabled } = await import("@/lib/avatar");

  // Test (Problem 1): without a token in production, uploads are reported disabled.
  assert.equal(avatarUploadEnabled(), false, "Production without a token must report uploads disabled.");

  // No file -> 400.
  const noFile = await processAvatarUpload(null);
  assert.equal(noFile.ok, false);
  assert.equal((noFile as { status: number }).status, 400, "Missing file must be 400.");

  // Test 5 — non-image file -> 415 with the friendly message.
  const text = await processAvatarUpload(new File(["hello"], "note.txt", { type: "text/plain" }));
  assert.equal(text.ok, false);
  assert.equal((text as { status: number }).status, 415, "Non-image must be 415.");
  assert.equal((text as { error: string }).error, "Image must be JPG, PNG, or WebP.", "Non-image error copy.");

  // Test 4 — over 2MB -> 413 (size checked before content).
  const big = new File([new Uint8Array(2 * 1024 * 1024 + 1024)], "big.png", { type: "image/png" });
  const bigResult = await processAvatarUpload(big);
  assert.equal((bigResult as { status: number }).status, 413, "Over-2MB must be 413.");
  assert.equal((bigResult as { error: string }).error, "Image must be under 2MB.", "Over-size error copy.");

  // Spoofed image (right MIME, not actually an image) -> 415.
  const spoof = await processAvatarUpload(new File([new Uint8Array(64)], "fake.png", { type: "image/png" }));
  assert.equal((spoof as { status: number }).status, 415, "Spoofed image must be rejected.");

  // Test 2/3 path with graceful degradation: a real PNG, but no storage configured -> 503, no crash.
  const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], "ok.png", {
    type: "image/png"
  });
  const valid = await processAvatarUpload(png);
  assert.equal((valid as { status: number }).status, 503, "Valid image without storage must be 503, not a crash.");
  assert.match((valid as { error: string }).error, /not configured yet/i, "Not-configured message must be shown.");

  // Test 10 — Gemini/AI health route still present and untouched.
  assert.ok(existsSync("app/api/ai/health/route.ts"), "AI health route must still exist.");

  console.log("Avatar smoke tests passed: enabled flag, 400 no-file, 415 non-image, 413 over-2MB, 415 spoof, 503 not-configured (graceful), AI health untouched.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

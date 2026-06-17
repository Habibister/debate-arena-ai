import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { UTApi } from "uploadthing/server";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

// Read env at call time (not module load) so behavior is testable and matches the current runtime.
function isUploadConfigured() {
  return Boolean(process.env.UPLOADTHING_TOKEN);
}
function isProduction() {
  return process.env.NODE_ENV === "production";
}

// Whether the client should offer upload at all. In local dev we allow the filesystem fallback; in
// production we only allow it when an UploadThing token is present (Vercel's FS is read-only).
export function avatarUploadEnabled() {
  return isUploadConfigured() || !isProduction();
}

// Confirm the bytes really are an image of an allowed type, so a renamed/spoofed file is rejected
// even if its declared content-type lies.
function detectImageType(buffer: Buffer): keyof typeof ALLOWED | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (buffer.length >= 8 && buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export type AvatarUploadResult =
  | { ok: true; avatarUrl: string }
  | { ok: false; status: number; error: string };

// Validates and stores an uploaded avatar, returning ONLY a URL (never image bytes/base64). No
// session handling here so it is unit-testable. UploadThing in production; local FS only in dev.
export async function processAvatarUpload(file: unknown, ownerId?: string | null): Promise<AvatarUploadResult> {
  if (!(file instanceof File)) {
    return { ok: false, status: 400, error: "Choose an image to upload." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, status: 413, error: "Image must be under 2MB." };
  }
  if (!(file.type in ALLOWED)) {
    return { ok: false, status: 415, error: "Image must be JPG, PNG, or WebP." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    return { ok: false, status: 413, error: "Image must be under 2MB." };
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    return { ok: false, status: 415, error: "Image must be JPG, PNG, or WebP." };
  }

  const owner = ownerId ? ownerId.replace(/[^a-zA-Z0-9_-]/g, "") : "new";
  const filename = `${owner}-${randomUUID()}.${ALLOWED[detected]}`;

  if (isUploadConfigured()) {
    // Re-wrap the validated bytes so UploadThing stores a clean filename and verified content-type.
    const utapi = new UTApi();
    const upload = await utapi.uploadFiles(new File([buffer], filename, { type: detected }));
    if (upload.error || !upload.data) {
      console.error("[avatar-upload] uploadthing", upload.error);
      return { ok: false, status: 502, error: "Upload failed. Please try a different image." };
    }
    // ufsUrl is the current field; url is the deprecated alias kept for older SDKs.
    return { ok: true, avatarUrl: upload.data.ufsUrl ?? upload.data.url };
  }

  if (isProduction()) {
    // No storage backend wired up in production — fail gracefully; profile photos are optional.
    return {
      ok: false,
      status: 503,
      error: "Profile photo upload is not configured yet. You can finish without a photo and add one later."
    };
  }

  // Local development fallback only (never used on Vercel's read-only filesystem).
  const directory = path.join(process.cwd(), "public", "uploads", "avatars");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), buffer);
  return { ok: true, avatarUrl: `/uploads/avatars/${filename}` };
}

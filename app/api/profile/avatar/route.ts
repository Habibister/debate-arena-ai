import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { UTApi } from "uploadthing/server";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

// UploadThing is the production storage backend (Vercel's filesystem is read-only / ephemeral).
// When UPLOADTHING_TOKEN is set we upload there and store only the returned URL. Locally, without a
// token, we fall back to writing under public/uploads so development still works.
const uploadConfigured = Boolean(process.env.UPLOADTHING_TOKEN);
const isProduction = process.env.NODE_ENV === "production";

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

// Lets the client proactively show a graceful "not configured" message before a user tries to upload.
export async function GET() {
  return NextResponse.json({ enabled: uploadConfigured || !isProduction });
}

export async function POST(request: Request) {
  try {
    // Session is optional: profile edits are authenticated, but signup uploads happen before an
    // account exists. Either way we only ever return a short URL, never image data.
    const session = await getServerSession(authOptions);

    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 2MB." }, { status: 413 });
    }

    if (!(file.type in ALLOWED)) {
      return NextResponse.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 415 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 2MB." }, { status: 413 });
    }

    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json({ error: "That file is not a valid image." }, { status: 415 });
    }

    const owner = session?.user?.id ? session.user.id.replace(/[^a-zA-Z0-9_-]/g, "") : "new";
    const filename = `${owner}-${randomUUID()}.${ALLOWED[detected]}`;

    if (uploadConfigured) {
      // Re-wrap the validated bytes so UploadThing stores a clean filename and verified content-type.
      const utapi = new UTApi();
      const upload = await utapi.uploadFiles(new File([buffer], filename, { type: detected }));
      if (upload.error || !upload.data) {
        console.error("[avatar-upload] uploadthing", upload.error);
        return NextResponse.json({ error: "We could not upload that image. Please try again." }, { status: 502 });
      }
      // ufsUrl is the current field; url is the deprecated alias kept for older SDKs.
      const hostedUrl = upload.data.ufsUrl ?? upload.data.url;
      return NextResponse.json({ avatarUrl: hostedUrl }, { status: 201 });
    }

    if (isProduction) {
      // No storage backend wired up in production — fail gracefully; profile photos are optional.
      return NextResponse.json(
        { error: "Profile photo upload is not configured yet. You can finish without a photo and add one later." },
        { status: 503 }
      );
    }

    // Local development fallback only.
    const directory = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), buffer);

    return NextResponse.json({ avatarUrl: `/uploads/avatars/${filename}` }, { status: 201 });
  } catch (error) {
    console.error("[avatar-upload]", error);
    return NextResponse.json({ error: "We could not upload that image. Please try again." }, { status: 500 });
  }
}

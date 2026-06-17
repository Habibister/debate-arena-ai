import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { avatarUploadEnabled, processAvatarUpload } from "@/lib/avatar";

export const runtime = "nodejs";

// Lets the client proactively show a graceful "not configured" message before a user tries to upload.
export async function GET() {
  return NextResponse.json({ enabled: avatarUploadEnabled() });
}

export async function POST(request: Request) {
  try {
    // Session is optional: profile edits are authenticated, but signup uploads happen before an
    // account exists. Either way we only ever return a short URL, never image data.
    const session = await getServerSession(authOptions);
    const formData = await request.formData().catch(() => null);

    const result = await processAvatarUpload(formData?.get("file"), session?.user?.id ?? null);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ avatarUrl: result.avatarUrl }, { status: 201 });
  } catch (error) {
    console.error("[avatar-upload]", error);
    return NextResponse.json({ error: "Upload failed. Please try a different image." }, { status: 500 });
  }
}

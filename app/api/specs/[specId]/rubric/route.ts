import { NextResponse } from "next/server";
import { HttpError, apiError } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { getSpecRubricBreakdown } from "@/lib/competition-specs";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// A spec's rubric as structured data: categories, point values, descriptors, and per-category
// sourced-vs-placeholder provenance. Signed-in users only (same policy as the rest of the registry).
export async function GET(_request: Request, { params }: { params: { specId: string } }) {
  try {
    await requireUser();
    const spec = await prisma.competitionSpec.findUnique({ where: { id: params.specId } });
    if (!spec) {
      throw new HttpError("Specification not found", 404);
    }
    const breakdown = await getSpecRubricBreakdown(spec);
    return NextResponse.json(breakdown);
  } catch (error) {
    return apiError(error);
  }
}

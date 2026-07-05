import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { HttpError, apiError, forbidden, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { competitionSpecUpdateSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: { specId: string } }) {
  try {
    await requireUser();
    const spec = await prisma.competitionSpec.findUnique({ where: { id: params.specId } });
    if (!spec) {
      throw new HttpError("Specification not found", 404);
    }
    return NextResponse.json(spec);
  } catch (error) {
    return apiError(error);
  }
}

// Update a spec version. Admin-only: the registry is ground truth for scoring and simulation.
export async function PATCH(request: Request, { params }: { params: { specId: string } }) {
  try {
    const user = await requireUser();
    if (!isAdmin(user.role)) {
      return forbidden("Only admins can modify competition specifications.");
    }

    const input = await parseJson(request, competitionSpecUpdateSchema);
    const jsonFields = [
      "roundStructure",
      "prepTime",
      "rubric",
      "penalties",
      "requiredUploads",
      "aiAssistanceRestrictions",
      "stateVariations",
      "officialReferences",
      "fieldNotes"
    ] as const;
    const data: Record<string, unknown> = { ...input };
    for (const field of jsonFields) {
      if (field in data && data[field] !== undefined) {
        data[field] = data[field] as Prisma.InputJsonValue;
      }
    }

    const spec = await prisma.competitionSpec.update({
      where: { id: params.specId },
      data: data as Prisma.CompetitionSpecUpdateInput
    });
    return NextResponse.json(spec);
  } catch (error) {
    return apiError(error);
  }
}

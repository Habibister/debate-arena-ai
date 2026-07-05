import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { apiError, forbidden, parseJson } from "@/lib/api";
import { requireUser } from "@/lib/api-auth";
import { getActiveSpecs } from "@/lib/competition-specs";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/roles";
import { competitionSpecCreateSchema, organizationSchema } from "@/lib/validators";

export const runtime = "nodejs";

// List active competition specs, optionally filtered by organization. Signed-in users only.
export async function GET(request: Request) {
  try {
    await requireUser();
    const orgParam = new URL(request.url).searchParams.get("organization");
    const organization = orgParam ? organizationSchema.parse(orgParam) : undefined;
    const specs = await getActiveSpecs(organization);
    return NextResponse.json({ specs });
  } catch (error) {
    return apiError(error);
  }
}

// Create a spec version. Admin-only: the registry is ground truth for scoring and simulation.
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (!isAdmin(user.role)) {
      return forbidden("Only admins can modify competition specifications.");
    }

    const input = await parseJson(request, competitionSpecCreateSchema);
    const spec = await prisma.competitionSpec.create({
      data: {
        ...input,
        roundStructure: input.roundStructure as Prisma.InputJsonValue,
        prepTime: input.prepTime as Prisma.InputJsonValue,
        rubric: input.rubric as Prisma.InputJsonValue,
        penalties: input.penalties as Prisma.InputJsonValue,
        requiredUploads: input.requiredUploads as Prisma.InputJsonValue,
        aiAssistanceRestrictions: input.aiAssistanceRestrictions as Prisma.InputJsonValue,
        stateVariations: input.stateVariations as Prisma.InputJsonValue,
        officialReferences: input.officialReferences as unknown as Prisma.InputJsonValue,
        fieldNotes: input.fieldNotes as Prisma.InputJsonValue
      }
    });
    return NextResponse.json(spec, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

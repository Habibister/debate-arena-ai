import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { DebateArena } from "@/components/debate/debate-arena";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DebateArenaPage({ params }: { params: { debateId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/signin");
  }

  const debate = await prisma.debate.findFirst({
    where: {
      id: params.debateId,
      OR: [{ createdById: session.user.id }, { studentId: session.user.id }, { opponentUserId: session.user.id }]
    },
    include: {
      messages: {
        orderBy: [{ round: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!debate) {
    notFound();
  }

  return (
    <DebateArena
      initialDebate={{
        id: debate.id,
        organization: debate.organization,
        eventType: debate.eventType,
        practiceMode: debate.practiceMode,
        format: debate.format,
        mode: debate.mode,
        level: debate.level,
        topic: debate.topic,
        status: debate.status,
        roundsMinimum: debate.roundsMinimum,
        studentSide: debate.studentSide,
        opponentSide: debate.opponentSide,
        turnTimeSeconds: debate.turnTimeSeconds,
        prepTimeSeconds: debate.prepTimeSeconds,
        graceTimeSeconds: debate.graceTimeSeconds,
        formatConfig: debate.formatConfig,
        overallScore: debate.overallScore
      }}
      initialMessages={debate.messages.map((message) => ({
        id: message.id,
        authorId: message.authorId,
        role: message.role,
        round: message.round,
        content: message.content,
        createdAt: message.createdAt.toISOString()
      }))}
      initialJudgeReport={debate.judgeReport}
    />
  );
}

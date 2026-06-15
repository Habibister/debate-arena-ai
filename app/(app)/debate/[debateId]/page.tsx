import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { DebateArena } from "@/components/debate/debate-arena";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DebateArenaPage({ params }: { params: { debateId: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/signin?callbackUrl=/debate/${params.debateId}`);
  }

  const debate = await prisma.debate.findFirst({
    where: {
      id: params.debateId,
      OR: [{ createdById: session.user.id }, { studentId: session.user.id }, { opponentUserId: session.user.id }]
    },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          image: true,
          level: true,
          xp: true,
          wins: true,
          preferredOrganization: true,
          organization: true
        }
      },
      opponentUser: {
        select: {
          id: true,
          name: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          image: true,
          level: true,
          xp: true,
          wins: true,
          preferredOrganization: true,
          organization: true
        }
      },
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
        aiPersona: debate.aiPersona,
        overallScore: debate.overallScore
      }}
      studentProfile={
        debate.student
          ? {
              id: debate.student.id,
              username: debate.student.username,
              displayName: debate.student.displayName ?? debate.student.name,
              avatarUrl: debate.student.avatarUrl ?? debate.student.image,
              level: debate.student.level,
              organization: debate.student.preferredOrganization ?? debate.student.organization,
              xp: debate.student.xp,
              wins: debate.student.wins,
              judgedDebates: 0
            }
          : null
      }
      opponentProfile={
        debate.opponentUser
          ? {
              id: debate.opponentUser.id,
              username: debate.opponentUser.username,
              displayName: debate.opponentUser.displayName ?? debate.opponentUser.name,
              avatarUrl: debate.opponentUser.avatarUrl ?? debate.opponentUser.image,
              level: debate.opponentUser.level,
              organization: debate.opponentUser.preferredOrganization ?? debate.opponentUser.organization,
              xp: debate.opponentUser.xp,
              wins: debate.opponentUser.wins,
              judgedDebates: 0
            }
          : null
      }
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

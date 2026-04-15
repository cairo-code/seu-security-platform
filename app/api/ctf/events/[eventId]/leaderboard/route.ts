import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { assertEventAccess } from '@/lib/ctf/access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { eventId } = await params;
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'individual';

    await assertEventAccess(eventId, auth.sub, auth.role, true);

    if (scope === 'individual') {
      const rankings = await prisma.$queryRaw<Array<{
        rank: number;
        userId: string;
        name: string;
        universityId: string;
        score: number;
        solvedCount: number;
      }>>`
        SELECT
          ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.points), 0) DESC) AS rank,
          u.id AS "userId",
          u.name,
          u."universityId",
          COALESCE(SUM(c.points), 0)::int AS score,
          COUNT(s.id)::int AS "solvedCount"
        FROM "User" u
        LEFT JOIN "Submission" s ON s."userId" = u.id AND s."isCorrect" = true
        LEFT JOIN "CTFEventChallenge" ec ON ec."challengeId" = s."challengeId"
        LEFT JOIN "Challenge" c ON c.id = s."challengeId"
        WHERE ec."eventId" = ${eventId}
        GROUP BY u.id, u.name, u."universityId"
        HAVING COUNT(s.id) > 0
        ORDER BY score DESC, "solvedCount" DESC
      `;

      const userRank = rankings.find(r => r.userId === auth.sub);
      const userRankNum = userRank ? userRank.rank : null;

      return NextResponse.json({
        rankings: rankings.map(r => ({
          rank: Number(r.rank),
          userId: r.userId,
          name: r.name,
          universityId: r.universityId,
          score: Number(r.score),
          solvedCount: Number(r.solvedCount),
        })),
        userRank: userRankNum,
      });
    }

    const teamRankings = await prisma.$queryRaw<Array<{
      rank: number;
      teamId: string;
      teamName: string;
      memberCount: number;
      score: number;
      solvedCount: number;
    }>>`
      SELECT
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(c.points), 0) DESC) AS rank,
        t.id AS "teamId",
        t.name AS "teamName",
        COUNT(DISTINCT tm."userId")::int AS "memberCount",
        COALESCE(SUM(c.points), 0)::int AS score,
        COUNT(DISTINCT s."challengeId")::int AS "solvedCount"
      FROM "CTFTeam" t
      JOIN "CTFTeamMember" tm ON tm."teamId" = t.id
      LEFT JOIN "Submission" s ON s."userId" = tm."userId" AND s."isCorrect" = true
      LEFT JOIN "CTFEventChallenge" ec ON ec."challengeId" = s."challengeId"
      LEFT JOIN "Challenge" c ON c.id = s."challengeId"
      WHERE t."eventId" = ${eventId}
      GROUP BY t.id, t.name
      HAVING COUNT(s.id) > 0
      ORDER BY score DESC, "solvedCount" DESC
    `;

    const userTeam = await prisma.cTFTeamMember.findFirst({
      where: {
        userId: auth.sub,
        team: { eventId },
      },
      include: { team: { select: { id: true } } },
    });

    const userTeamRank = userTeam
      ? teamRankings.find(r => r.teamId === userTeam.team.id)
      : null;
    const userRankNum = userTeamRank ? userTeamRank.rank : null;

    return NextResponse.json({
      rankings: teamRankings.map(r => ({
        rank: Number(r.rank),
        teamId: r.teamId,
        teamName: r.teamName,
        memberCount: Number(r.memberCount),
        score: Number(r.score),
        solvedCount: Number(r.solvedCount),
      })),
      userRank: userRankNum,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
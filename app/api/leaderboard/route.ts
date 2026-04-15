import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const scope = url.searchParams.get('scope') || 'global';
    const groupId = url.searchParams.get('groupId');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
    const page = parseInt(url.searchParams.get('page') || '1', 10);

    if (scope === 'group' && !groupId) {
      return NextResponse.json({ error: 'groupId is required for group scope' }, { status: 400 });
    }

    if (scope === 'group' && groupId) {
      const membership = await prisma.groupMember.findFirst({
        where: {
          groupId,
          userId: user.sub,
        },
      });

      if (!membership) {
        return NextResponse.json({ error: 'Not a member of this group' }, { status: 403 });
      }
    }

    const skip = (page - 1) * limit;

    let leaderboard: Array<{
      userId: string;
      name: string;
      universityId: string;
      points: number;
      completedChallenges: bigint;
      rank: bigint;
    }>;
    let total: number;
    let callerRank = 0;

    if (scope === 'global') {
      leaderboard = await prisma.$queryRaw`
        SELECT
          u.id as "userId",
          u.name,
          u."universityId",
          u.points,
          COUNT(ucp.id) as "completedChallenges",
          ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
        FROM "User" u
        LEFT JOIN "UserChallengeProgress" ucp ON u.id = ucp."userId" AND ucp.status = 'COMPLETED'
        GROUP BY u.id, u.name, u."universityId", u.points
        ORDER BY u.points DESC
        LIMIT ${limit} OFFSET ${skip}
      ` as typeof leaderboard;

      const totalResult = await prisma.$queryRaw`
        SELECT COUNT(*) as total FROM "User"
      ` as Array<{ total: bigint }>;
      total = Number(totalResult[0].total);

      const callerRankResult = await prisma.$queryRaw`
        SELECT rank FROM (
          SELECT id as "userId", ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM "User"
        ) sub WHERE "userId" = ${user.sub}
      ` as Array<{ rank: bigint }>;
      callerRank = callerRankResult.length > 0 ? Number(callerRankResult[0].rank) : 0;
    } else if (groupId) {
      leaderboard = await prisma.$queryRaw`
        SELECT
          u.id as "userId",
          u.name,
          u."universityId",
          u.points,
          COUNT(ucp.id) as "completedChallenges",
          ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
        FROM "User" u
        INNER JOIN "GroupMember" gm ON u.id = gm."userId"
        LEFT JOIN "UserChallengeProgress" ucp ON u.id = ucp."userId" AND ucp.status = 'COMPLETED'
        WHERE gm."groupId" = ${groupId}
        GROUP BY u.id, u.name, u."universityId", u.points
        ORDER BY u.points DESC
        LIMIT ${limit} OFFSET ${skip}
      ` as typeof leaderboard;

      const totalResult = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT u.id) as total
        FROM "User" u
        INNER JOIN "GroupMember" gm ON u.id = gm."userId"
        WHERE gm."groupId" = ${groupId}
      ` as Array<{ total: bigint }>;
      total = Number(totalResult[0].total);

      const callerRankResult = await prisma.$queryRaw`
        SELECT rank FROM (
          SELECT u.id as "userId", ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
          FROM "User" u
          INNER JOIN "GroupMember" gm ON u.id = gm."userId"
          WHERE gm."groupId" = ${groupId}
        ) sub WHERE "userId" = ${user.sub}
      ` as Array<{ rank: bigint }>;
      callerRank = callerRankResult.length > 0 ? Number(callerRankResult[0].rank) : 0;
    } else {
      return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
    }

    return NextResponse.json({
      leaderboard: leaderboard.map((entry) => ({
        rank: Number(entry.rank),
        userId: entry.userId,
        name: entry.name,
        universityId: entry.universityId,
        points: entry.points,
        completedChallenges: Number(entry.completedChallenges),
      })),
      total,
      page,
      callerRank,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
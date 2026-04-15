import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);

    const events = await prisma.cTFEvent.findMany({
      include: {
        ctfEventChallenges: {
          select: { challengeId: true },
        },
        teams: {
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return NextResponse.json({
      events: events.map(e => ({
        id: e.id,
        title: e.title,
        description: e.description,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt.toISOString(),
        isPublished: e.isPublished,
        createdAt: e.createdAt.toISOString(),
        challengeCount: e.ctfEventChallenges.length,
        teamCount: e.teams.length,
        status:
          e.endsAt < now ? 'ENDED' : e.startsAt > now ? 'UPCOMING' : 'ACTIVE',
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
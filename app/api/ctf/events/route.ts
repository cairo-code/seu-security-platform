import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);

    const now = new Date();

    const events = await prisma.cTFEvent.findMany({
      where: {
        OR: [
          { isPublished: true },
          { createdById: auth.sub },
        ],
      },
      include: {
        _count: {
          select: {
            challenges: true,
            teams: true,
          },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    const upcoming: typeof events = [];
    const active: typeof events = [];
    const ended: typeof events = [];

    for (const event of events) {
      if (event.endsAt < now) {
        ended.push(event);
      } else if (event.startsAt > now) {
        upcoming.push(event);
      } else {
        active.push(event);
      }
    }

    const formatEvent = (e: (typeof events)[number]) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt.toISOString(),
      isPublished: e.isPublished,
      _count: {
        challenges: e._count.challenges,
        teams: e._count.teams,
      },
    });

    return NextResponse.json({
      upcoming: upcoming.map(formatEvent),
      active: active.map(formatEvent),
      ended: ended.map(formatEvent),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireRole('ADMIN', 'TEACHER')(req);
    const body = await req.json();

    const { title, description, startsAt, endsAt } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const startDate = new Date(startsAt);
    const endDate = new Date(endsAt);
    const now = new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'endsAt must be after startsAt' }, { status: 400 });
    }

    if (startDate <= now || endDate <= now) {
      return NextResponse.json({ error: 'Dates must be in the future' }, { status: 400 });
    }

    const event = await prisma.cTFEvent.create({
      data: {
        title: title.trim(),
        description: description || '',
        startsAt: startDate,
        endsAt: endDate,
        createdById: auth.sub,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
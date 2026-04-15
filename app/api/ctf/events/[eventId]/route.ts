import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { assertEventAccess, getTeamForUser } from '@/lib/ctf/access';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { eventId } = await params;

    const skipTimeCheck = auth.role === 'ADMIN' || auth.role === 'TEACHER';
    await assertEventAccess(eventId, auth.sub, auth.role, skipTimeCheck);

    const event = await prisma.cTFEvent.findUnique({
      where: { id: eventId },
      include: {
        ctfEventChallenges: {
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                type: true,
                difficulty: true,
                points: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const userTeam = await getTeamForUser(eventId, auth.sub);

    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      isPublished: event.isPublished,
      challenges: event.ctfEventChallenges.map(ec => ({
        id: ec.challenge.id,
        title: ec.challenge.title,
        type: ec.challenge.type,
        difficulty: ec.challenge.difficulty,
        points: ec.challenge.points,
      })),
      userTeam,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireRole('ADMIN', 'TEACHER')(req);
    const { eventId } = await params;

    const existing = await prisma.cTFEvent.findUnique({
      where: { id: eventId },
      select: { startsAt: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, startsAt, endsAt, isPublished } = body;

    const updateData: Record<string, unknown> = {};

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title must not be empty' }, { status: 400 });
      }
      updateData.title = title.trim();
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (isPublished !== undefined) {
      if (typeof isPublished !== 'boolean') {
        return NextResponse.json({ error: 'isPublished must be boolean' }, { status: 400 });
      }
      updateData.isPublished = isPublished;
    }

    if (startsAt !== undefined || endsAt !== undefined) {
      const now = new Date();
      if (existing.startsAt <= now) {
        return NextResponse.json(
          { error: 'Cannot edit startsAt of a running event' },
          { status: 400 }
        );
      }

      if (startsAt) {
        const startDate = new Date(startsAt);
        if (isNaN(startDate.getTime())) {
          return NextResponse.json({ error: 'Invalid startsAt date' }, { status: 400 });
        }
        updateData.startsAt = startDate;
      }

      if (endsAt) {
        const endDate = new Date(endsAt);
        if (isNaN(endDate.getTime())) {
          return NextResponse.json({ error: 'Invalid endsAt date' }, { status: 400 });
        }
        updateData.endsAt = endDate;
      }

      if (startsAt && endsAt) {
        const startDate = new Date(startsAt);
        const endDate = new Date(endsAt);
        if (endDate <= startDate) {
          return NextResponse.json(
            { error: 'endsAt must be after startsAt' },
            { status: 400 }
          );
        }
      }
    }

    const event = await prisma.cTFEvent.update({
      where: { id: eventId },
      data: updateData,
    });

    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      isPublished: event.isPublished,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
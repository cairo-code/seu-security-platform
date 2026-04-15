import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { ChallengeType } from '@prisma/client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { eventId } = await params;
    const body = await req.json();

    const { challengeId } = body;

    if (!challengeId || typeof challengeId !== 'string') {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const event = await prisma.cTFEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, isPublished: true, type: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (!challenge.isPublished) {
      return NextResponse.json({ error: 'Challenge is not published' }, { status: 400 });
    }

    if (challenge.type !== ChallengeType.CTF) {
      return NextResponse.json({ error: 'Challenge must be of type CTF' }, { status: 400 });
    }

    await prisma.cTFEventChallenge.upsert({
      where: {
        eventId_challengeId: {
          eventId,
          challengeId,
        },
      },
      create: {
        eventId,
        challengeId,
      },
      update: {},
    });

    return NextResponse.json({ added: true }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { eventId } = await params;
    const body = await req.json();

    const { challengeId } = body;

    if (!challengeId || typeof challengeId !== 'string') {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const event = await prisma.cTFEvent.findUnique({
      where: { id: eventId },
      select: { startsAt: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date();
    if (event.startsAt <= now) {
      return NextResponse.json(
        { error: 'Cannot remove challenges from an active event' },
        { status: 400 }
      );
    }

    await prisma.cTFEventChallenge.delete({
      where: {
        eventId_challengeId: {
          eventId,
          challengeId,
        },
      },
    });

    return NextResponse.json({ removed: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
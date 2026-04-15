import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { assertEventAccess } from '@/lib/ctf/access';
import { verifyFlag } from '@/lib/flags/index';
import { verifyStaticChallenge } from '@/lib/flags/staticChallenge';
import { awardPoints } from '@/lib/gamification/points';
import { withRateLimit } from '@/lib/rateLimit/withRateLimit';

async function handleSubmit(
  req: NextRequest,
  body: unknown,
  auth: { sub: string; role: unknown; universityId: string }
): Promise<Response> {
  const { challengeId, answer } = body as { challengeId: string; answer: string };
  const eventId = req.url.split('/ctf/events/')[1]?.split('/')[0];

  if (!eventId) {
    return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 });
  }

  await assertEventAccess(eventId, auth.sub, auth.role as null, false);

  const eventChallenge = await prisma.cTFEventChallenge.findUnique({
    where: {
      eventId_challengeId: {
        eventId,
        challengeId,
      },
    },
    select: { challengeId: true },
  });

  if (!eventChallenge) {
    return NextResponse.json({ error: 'Challenge not part of this event' }, { status: 404 });
  }

  const existingCorrect = await prisma.submission.findFirst({
    where: {
      userId: auth.sub,
      challengeId,
      isCorrect: true,
    },
  });

  if (existingCorrect) {
    return NextResponse.json({ error: 'Already solved' }, { status: 400 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { points: true, type: true, dockerImage: true, templateConfig: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  let isCorrect: boolean;
  if (challenge.dockerImage) {
    isCorrect = verifyFlag(auth.sub, challengeId, answer);
  } else {
    isCorrect = await verifyStaticChallenge(auth.sub, challengeId, answer);
  }

  const result = await prisma.$transaction(async tx => {
    const submission = await tx.submission.create({
      data: {
        userId: auth.sub,
        challengeId,
        answer,
        isCorrect,
      },
    });

    let pointsAwarded = 0;
    if (isCorrect) {
      await awardPoints(auth.sub, challenge.points, tx);
      pointsAwarded = challenge.points;
    }

    return { submission, pointsAwarded };
  });

  return NextResponse.json({
    correct: isCorrect,
    points: isCorrect ? result.pointsAwarded : undefined,
  });
}

export const POST = withRateLimit(handleSubmit);
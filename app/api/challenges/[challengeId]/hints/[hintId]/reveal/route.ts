import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { deductPoints, InsufficientPointsError } from '@/lib/gamification/points';

interface ChallengeParams {
  params: Promise<{ challengeId: string; hintId: string }>;
}

export async function POST(req: NextRequest, { params }: ChallengeParams) {
  try {
    const user = await requireAuth(req);
    const { challengeId, hintId } = await params;

    const hint = await prisma.hint.findUnique({
      where: { id: hintId },
      include: {
        task: {
          select: {
            id: true,
            challengeId: true,
          },
        },
      },
    });

    if (!hint) {
      return NextResponse.json({ error: 'Hint not found' }, { status: 404 });
    }

    if (hint.task.challengeId !== challengeId) {
      return NextResponse.json({ error: 'Hint does not belong to this challenge' }, { status: 400 });
    }

    const existingReveal = await prisma.submission.findFirst({
      where: {
        userId: user.sub,
        taskId: hintId,
        answer: 'HINT_REVEALED',
      },
    });

    if (existingReveal) {
      return NextResponse.json({
        content: hint.content,
        alreadyRevealed: true,
      });
    }

    try {
      await prisma.$transaction(async (tx) => {
        await deductPoints(user.sub, hint.pointCost, tx);
        await tx.submission.create({
          data: {
            userId: user.sub,
            challengeId,
            taskId: hintId,
            answer: 'HINT_REVEALED',
            isCorrect: false,
          },
        });
      });
    } catch (e) {
      if (e instanceof InsufficientPointsError) {
        return NextResponse.json(
          { error: 'Not enough points', required: hint.pointCost },
          { status: 400 }
        );
      }
      throw e;
    }

    return NextResponse.json({
      content: hint.content,
      alreadyRevealed: false,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
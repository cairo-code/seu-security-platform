import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/rateLimit/withRateLimit';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { verifyFlag, verifyStaticChallenge } from '@/lib/flags';
import { prisma, PrismaTransactionClient } from '@/lib/prisma';
import { ProgressStatus, Task } from '@prisma/client';
import crypto from 'crypto';

type TaskWithAnswer = Task & { answer: string | null };

async function handleSubmit(
  req: NextRequest,
  body: unknown,
  auth: { sub: string; role: unknown; universityId: string }
): Promise<NextResponse> {
  const { challengeId } = req.nextUrl.pathname.match(/challenges\/([^/]+)/)?.groups as { challengeId: string } ?? { challengeId: '' };
  const { answer, taskId } = body as { answer?: string; taskId?: string };

  if (!answer) {
    return NextResponse.json({ error: 'Answer required' }, { status: 400 });
  }

  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: { tasks: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  if (!challenge.isPublished) {
    return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
  }

  const userId = auth.sub;

  if (challenge.type === 'BOX' || challenge.type === 'CTF') {
    let isCorrect = false;

    if (challenge.type === 'CTF' && challenge.templateConfig) {
      isCorrect = await verifyStaticChallenge(userId, challengeId, answer);
    } else {
      isCorrect = verifyFlag(userId, challengeId, answer);
    }

    if (!isCorrect) {
      await prisma.submission.create({
        data: { userId, challengeId, answer: answer.substring(0, 200), isCorrect: false },
      });
      return NextResponse.json({ error: 'Incorrect answer' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      const existingSubmission = await tx.submission.findFirst({
        where: { userId, challengeId, isCorrect: true },
      });

      if (existingSubmission) {
        return { alreadySolved: true };
      }

      await tx.submission.create({
        data: { userId, challengeId, answer: answer.substring(0, 200), isCorrect: true },
      });

      await tx.userChallengeProgress.upsert({
        where: { userId_challengeId: { userId, challengeId } },
        update: { status: 'COMPLETED' as ProgressStatus, completedAt: new Date() },
        create: { userId, challengeId, status: 'COMPLETED' as ProgressStatus, completedAt: new Date() },
      });

      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: challenge.points } },
      });

      const pathCompletion = await checkPathCompletion(tx, userId, challengeId);

      return { alreadySolved: false, pathCompleted: pathCompletion };
    });

    if (result.alreadySolved) {
      return NextResponse.json({ message: 'Already solved', pointsAwarded: 0 });
    }

    return NextResponse.json({ success: true, pointsAwarded: challenge.points });
  }

  if (challenge.type === 'ROOM') {
    if (!taskId) {
      return NextResponse.json({ error: 'taskId required for ROOM challenges' }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    }) as TaskWithAnswer | null;

    if (!task || task.challengeId !== challengeId || !task.answer) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const existingTaskSubmission = await prisma.submission.findFirst({
      where: { userId, taskId, isCorrect: true },
    });

    if (existingTaskSubmission) {
      return NextResponse.json({ error: 'Already solved' }, { status: 400 });
    }

    const normalizedAnswer = task.answer.toLowerCase().trim();
    const normalizedSubmitted = answer.toLowerCase().trim();

    const answerBuffer = Buffer.from(normalizedAnswer);
    const submittedBuffer = Buffer.from(normalizedSubmitted);

    let isCorrect = false;
    if (answerBuffer.length === submittedBuffer.length) {
      isCorrect = crypto.timingSafeEqual(answerBuffer, submittedBuffer);
    }

    if (!isCorrect) {
      await prisma.submission.create({
        data: { userId, challengeId, taskId, answer: answer.substring(0, 200), isCorrect: false },
      });
      return NextResponse.json({ error: 'Incorrect answer' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx: PrismaTransactionClient) => {
      await tx.submission.create({
        data: { userId, challengeId, taskId, answer: answer.substring(0, 200), isCorrect: true },
      });

      await tx.user.update({
        where: { id: userId },
        data: { points: { increment: task.points } },
      });

      const completedTaskIds = await tx.submission.findMany({
        where: { userId, challengeId, isCorrect: true, taskId: { not: null } },
        select: { taskId: true },
      });

      const completedTaskIdSet = new Set(completedTaskIds.map((s) => s.taskId));
      const allTaskIds = challenge.tasks.map((t) => t.id);
      const allCompleted = allTaskIds.every((tid) => completedTaskIdSet.has(tid));

      if (allCompleted && challenge.points > 0) {
        await tx.userChallengeProgress.upsert({
          where: { userId_challengeId: { userId, challengeId } },
          update: { status: 'COMPLETED' as ProgressStatus, completedAt: new Date() },
          create: { userId, challengeId, status: 'COMPLETED' as ProgressStatus, completedAt: new Date() },
        });

        await tx.user.update({
          where: { id: userId },
          data: { points: { increment: challenge.points } },
        });
      }

      const pathCompletion = await checkPathCompletion(tx, userId, challengeId);

      return { allCompleted, pathCompleted: pathCompletion };
    });

    const totalPoints = result.allCompleted ? task.points + challenge.points : task.points;
    return NextResponse.json({ success: true, pointsAwarded: task.points, totalChallengePoints: totalPoints });
  }

  return NextResponse.json({ error: 'Invalid challenge type' }, { status: 400 });
}

async function checkPathCompletion(
  tx: import('@/lib/prisma').PrismaTransactionClient,
  userId: string,
  challengeId: string
): Promise<{ completed: boolean; pathId?: string }> {
  const pathSteps = await tx.pathStep.findMany({
    where: { challengeId },
  });

  for (const step of pathSteps) {
    const progress = await tx.userChallengeProgress.findUnique({
      where: { userId_challengeId: { userId, challengeId: step.challengeId } },
    });

    if (!progress || progress.status !== 'COMPLETED') {
      return { completed: false };
    }

    const allPathStepsCompleted = await tx.userChallengeProgress.findMany({
      where: {
        userId,
        challengeId: { in: pathSteps.map((s) => s.challengeId) },
        status: 'COMPLETED',
      },
    });

    if (allPathStepsCompleted.length === pathSteps.length) {
      const existingPathProgress = await tx.userPathProgress.findUnique({
        where: { userId_pathId: { userId, pathId: step.pathId } },
      });

      if (!existingPathProgress || existingPathProgress.status !== 'COMPLETED') {
        await tx.userPathProgress.upsert({
          where: { userId_pathId: { userId, pathId: step.pathId } },
          update: { status: 'COMPLETED', completedAt: new Date() },
          create: { userId, pathId: step.pathId, status: 'COMPLETED', completedAt: new Date() },
        });

        return { completed: true, pathId: step.pathId };
      }
    }
  }

  return { completed: false };
}

export const POST = withRateLimit(handleSubmit);
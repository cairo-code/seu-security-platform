import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { challengeId } = await params;
    const body = await req.json();

    const { question, answer, points, order } = body;

    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!answer || typeof answer !== 'string' || answer.trim().length === 0) {
      return NextResponse.json({ error: 'Answer is required' }, { status: 400 });
    }

    if (!points || typeof points !== 'number' || points <= 0) {
      return NextResponse.json({ error: 'Points must be greater than 0' }, { status: 400 });
    }

    if (order === undefined || order === null || typeof order !== 'number') {
      return NextResponse.json({ error: 'Order is required' }, { status: 400 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const task = await prisma.task.create({
      data: {
        challengeId,
        question: question.trim(),
        answer: answer.trim(),
        points,
        order,
      },
      include: {
        hints: true,
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { challengeId } = await params;
    const body = await req.json();

    const { tasks } = body;

    if (!tasks || !Array.isArray(tasks)) {
      return NextResponse.json({ error: 'tasks array is required' }, { status: 400 });
    }

    await prisma.$transaction(
      tasks.map((item: { id: string; order: number }) =>
        prisma.task.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    const updatedTasks = await prisma.task.findMany({
      where: { challengeId },
      orderBy: { order: 'asc' },
      include: { hints: true },
    });

    return NextResponse.json({ tasks: updatedTasks });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

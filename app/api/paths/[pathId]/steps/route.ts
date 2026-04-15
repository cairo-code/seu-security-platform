import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

interface PathParams {
  params: Promise<{ pathId: string }>;
}

export async function POST(req: NextRequest, { params }: PathParams) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { pathId } = await params;
    let body: { challengeId: string; order: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { challengeId, order } = body;

    if (!challengeId || typeof challengeId !== 'string') {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    if (typeof order !== 'number' || order < 1) {
      return NextResponse.json({ error: 'order must be a positive number' }, { status: 400 });
    }

    const path = await prisma.path.findUnique({
      where: { id: pathId },
    });

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { isPublished: true },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (!challenge.isPublished) {
      return NextResponse.json(
        { error: 'Challenge must be published' },
        { status: 400 }
      );
    }

    try {
      const step = await prisma.pathStep.create({
        data: {
          pathId,
          challengeId,
          order,
        },
      });
      return NextResponse.json(step, { status: 201 });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return NextResponse.json(
          { error: 'Challenge already in path' },
          { status: 409 }
        );
      }
      throw e;
    }
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: PathParams) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { pathId } = await params;
    let body: { challengeId: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { challengeId } = body;

    if (!challengeId || typeof challengeId !== 'string') {
      return NextResponse.json({ error: 'challengeId is required' }, { status: 400 });
    }

    const path = await prisma.path.findUnique({
      where: { id: pathId },
    });

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const existingStep = await prisma.pathStep.findUnique({
      where: {
        pathId_challengeId: {
          pathId,
          challengeId,
        },
      },
    });

    if (!existingStep) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.pathStep.delete({
        where: {
          pathId_challengeId: {
            pathId,
            challengeId,
          },
        },
      });

      const remainingSteps = await tx.pathStep.findMany({
        where: { pathId },
        orderBy: { order: 'asc' },
      });

      for (let i = 0; i < remainingSteps.length; i++) {
        await tx.pathStep.update({
          where: { id: remainingSteps[i].id },
          data: { order: i + 1 },
        });
      }
    });

    return NextResponse.json({ message: 'Step removed' });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
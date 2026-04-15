import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { ChallengeType } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { challengeId } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        tasks: {
          orderBy: { order: 'asc' },
          include: {
            hints: true,
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    return NextResponse.json({ challenge });
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
    const user = await requireRole('ADMIN', 'TEACHER')(req);
    const { challengeId } = await params;
    const body = await req.json();

    const existing = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        tasks: {
          include: {
            hints: true,
          },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    const updatedData: Record<string, unknown> = { ...body };

    if (body.isPublished === true) {
      const dockerImage = body.dockerImage || existing.dockerImage;
      const templateConfig = body.templateConfig || existing.templateConfig;
      const tasks = body.tasks || existing.tasks;

      if (body.type === ChallengeType.BOX || existing.type === ChallengeType.BOX) {
        if (!dockerImage) {
          return NextResponse.json({ error: 'BOX challenges must have a dockerImage to be published' }, { status: 400 });
        }
      }

      if (body.type === ChallengeType.ROOM || existing.type === ChallengeType.ROOM) {
        if (!tasks || tasks.length === 0) {
          return NextResponse.json({ error: 'ROOM challenges must have at least 1 task with an answer to be published' }, { status: 400 });
        }
        const hasAnswer = tasks.some((t: { answer?: string }) => t.answer && t.answer.trim().length > 0);
        if (!hasAnswer) {
          return NextResponse.json({ error: 'ROOM challenges must have at least 1 task with an answer to be published' }, { status: 400 });
        }
      }

      if (body.type === ChallengeType.CTF || existing.type === ChallengeType.CTF) {
        if (!dockerImage && !templateConfig) {
          return NextResponse.json({ error: 'CTF challenges must have either dockerImage or templateConfig to be published' }, { status: 400 });
        }
      }
    }

    if (body.templateConfig && typeof body.templateConfig === 'string') {
      try {
        updatedData.templateConfig = JSON.parse(body.templateConfig);
      } catch {
        return NextResponse.json({ error: 'Invalid templateConfig JSON' }, { status: 400 });
      }
    }

    const challenge = await prisma.challenge.update({
      where: { id: challengeId },
      data: updatedData,
    });

    return NextResponse.json({ challenge });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const user = await requireRole('ADMIN')(req);
    const { challengeId } = await params;

    const existing = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    await prisma.challenge.update({
      where: { id: challengeId },
      data: { isPublished: false },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

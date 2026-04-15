import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

interface PathParams {
  params: Promise<{ pathId: string }>;
}

export async function GET(req: NextRequest, { params }: PathParams) {
  try {
    const user = await requireAuth(req);
    const { pathId } = await params;

    const path = await prisma.path.findUnique({
      where: { id: pathId },
      include: {
        pathSteps: {
          orderBy: { order: 'asc' },
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

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    const userProgress = await prisma.userPathProgress.findUnique({
      where: {
        userId_pathId: {
          userId: user.sub,
          pathId,
        },
      },
    });

    return NextResponse.json({
      id: path.id,
      title: path.title,
      description: path.description,
      badgeUrl: path.badgeUrl,
      isPublished: path.isPublished,
      createdAt: path.createdAt,
      steps: path.pathSteps.map((step) => ({
        order: step.order,
        challenge: step.challenge,
      })),
      userProgress: userProgress
        ? {
            id: userProgress.id,
            status: userProgress.status,
            startedAt: userProgress.startedAt,
            completedAt: userProgress.completedAt,
          }
        : null,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest, { params }: PathParams) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { pathId } = await params;
    let body: {
      title?: string;
      description?: string;
      badgeUrl?: string | null;
      isPublished?: boolean;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { title, description, badgeUrl, isPublished } = body;

    const existingPath = await prisma.path.findUnique({
      where: { id: pathId },
      include: { _count: { select: { pathSteps: true } } },
    });

    if (!existingPath) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    if (isPublished === true && existingPath._count.pathSteps === 0) {
      return NextResponse.json(
        { error: 'Cannot publish path without steps' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length === 0) {
        return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
      }
      updateData.title = title.trim();
    }
    if (description !== undefined) {
      updateData.description = description.trim();
    }
    if (badgeUrl !== undefined) {
      updateData.badgeUrl = badgeUrl?.trim() || null;
    }
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
    }

    const updatedPath = await prisma.path.update({
      where: { id: pathId },
      data: updateData,
    });

    return NextResponse.json(updatedPath);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest, { params }: PathParams) {
  try {
    await requireRole('ADMIN')(req);
    const { pathId } = await params;

    const existingPath = await prisma.path.findUnique({
      where: { id: pathId },
      include: {
        _count: { select: { userPathProgress: true } },
      },
    });

    if (!existingPath) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 });
    }

    if (existingPath._count.userPathProgress > 0) {
      return NextResponse.json(
        { error: 'Path has active learners' },
        { status: 409 }
      );
    }

    await prisma.path.delete({
      where: { id: pathId },
    });

    return NextResponse.json({ message: 'Path deleted' });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
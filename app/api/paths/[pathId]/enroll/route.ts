import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

interface PathParams {
  params: Promise<{ pathId: string }>;
}

export async function POST(req: NextRequest, { params }: PathParams) {
  try {
    const user = await requireAuth(req);
    const { pathId } = await params;

    const path = await prisma.path.findUnique({
      where: { id: pathId, isPublished: true },
    });

    if (!path) {
      return NextResponse.json({ error: 'Path not found or not published' }, { status: 404 });
    }

    const existingProgress = await prisma.userPathProgress.findUnique({
      where: {
        userId_pathId: {
          userId: user.sub,
          pathId,
        },
      },
    });

    if (existingProgress) {
      return NextResponse.json({
        enrolled: false,
        progress: {
          id: existingProgress.id,
          status: existingProgress.status,
          startedAt: existingProgress.startedAt,
          completedAt: existingProgress.completedAt,
        },
      });
    }

    const progress = await prisma.userPathProgress.create({
      data: {
        userId: user.sub,
        pathId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return NextResponse.json({
      enrolled: true,
      progress: {
        id: progress.id,
        status: progress.status,
        startedAt: progress.startedAt,
        completedAt: progress.completedAt,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
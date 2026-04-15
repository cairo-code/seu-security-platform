import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { getOrCreateFlag } from '@/lib/flags';
import { prisma } from '@/lib/prisma';
import { ContainerStatus } from '@prisma/client';
import { startContainer, stopContainer, extendContainer, generateWsToken } from '@/lib/containerClient';
import crypto from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { challengeId } = await params;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (!challenge.isPublished) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    }

    if (challenge.type !== 'BOX') {
      return NextResponse.json({ error: 'Challenge type not supported' }, { status: 400 });
    }

    const userId = auth.sub;

    const existingSession = await prisma.containerSession.findFirst({
      where: {
        userId,
        challengeId,
        status: ContainerStatus.RUNNING,
      },
    });

    if (existingSession) {
      if (existingSession.expiresAt > new Date()) {
        const wsToken = generateWsToken(userId, existingSession.containerId);
        return NextResponse.json({
          wsToken,
          expiresAt: existingSession.expiresAt.toISOString(),
          containerId: existingSession.containerId,
        });
      } else {
        await prisma.containerSession.update({
          where: { id: existingSession.id },
          data: { status: ContainerStatus.DESTROYED },
        });
      }
    }

    const flag = await getOrCreateFlag(userId, challengeId);

    if (!challenge.dockerImage) {
      return NextResponse.json({ error: 'Docker image not configured' }, { status: 500 });
    }

    const containerResult = await startContainer(
      userId,
      challengeId,
      challenge.dockerImage,
      flag
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const wsToken = generateWsToken(userId, containerResult.containerId);

    await prisma.containerSession.upsert({
      where: {
        userId_challengeId: { userId, challengeId },
      },
      update: {
        containerId: containerResult.containerId,
        wsUrl: containerResult.wsUrl,
        status: ContainerStatus.RUNNING,
        lastActivityAt: new Date(),
        expiresAt,
      },
      create: {
        userId,
        challengeId,
        containerId: containerResult.containerId,
        wsUrl: containerResult.wsUrl,
        status: ContainerStatus.RUNNING,
        lastActivityAt: new Date(),
        expiresAt,
      },
    });

    return NextResponse.json({
      wsToken,
      expiresAt: expiresAt.toISOString(),
      containerId: containerResult.containerId,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    if (error instanceof Error && 'statusCode' in error) {
      const statusCode = (error as { statusCode: number }).statusCode;
      if (statusCode === 503) {
        return NextResponse.json({ error: 'No capacity available, try again later' }, { status: 503 });
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { challengeId } = await params;

    const userId = auth.sub;

    const session = await prisma.containerSession.findFirst({
      where: {
        userId,
        challengeId,
        status: ContainerStatus.RUNNING,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'No active container' }, { status: 404 });
    }

    await stopContainer(session.containerId);

    await prisma.containerSession.update({
      where: { id: session.id },
      data: { status: ContainerStatus.DESTROYED },
    });

    return NextResponse.json({ stopped: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { challengeId } = await params;

    const body = await req.json();
    const minutes = Math.min(Math.max(body.minutes || 30, 5), 60);

    const userId = auth.sub;

    const session = await prisma.containerSession.findFirst({
      where: {
        userId,
        challengeId,
        status: ContainerStatus.RUNNING,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'No active container' }, { status: 404 });
    }

    const result = await extendContainer(session.containerId, minutes);

    const newExpiresAt = new Date(result.expiresAt);

    await prisma.containerSession.update({
      where: { id: session.id },
      data: {
        expiresAt: newExpiresAt,
        lastActivityAt: new Date(),
      },
    });

    return NextResponse.json({ expiresAt: newExpiresAt.toISOString() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
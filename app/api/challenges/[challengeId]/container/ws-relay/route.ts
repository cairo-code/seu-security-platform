import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { ContainerStatus } from '@prisma/client';
import { verifyWsToken } from '@/lib/containerClient';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { challengeId } = await params;

    const wsToken = req.nextUrl.searchParams.get('wsToken');

    if (!wsToken) {
      return NextResponse.json({ error: 'wsToken required' }, { status: 400 });
    }

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

    const isValid = verifyWsToken(userId, session.containerId, wsToken);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
    }

    return NextResponse.json({
      wsUrl: session.wsUrl,
      managerToken: process.env.MANAGER_SECRET,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
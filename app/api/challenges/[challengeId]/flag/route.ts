import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { getOrCreateFlag, getOrCreateStaticChallenge } from '@/lib/flags';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ challengeId: string }> }) {
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

    if (challenge.type === 'BOX' || (challenge.type === 'CTF' && !challenge.templateConfig)) {
      const flag = await getOrCreateFlag(auth.sub, challengeId);
      return NextResponse.json({ flag });
    }

    if (challenge.type === 'CTF' && challenge.templateConfig) {
      const { puzzle } = await getOrCreateStaticChallenge(
        auth.sub,
        challengeId,
        challenge.templateConfig
      );
      return NextResponse.json({ puzzle });
    }

    return NextResponse.json({ error: 'Invalid challenge type' }, { status: 400 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
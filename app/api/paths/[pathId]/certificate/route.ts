import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { generateCertificate } from '@/lib/certificates/generate';

interface PathParams {
  params: Promise<{ pathId: string }>;
}

export async function GET(req: NextRequest, { params }: PathParams) {
  try {
    const user = await requireAuth(req);
    const { pathId } = await params;

    const existingCert = await prisma.certificate.findUnique({
      where: {
        userId_pathId: {
          userId: user.sub,
          pathId,
        },
      },
      select: { cloudinaryUrl: true },
    });

    if (existingCert) {
      return NextResponse.json({ cloudinaryUrl: existingCert.cloudinaryUrl });
    }

    const progress = await prisma.userPathProgress.findUnique({
      where: {
        userId_pathId: {
          userId: user.sub,
          pathId,
        },
      },
      select: { status: true },
    });

    if (!progress || progress.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Path not completed' }, { status: 403 });
    }

    const cloudinaryUrl = await generateCertificate(user.sub, pathId);

    return NextResponse.json({ cloudinaryUrl });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const paths = await prisma.path.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { pathSteps: true },
        },
      },
    });

    const result = paths.map((path) => ({
      id: path.id,
      title: path.title,
      description: path.description,
      badgeUrl: path.badgeUrl,
      createdAt: path.createdAt,
      stepsCount: path._count.pathSteps,
    }));

    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRole('ADMIN', 'TEACHER')(req);
    let body: { title: string; description?: string; badgeUrl?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { title, description, badgeUrl } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const path = await prisma.path.create({
      data: {
        title: title.trim(),
        description: description?.trim() || '',
        badgeUrl: badgeUrl?.trim() || null,
        createdById: user.sub,
      },
    });

    return NextResponse.json(path, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
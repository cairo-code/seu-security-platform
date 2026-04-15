import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { ChallengeType, Difficulty } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);

    const url = new URL(req.url);
    const type = url.searchParams.get('type') as ChallengeType | null;
    const published = url.searchParams.get('published');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (published !== null && published !== undefined) {
      where.isPublished = published === 'true' || published === 'yes';
    }

    const skip = (page - 1) * limit;

    const [challenges, total] = await Promise.all([
      prisma.challenge.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              tasks: true,
              submissions: true,
            },
          },
        },
      }),
      prisma.challenge.count({ where }),
    ]);

    return NextResponse.json({
      challenges,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
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
    const body = await req.json();

    const { title, description, type, difficulty, points, dockerImage, templateConfig } = body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required and must not be empty' }, { status: 400 });
    }

    if (!points || typeof points !== 'number' || points <= 0) {
      return NextResponse.json({ error: 'Points must be greater than 0' }, { status: 400 });
    }

    if (!type || !Object.values(ChallengeType).includes(type)) {
      return NextResponse.json({ error: 'Invalid challenge type' }, { status: 400 });
    }

    if (!difficulty || !Object.values(Difficulty).includes(difficulty)) {
      return NextResponse.json({ error: 'Invalid difficulty' }, { status: 400 });
    }

    if (type === 'BOX' && !dockerImage) {
      return NextResponse.json({ error: 'dockerImage is required for BOX challenges' }, { status: 400 });
    }

    if (type === 'CTF' && !dockerImage && !templateConfig) {
      return NextResponse.json({ error: 'CTF challenges require either dockerImage or templateConfig' }, { status: 400 });
    }

    let parsedTemplateConfig = templateConfig;
    if (templateConfig && typeof templateConfig === 'string') {
      try {
        parsedTemplateConfig = JSON.parse(templateConfig);
      } catch {
        return NextResponse.json({ error: 'Invalid templateConfig JSON' }, { status: 400 });
      }
    }

    const challenge = await prisma.challenge.create({
      data: {
        title: title.trim(),
        description: description || '',
        type,
        difficulty,
        points,
        dockerImage: dockerImage || null,
        templateConfig: parsedTemplateConfig || null,
        createdById: user.sub,
      },
    });

    return NextResponse.json({ challenge }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

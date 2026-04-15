import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string; taskId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { taskId } = await params;
    const body = await req.json();

    const { content, pointCost } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Hint content is required' }, { status: 400 });
    }

    if (!pointCost || typeof pointCost !== 'number' || pointCost <= 0) {
      return NextResponse.json({ error: 'pointCost must be greater than 0' }, { status: 400 });
    }

    const hint = await prisma.hint.create({
      data: {
        taskId,
        content: content.trim(),
        pointCost,
      },
    });

    return NextResponse.json({ hint }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string; taskId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const body = await req.json();

    const { hintId } = body;

    if (!hintId) {
      return NextResponse.json({ error: 'hintId is required' }, { status: 400 });
    }

    await prisma.hint.delete({
      where: { id: hintId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

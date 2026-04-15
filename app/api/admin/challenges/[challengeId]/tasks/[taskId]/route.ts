import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ challengeId: string; taskId: string }> }
) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);
    const { taskId } = await params;
    const body = await req.json();

    const task = await prisma.task.update({
      where: { id: taskId },
      data: body,
      include: {
        hints: true,
      },
    });

    return NextResponse.json({ task });
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
    const { taskId } = await params;

    await prisma.task.delete({
      where: { id: taskId },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

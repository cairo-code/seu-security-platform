import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest) {
  try {
    await requireRole('ADMIN')(req);

    const runningSessions = await prisma.containerSession.findMany({
      where: { status: 'RUNNING' },
      select: { containerId: true },
    });

    const { containerClient } = await import('@/lib/containerClient');

    for (const session of runningSessions) {
      try {
        await containerClient.stopContainer(session.containerId);
      } catch {
        // Ignore individual stop errors
      }
    }

    if (runningSessions.length > 0) {
      await prisma.containerSession.updateMany({
        where: { status: 'RUNNING' },
        data: { status: 'DESTROYED' },
      });
    }

    return NextResponse.json({ destroyed: runningSessions.length });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
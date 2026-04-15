import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await requireRole('ADMIN')(req);
    const { eventId } = await params;

    const event = await prisma.cTFEvent.findUnique({
      where: { id: eventId },
      select: { startsAt: true },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const now = new Date();
    if (event.startsAt <= now) {
      return NextResponse.json(
        { error: 'Cannot delete an event that has already started' },
        { status: 400 }
      );
    }

    await prisma.cTFEvent.delete({
      where: { id: eventId },
    });

    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
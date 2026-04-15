import { prisma } from '@/lib/prisma';
import { CTFEvent, Role } from '@prisma/client';

export class CTFAccessError extends Error {
  statusCode: number;
  metadata?: Record<string, unknown>;

  constructor(message: string, statusCode: number, metadata?: Record<string, unknown>) {
    super(message);
    this.name = 'CTFAccessError';
    this.statusCode = statusCode;
    this.metadata = metadata;
  }
}

export async function assertEventAccess(
  eventId: string,
  userId: string,
  role: Role | null,
  skipTimeCheck = false
): Promise<CTFEvent> {
  const event = await prisma.cTFEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new CTFAccessError('Event not found', 404);
  }

  const isAdminOrTeacher = role === 'ADMIN' || role === 'TEACHER';

  if (!event.isPublished && !isAdminOrTeacher) {
    throw new CTFAccessError('Event not published', 403);
  }

  const now = new Date();

  if (!skipTimeCheck && !isAdminOrTeacher) {
    if (event.startsAt > now) {
      throw new CTFAccessError('Event not started', 403, {
        startsAt: event.startsAt.toISOString(),
      });
    }

    if (event.endsAt < now) {
      throw new CTFAccessError('Event ended', 403, {
        endsAt: event.endsAt.toISOString(),
      });
    }
  }

  return event;
}

export async function getTeamForUser(
  eventId: string,
  userId: string
): Promise<{
  id: string;
  name: string;
  inviteCode: string;
} | null> {
  const membership = await prisma.cTFTeamMember.findFirst({
    where: {
      userId,
      team: {
        eventId,
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          inviteCode: true,
        },
      },
    },
  });

  return membership?.team ?? null;
}
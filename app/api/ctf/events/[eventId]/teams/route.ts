import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { assertEventAccess } from '@/lib/ctf/access';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { eventId } = await params;

    await assertEventAccess(eventId, auth.sub, auth.role, true);

    const teams = await prisma.cTFTeam.findMany({
      where: { eventId },
      include: {
        _count: {
          select: { members: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      teams: teams.map(t => ({
        id: t.id,
        name: t.name,
        memberCount: t._count.members,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { eventId } = await params;
    const body = await req.json();

    const { name } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    await assertEventAccess(eventId, auth.sub, auth.role, false);

    const existingMembership = await prisma.cTFTeamMember.findFirst({
      where: {
        userId: auth.sub,
        team: { eventId },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User already in a team for this event' },
        { status: 400 }
      );
    }

    const inviteCode = generateInviteCode();

    const team = await prisma.$transaction(async tx => {
      const newTeam = await tx.cTFTeam.create({
        data: {
          eventId,
          name: name.trim(),
          inviteCode,
        },
      });

      await tx.cTFTeamMember.create({
        data: {
          teamId: newTeam.id,
          userId: auth.sub,
        },
      });

      return newTeam;
    });

    return NextResponse.json(
      { team: { id: team.id, name: team.name }, inviteCode },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
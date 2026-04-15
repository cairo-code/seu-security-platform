import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { assertEventAccess } from '@/lib/ctf/access';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const auth = await requireAuth(req);
    const { eventId } = await params;
    const body = await req.json();

    const { inviteCode } = body;

    if (!inviteCode || typeof inviteCode !== 'string') {
      return NextResponse.json({ error: 'inviteCode is required' }, { status: 400 });
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

    const team = await prisma.cTFTeam.findFirst({
      where: {
        eventId,
        inviteCode: inviteCode.toUpperCase(),
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
    }

    await prisma.cTFTeamMember.create({
      data: {
        teamId: team.id,
        userId: auth.sub,
      },
    });

    return NextResponse.json({
      team: { id: team.id, name: team.name },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
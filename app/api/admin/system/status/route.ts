import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import { containerClient } from '@/lib/containerClient';

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN', 'TEACHER')(req);

    let containerStatus = { running: 0, max: 10 };
    try {
      containerStatus = await containerClient.getStatus();
    } catch {
      // Ignore container manager errors
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [totalUsers, totalChallenges, submissionsToday] = await Promise.all([
      prisma.user.count(),
      prisma.challenge.count(),
      prisma.submission.count({
        where: {
          submittedAt: {
            gte: todayStart,
          },
        },
      }),
    ]);

    return NextResponse.json({
      running: containerStatus.running,
      max: containerStatus.max,
      totalUsers,
      totalChallenges,
      submissionsToday,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
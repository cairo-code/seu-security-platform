import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyRole } from '@/lib/auth/middleware';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q')?.trim();
  if (!q || q.length < 1) {
    return NextResponse.json({ results: [] });
  }
  const cookieStore = cookies();
  const accessToken = cookieStore.get('seu_access_token')?.value;

  let userRole: string | null = null;
  try {
    if (accessToken) {
      userRole = await verifyRole(accessToken, 'ADMIN', 'TEACHER') ? 'ADMIN' : 'STUDENT';
    } else {
      userRole = 'STUDENT';
    }
  } catch { userRole = 'STUDENT'; }

  // Challenges (always available, but restrict unpublished for students)
  const challenges = await prisma.challenge.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ],
      ...(userRole === 'ADMIN' ? {} : { isPublished: true }),
    },
    take: 7,
    orderBy: { createdAt: 'desc' },
  });

  // Users (admin/teacher only)
  let users: any[] = [];
  if (userRole === 'ADMIN') {
    users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { universityId: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, universityId: true, email: true, role: true },
      take: 7,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Events (if model exists, otherwise returns [])
  let events: any[] = [];
  try {
    // Try to load CTFEvent table (skip if not present)
    events = await prisma.cTFEvent.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ]
      },
      take: 5,
      orderBy: { startDate: 'desc' },
    });
  } catch {}

  // Response format: segment by type
  const results = [
    ...challenges.map((c) => ({
      type: 'challenge',
      id: c.id,
      title: c.title,
      desc: c.description?.slice(0, 80),
      difficulty: c.difficulty,
      published: c.isPublished,
      route: `/challenges/${c.id}`,
    })),
    ...users.map((u) => ({
      type: 'user',
      id: u.id,
      name: u.name,
      universityId: u.universityId,
      email: u.email,
      role: u.role,
      route: `/admin/users/${u.id}`,
    })),
    ...events.map((e) => ({
      type: 'event',
      id: e.id,
      title: e.title,
      desc: e.description?.slice(0, 80),
      status: e.status,
      route: `/admin/ctf/${e.id}`,
    })),
  ];
  return NextResponse.json({ results });
}

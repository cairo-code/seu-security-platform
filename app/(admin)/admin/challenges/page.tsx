import { verifyRole } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';
import ChallengeList from '@/components/admin/ChallengeList';
import { cookies } from 'next/headers';

type ChallengeWithCounts = {
  id: string;
  title: string;
  description: string;
  type: 'ROOM' | 'BOX' | 'CTF';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  dockerImage: string | null;
  templateConfig: unknown;
  isPublished: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    tasks: number;
    submissions: number;
  };
};

export default async function AdminChallengesPage() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('seu_access_token')?.value;

  if (!accessToken) {
    return <div className="p-6 text-red-600">Unauthorized. Admin or Teacher access required.</div>;
  }

  try {
    await verifyRole(accessToken, 'ADMIN', 'TEACHER');
  } catch {
    return <div className="p-6 text-red-600">Unauthorized. Admin or Teacher access required.</div>;
  }

  const challenges = await prisma.challenge.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          tasks: true,
          submissions: true,
        },
      },
    },
  });

  const transformed: ChallengeWithCounts[] = challenges.map((c: any) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    type: c.type as 'ROOM' | 'BOX' | 'CTF',
    difficulty: c.difficulty as 'EASY' | 'MEDIUM' | 'HARD',
    points: c.points,
    dockerImage: c.dockerImage,
    templateConfig: c.templateConfig as unknown,
    isPublished: c.isPublished,
    createdById: c.createdById,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : String(c.createdAt),
    updatedAt: c.updatedAt instanceof Date ? c.updatedAt.toISOString() : String(c.updatedAt),
    _count: {
      tasks: c._count.tasks,
      submissions: c._count.submissions,
    },
  }));

  return <ChallengeList initialChallenges={transformed} />;
}

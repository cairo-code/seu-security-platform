import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const FLAG_PREFIX = 'SEU{';
const FLAG_SUFFIX = '}';

export function generateFlag(userId: string, challengeId: string): string {
  const hmac = crypto.createHmac('sha256', process.env.FLAG_SECRET!);
  hmac.update(`${userId}:${challengeId}`);
  const hash = hmac.digest('hex');
  return `${FLAG_PREFIX}${hash}${FLAG_SUFFIX}`;
}

export function computeFlagHash(flag: string): string {
  return crypto.createHash('sha256').update(flag).digest('hex');
}

export async function getOrCreateFlag(
  userId: string,
  challengeId: string
): Promise<string> {
  const existing = await prisma.userFlag.findUnique({
    where: {
      userId_challengeId: { userId, challengeId },
    },
  });

  if (existing) {
    return generateFlag(userId, challengeId);
  }

  const flag = generateFlag(userId, challengeId);
  const flagHash = computeFlagHash(flag);

  await prisma.userFlag.create({
    data: {
      userId,
      challengeId,
      flagHash,
      generatedAt: new Date(),
    },
  });

  return flag;
}

export function verifyFlag(
  userId: string,
  challengeId: string,
  submitted: string
): boolean {
  const expectedFlag = generateFlag(userId, challengeId);

  if (expectedFlag.length !== submitted.length) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedFlag);
  const submittedBuffer = Buffer.from(submitted);

  return crypto.timingSafeEqual(expectedBuffer, submittedBuffer);
}
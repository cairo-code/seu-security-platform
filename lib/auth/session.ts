import { createHash } from 'crypto';
import { signRefreshToken, verifyRefreshToken } from './jwt';
import { prisma } from '@/lib/prisma';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string, refreshToken: string): Promise<string> {
  const hashedToken = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
    },
  });

  return refreshToken;
}

export async function deleteSession(token: string): Promise<void> {
  const hashedToken = hashToken(token);
  await prisma.session.deleteMany({
    where: { token: hashedToken },
  });
}

export async function rotateSession(oldToken: string, userId: string): Promise<string> {
  const hashedOldToken = hashToken(oldToken);

  await prisma.session.deleteMany({
    where: { token: hashedOldToken },
  });

  const newRefreshTokenPayload = { sub: userId };
  const newRefreshToken = await signRefreshToken(newRefreshTokenPayload);

  const hashedNewToken = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      token: hashedNewToken,
      expiresAt,
    },
  });

  return newRefreshToken;
}
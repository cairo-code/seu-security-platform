import { prisma } from '@/lib/prisma';

let cachedConfig: { attempts: number; windowMinutes: number } | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 60 * 1000;

export class RateLimitError extends Error {
  statusCode: number;
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super('Too many attempts');
    this.name = 'RateLimitError';
    this.statusCode = 429;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export async function getRateLimitConfig(): Promise<{ attempts: number; windowMinutes: number }> {
  const now = Date.now();

  if (cachedConfig && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 1 },
      select: { rateLimitAttempts: true, rateLimitWindowMinutes: true },
    });

    cachedConfig = {
      attempts: config?.rateLimitAttempts ?? 3,
      windowMinutes: config?.rateLimitWindowMinutes ?? 10,
    };
    cacheTimestamp = now;
    return cachedConfig;
  } catch {
    return { attempts: 3, windowMinutes: 10 };
  }
}

export async function cleanupRateLimitLogs(): Promise<void> {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.rateLimitLog.deleteMany({
      where: { attemptedAt: { lt: cutoff } },
    });
  } catch {
    // Silently fail to not block the main flow
  }
}

export async function checkRateLimit(userId: string, challengeId: string): Promise<void> {
  if (Math.random() < 0.05) {
    await cleanupRateLimitLogs();
  }

  const { attempts, windowMinutes } = await getRateLimitConfig();

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

  try {
    const count = await prisma.rateLimitLog.count({
      where: {
        userId,
        challengeId,
        attemptedAt: { gte: windowStart },
      },
    });

    if (count >= attempts) {
      const oldestInWindow = await prisma.rateLimitLog.findFirst({
        where: {
          userId,
          challengeId,
          attemptedAt: { gte: windowStart },
        },
        orderBy: { attemptedAt: 'asc' },
        select: { attemptedAt: true },
      });

      if (oldestInWindow) {
        const expiresAt = new Date(oldestInWindow.attemptedAt.getTime() + windowMinutes * 60 * 1000);
        const retryAfterSeconds = Math.ceil((expiresAt.getTime() - Date.now()) / 1000);
        throw new RateLimitError(retryAfterSeconds);
      }

      throw new RateLimitError(windowMinutes * 60);
    }

    await prisma.rateLimitLog.create({
      data: {
        userId,
        challengeId,
        attemptedAt: new Date(),
      },
    });
  } catch (e) {
    if (e instanceof RateLimitError) {
      throw e;
    }
    // On DB error, allow the request to proceed
  }
}
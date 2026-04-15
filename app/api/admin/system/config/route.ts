import { NextRequest, NextResponse } from 'next/server';
import { requireRole, AuthError } from '@/lib/auth/middleware';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    await requireRole('ADMIN')(req);

    const config = await prisma.systemConfig.findUnique({
      where: { id: 1 },
    });

    if (!config) {
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: config.id,
      maxConcurrentContainers: config.maxConcurrentContainers,
      rateLimitAttempts: config.rateLimitAttempts,
      rateLimitWindowMinutes: config.rateLimitWindowMinutes,
      containerTimeoutMinutes: config.containerTimeoutMinutes,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireRole('ADMIN')(req);
    const body = await req.json();

    const {
      maxConcurrentContainers,
      rateLimitAttempts,
      rateLimitWindowMinutes,
      containerTimeoutMinutes,
    } = body;

    const updateData: Record<string, number> = {};

    if (maxConcurrentContainers !== undefined) {
      if (typeof maxConcurrentContainers !== 'number' || maxConcurrentContainers <= 0) {
        return NextResponse.json(
          { error: 'maxConcurrentContainers must be a positive integer' },
          { status: 400 }
        );
      }
      updateData.maxConcurrentContainers = maxConcurrentContainers;
    }

    if (rateLimitAttempts !== undefined) {
      if (typeof rateLimitAttempts !== 'number' || rateLimitAttempts <= 0) {
        return NextResponse.json(
          { error: 'rateLimitAttempts must be a positive integer' },
          { status: 400 }
        );
      }
      updateData.rateLimitAttempts = rateLimitAttempts;
    }

    if (rateLimitWindowMinutes !== undefined) {
      if (typeof rateLimitWindowMinutes !== 'number' || rateLimitWindowMinutes <= 0) {
        return NextResponse.json(
          { error: 'rateLimitWindowMinutes must be a positive integer' },
          { status: 400 }
        );
      }
      updateData.rateLimitWindowMinutes = rateLimitWindowMinutes;
    }

    if (containerTimeoutMinutes !== undefined) {
      if (typeof containerTimeoutMinutes !== 'number' || containerTimeoutMinutes <= 0) {
        return NextResponse.json(
          { error: 'containerTimeoutMinutes must be a positive integer' },
          { status: 400 }
        );
      }
      updateData.containerTimeoutMinutes = containerTimeoutMinutes;
    }

    const config = await prisma.systemConfig.upsert({
      where: { id: 1 },
      create: updateData,
      update: updateData,
    });

    const { containerClient } = await import('@/lib/containerClient');
    try {
      await (containerClient as { config?: (cfg: Record<string, number>) => Promise<void> }).config?.({
        maxConcurrentContainers: config.maxConcurrentContainers,
        containerTimeoutMinutes: config.containerTimeoutMinutes,
      });
    } catch {
      // Ignore container sync errors
    }

    return NextResponse.json({
      id: config.id,
      maxConcurrentContainers: config.maxConcurrentContainers,
      rateLimitAttempts: config.rateLimitAttempts,
      rateLimitWindowMinutes: config.rateLimitWindowMinutes,
      containerTimeoutMinutes: config.containerTimeoutMinutes,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.statusCode });
    }
    throw e;
  }
}
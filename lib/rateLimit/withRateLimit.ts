import { requireAuth, AuthError } from '@/lib/auth/middleware';
import { checkRateLimit, RateLimitError } from './index';
import { NextRequest } from 'next/server';

type RouteHandler = (req: NextRequest, body: unknown, authPayload: { sub: string; role: unknown; universityId: string }) => Promise<Response>;

export function withRateLimit(handler: RouteHandler): RouteHandler {
  return async function (req: NextRequest): Promise<Response> {
    let authPayload;
    try {
      authPayload = await requireAuth(req);
    } catch (e) {
      if (e instanceof AuthError) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      throw e;
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      body = null;
    }

    const challengeId = typeof body === 'object' && body !== null && 'challengeId' in body
      ? (body as Record<string, unknown>).challengeId
      : null;

    if (typeof challengeId !== 'string') {
      return Response.json({ error: 'Missing challengeId' }, { status: 400 });
    }

    try {
      await checkRateLimit(authPayload.sub, challengeId);
    } catch (e) {
      if (e instanceof RateLimitError) {
        return Response.json(
          { error: 'Too many attempts', retryAfterSeconds: e.retryAfterSeconds },
          {
            status: 429,
            headers: { 'Retry-After': String(e.retryAfterSeconds) },
          }
        );
      }
      throw e;
    }

    return handler(req, body, authPayload);
  };
}
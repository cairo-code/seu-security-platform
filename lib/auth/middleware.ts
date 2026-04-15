import { Role } from '@prisma/client';
import { verifyAccessToken, AccessTokenPayload } from './jwt';

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
  }
}

export async function requireAuth(req: Request): Promise<AccessTokenPayload> {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AuthError('Unauthorized', 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token);
    return payload;
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }
}

export function requireRole(...roles: Role[]) {
  return async (req: Request): Promise<AccessTokenPayload> => {
    const payload = await requireAuth(req);

    if (!roles.includes(payload.role)) {
      throw new AuthError('Forbidden', 403);
    }

    return payload;
  };
}

export async function verifyRole(token: string, ...roles: Role[]): Promise<AccessTokenPayload> {
  const payload = await verifyAccessToken(token);

  if (!roles.includes(payload.role)) {
    throw new AuthError('Forbidden', 403);
  }

  return payload;
}
import { SignJWT, jwtVerify } from 'jose';
import { Role } from '@prisma/client';
import '@/lib/auth/validateEnv';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  universityId: string;
}

export interface RefreshTokenPayload {
  sub: string;
}

const accessTokenSecret = new TextEncoder().encode(process.env.JWT_SECRET);
const refreshTokenSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

export async function signAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub, role: payload.role, universityId: payload.universityId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('15m')
    .setSubject(payload.sub)
    .sign(accessTokenSecret);
}

export async function signRefreshToken(payload: RefreshTokenPayload): Promise<string> {
  return new SignJWT({ sub: payload.sub })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .setSubject(payload.sub)
    .sign(refreshTokenSecret);
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessTokenSecret);
  if (!payload.sub || !payload.role || !payload.universityId) {
    throw new Error('Invalid token payload');
  }
  return payload as unknown as AccessTokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, refreshTokenSecret);
  if (!payload.sub) {
    throw new Error('Invalid token payload');
  }
  return payload as RefreshTokenPayload;
}
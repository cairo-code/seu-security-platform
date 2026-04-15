import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { verifyRefreshToken } from '@/lib/auth/jwt';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('seu_refresh')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token not found' },
        { status: 401 }
      );
    }

    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    const hashedToken = hashToken(refreshToken);

    let session;
    try {
      session = await prisma.session.findUnique({
        where: { token: hashedToken },
      });
    } catch {
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    await prisma.session.delete({ where: { id: session.id } });

    const newRefreshTokenPayload = { sub: payload.sub };
    let newRefreshToken: string;
    let accessToken: string;

    try {
      newRefreshToken = await signRefreshToken(newRefreshTokenPayload);
      accessToken = await signAccessToken({
        sub: payload.sub,
        role: session.userId as any,
        universityId: '',
      });
    } catch {
      return NextResponse.json(
        { error: 'Token generation failed' },
        { status: 500 }
      );
    }

    const hashedNewToken = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    try {
      await prisma.session.create({
        data: {
          userId: session.userId,
          token: hashedNewToken,
          expiresAt,
        },
      });
    } catch {
      return NextResponse.json(
        { error: 'Session creation failed' },
        { status: 500 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, role: true, universityId: true, points: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    const accessTokenPayload = {
      sub: user.id,
      role: user.role,
      universityId: user.universityId,
    };

    try {
      accessToken = await signAccessToken(accessTokenPayload);
    } catch {
      return NextResponse.json(
        { error: 'Token generation failed' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        universityId: user.universityId,
        points: user.points,
      },
    });

    response.cookies.set('seu_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60,
      path: '/',
    });

    response.cookies.set('seu_refresh', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { createSession } from '@/lib/auth/session';

interface LoginBody {
  email: string;
  password: string;
}

export async function POST(req: NextRequest) {
  try {
    let body: LoginBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } catch {
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const accessTokenPayload = {
      sub: user.id,
      role: user.role,
      universityId: user.universityId,
    };

    const refreshTokenPayload = {
      sub: user.id,
    };

    let accessToken: string;
    let refreshToken: string;

    try {
      accessToken = await signAccessToken(accessTokenPayload);
      refreshToken = await signRefreshToken(refreshTokenPayload);
    } catch {
      return NextResponse.json(
        { error: 'Token generation failed' },
        { status: 500 }
      );
    }

    try {
      await createSession(user.id, refreshToken);
    } catch {
      return NextResponse.json(
        { error: 'Session creation failed' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      accessToken,
      refreshToken,
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

    response.cookies.set('seu_refresh', refreshToken, {
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
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const refreshToken = req.cookies.get('seu_refresh')?.value;

    if (refreshToken) {
      const hashedToken = hashToken(refreshToken);

      try {
        await prisma.session.deleteMany({
          where: { token: hashedToken },
        });
      } catch {
        return NextResponse.json(
          { error: 'Database operation failed' },
          { status: 500 }
        );
      }
    }

    const response = NextResponse.json({ message: 'Logged out' });

    response.cookies.set('seu_access_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    });

    response.cookies.set('seu_refresh', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
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
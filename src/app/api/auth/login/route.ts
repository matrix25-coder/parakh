import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/passwords';
import { createSessionToken, SESSION_COOKIE_NAME, MAX_AGE_SECONDS } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Please provide both email and password.' },
        { status: 400 }
      );
    }

    const user = getUserByEmail(email.trim());
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const isMatch = await verifyPassword(password, user.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id);
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
    };

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      user: safeUser,
      token,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE_SECONDS,
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}

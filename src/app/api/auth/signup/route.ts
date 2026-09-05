import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createUser, getUserByEmail } from '@/lib/db';
import { hashPassword } from '@/lib/auth/passwords';
import { createSessionToken, SESSION_COOKIE_NAME, MAX_AGE_SECONDS } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, confirmPassword } = body;

    // 1. Validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match.' },
        { status: 400 }
      );
    }

    // 2. Prevent duplicate email accounts
    const existing = getUserByEmail(email.trim());
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email address already exists. Please sign in.' },
        { status: 409 }
      );
    }

    // 3. Hash password securely
    const passwordHash = await hashPassword(password);
    const userId = `usr_${crypto.randomUUID()}`;

    // 4. Store user in database
    const newUser = createUser({
      id: userId,
      name: name.trim(),
      email: email.trim(),
      passwordHash,
    });

    // 5. Generate authenticated session
    const token = createSessionToken(newUser.id);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      created_at: newUser.created_at,
    };

    const response = NextResponse.json(
      {
        success: true,
        message: 'Account created successfully.',
        user: safeUser,
        token,
      },
      { status: 201 }
    );

    // Set secure HTTP-only cookie
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
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'Failed to create user account. Please try again.' },
      { status: 500 }
    );
  }
}

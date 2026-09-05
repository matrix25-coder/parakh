import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth/middleware-utils';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: err.message },
      { status: 500 }
    );
  }
}

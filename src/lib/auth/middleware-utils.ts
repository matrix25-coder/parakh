import { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE_NAME } from './session';
import { getUserById, type UserRecord } from '@/lib/db';

export async function getAuthUserFromRequest(
  req: NextRequest | Request
): Promise<Omit<UserRecord, 'password_hash'> | null> {
  try {
    let token: string | null = null;

    // 1. Check Authorization Bearer header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    // 2. Check cookie if no header
    if (!token) {
      const cookieHeader = req.headers.get('cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map((c) => c.trim());
        const sessionCookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
        if (sessionCookie) {
          token = sessionCookie.split('=')[1];
        }
      }
    }

    if (!token) return null;

    const userId = verifySessionToken(token);
    if (!userId) return null;

    const user = getUserById(userId);
    if (!user) return null;

    const { password_hash, ...safeUser } = user;
    return safeUser;
  } catch {
    return null;
  }
}

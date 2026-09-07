import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getUserById, type UserRecord } from '@/lib/db';

const SESSION_COOKIE_NAME = 'parakh_session';
const SESSION_SECRET =
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? (() => {
        throw new Error('AUTH_SECRET environment variable is required in production.');
      })()
    : 'parakh-dev-local-session-secret');
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days

export interface SessionPayload {
  userId: string;
  createdAt: number;
}

/**
 * Generate a cryptographically signed session token
 */
export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ userId, createdAt: Date.now() });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payloadB64);
  const signature = hmac.digest('base64url');
  return `${payloadB64}.${signature}`;
}

/**
 * Verify session token and return user ID if valid
 */
export function verifySessionToken(token: string): string | null {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const hmac = crypto.createHmac('sha256', SESSION_SECRET);
    hmac.update(payloadB64);
    const expectedSignature = hmac.digest('base64url');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const payload: SessionPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const maxAgeMs = MAX_AGE_SECONDS * 1000;
    if (Date.now() - payload.createdAt > maxAgeMs) {
      return null; // Expired
    }

    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * Get authenticated user from session cookie (Server Components & Server Actions / Route Handlers)
 */
export async function getSessionUser(): Promise<Omit<UserRecord, 'password_hash'> | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
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

export { SESSION_COOKIE_NAME, MAX_AGE_SECONDS };

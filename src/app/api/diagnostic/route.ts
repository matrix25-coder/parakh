import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envKeys = Object.keys(process.env).sort();
  const relevantKeys: Record<string, { exists: boolean; length: number }> = {};

  [
    'GEMINI_API_KEY',
    'AI_API_KEY',
    'GOOGLE_API_KEY',
    'NEXT_PUBLIC_GEMINI_API_KEY',
    'AUTH_SECRET',
    'DATABASE_URL',
    'VERCEL',
    'VERCEL_ENV',
    'NODE_ENV',
  ].forEach((k) => {
    const val = process.env[k];
    relevantKeys[k] = {
      exists: !!val,
      length: val ? val.length : 0,
    };
  });

  return NextResponse.json({
    status: 'ok',
    isServerless: !!(process.env.VERCEL || process.env.VERCEL_ENV),
    relevantKeys,
    matchingKeyNames: envKeys.filter((k) =>
      /GEMINI|API|SECRET|AUTH|GOOGLE/i.test(k)
    ),
  });
}

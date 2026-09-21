import { NextResponse } from 'next/server';
import { getRecidivistBrandIndex } from '@/lib/db/unified-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const list = await getRecidivistBrandIndex();
    return NextResponse.json({
      success: true,
      count: list.length,
      brands: list,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to generate recidivist brand index' },
      { status: 500 }
    );
  }
}

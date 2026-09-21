import { NextResponse } from 'next/server';
import { getGeospatialInspections } from '@/lib/db/unified-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const points = await getGeospatialInspections();
    return NextResponse.json({
      success: true,
      count: points.length,
      points,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch geospatial inspection records' },
      { status: 500 }
    );
  }
}

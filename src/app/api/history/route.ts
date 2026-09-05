import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserFromRequest } from '@/lib/auth/middleware-utils';
import { getUserScans, getUserByEmail } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    let authUser = await getAuthUserFromRequest(req);

    if (!authUser) {
      // Check default officer
      const defaultOfficer = getUserByEmail('officer@parakh.gov.in');
      if (defaultOfficer) {
        authUser = {
          id: defaultOfficer.id,
          name: defaultOfficer.name,
          email: defaultOfficer.email,
          created_at: defaultOfficer.created_at,
          updated_at: defaultOfficer.updated_at,
        };
      }
    }

    if (!authUser) {
      return NextResponse.json({ scans: [] });
    }

    const scans = getUserScans(authUser.id);

    const formatted = scans.map((s) => ({
      id: s.id,
      scan_id: `SCN-${s.id.slice(0, 8).toUpperCase()}`,
      product: s.product_name,
      category: s.category,
      date: s.created_at.split('T')[0],
      status: s.overall_status,
      violations: s.violations_count,
      inspector: s.inspector_name || authUser.name,
      image_path: s.image_path,
    }));

    return NextResponse.json({ scans: formatted });
  } catch (err: any) {
    console.error('History fetch error:', err);
    return NextResponse.json(
      { error: 'Failed to retrieve scan history.' },
      { status: 500 }
    );
  }
}

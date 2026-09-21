import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const db = getDb();

    // 1. Delete all old test records and dummy products
    const result = db.prepare(`
      DELETE FROM scan_history 
      WHERE created_at < '2026-09-21' 
         OR user_id LIKE 'usr_test_%' 
         OR id LIKE 'scn_%' 
         OR product_name = 'Amrit Pure Cow Ghee 500ml'
         OR product_name = 'kk'
         OR id = 'wellcore-creatine-analysis'
    `).run();

    // 2. Clean up test users from users table
    try {
      db.prepare(`
        DELETE FROM users 
        WHERE id LIKE 'usr_test_%' 
           OR email LIKE 'inspector_%@parakh.gov.in' 
           OR email LIKE 'sunita_%@parakh.gov.in'
      `).run();
    } catch {}

    return NextResponse.json({
      success: true,
      deletedCount: result.changes,
      message: `Successfully purged ${result.changes} dummy test records.`,
    });
  } catch (err: any) {
    console.error('Purge dummy scans error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to purge dummy scans.' },
      { status: 500 }
    );
  }
}

import { getDb } from '../src/lib/db';

const db = getDb();
const scans = db.prepare('SELECT id, user_id, product_name, image_path, package_faces, overall_status, violations_count, created_at FROM scan_history ORDER BY created_at DESC LIMIT 10').all();
console.log('Recent scans in database:');
console.log(JSON.stringify(scans, null, 2));

import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';
import type { ComplianceReport } from '@/lib/types';
import type { StructuredProductData } from '@/lib/extraction/types';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export interface ScanRecord {
  id: string;
  user_id: string;
  product_name: string;
  category: string;
  is_imported: number;
  country_of_origin: string | null;
  image_path: string;
  package_faces: string | null;
  raw_ocr_text: string | null;
  extracted_data: string; // JSON string
  compliance_result: string; // JSON string
  overall_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  violations_count: number;
  inspector_name: string | null;
  created_at: string;
}

import os from 'os';

// Global database connection singleton
let dbInstance: DatabaseSync | null = null;

function getDatabasePath(): string {
  // If explicitly configured via DATABASE_URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('file:')) {
    return path.resolve(process.env.DATABASE_URL.replace('file:', ''));
  }

  // Check if running in a serverless environment where /var/task is read-only
  const isServerless = !!(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.VERCEL_ENV ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isServerless) {
    const tmpDir = path.join(os.tmpdir(), 'parakh-data');
    try {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
      return path.join(tmpDir, 'parakh.db');
    } catch {
      return path.join(os.tmpdir(), 'parakh.db');
    }
  }

  // Local development: use ./data/parakh.db
  const dataDir = path.join(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    return path.join(dataDir, 'parakh.db');
  } catch {
    // If local directory cannot be created (e.g. read-only filesystem), fallback to os.tmpdir()
    const fallbackDir = path.join(os.tmpdir(), 'parakh-data');
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      return path.join(fallbackDir, 'parakh.db');
    } catch {
      return ':memory:';
    }
  }
}

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance;
  }

  const dbPath = getDatabasePath();
  let db: DatabaseSync;

  try {
    db = new DatabaseSync(dbPath);
    if (dbPath !== ':memory:') {
      try {
        db.exec('PRAGMA journal_mode = WAL;');
      } catch {}
    }
    db.exec('PRAGMA foreign_keys = ON;');
  } catch (err) {
    console.warn(`Could not open SQLite at ${dbPath}, falling back to in-memory database:`, err);
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
  }

  // Run schema initialization
  const schemaPath = path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    try {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      db.exec(schemaSql);
    } catch {
      // Fallback to inline schema
      initInlineSchema(db);
    }
  } else {
    initInlineSchema(db);
  }

  dbInstance = db;
  return dbInstance;
}

function initInlineSchema(db: DatabaseSync): void {
  db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS scan_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        category TEXT NOT NULL DEFAULT 'FOOD',
        is_imported INTEGER NOT NULL DEFAULT 0,
        country_of_origin TEXT,
        image_path TEXT NOT NULL,
        package_faces TEXT,
        raw_ocr_text TEXT,
        extracted_data TEXT NOT NULL,
        compliance_result TEXT NOT NULL,
        overall_status TEXT NOT NULL,
        violations_count INTEGER NOT NULL DEFAULT 0,
        inspector_name TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
      CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at DESC);
    `);
}

// ── USER REPOSITORY ──────────────────────────────────────────────────────────

export function createUser(user: {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}): UserRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(user.id, user.name, user.email.toLowerCase().trim(), user.passwordHash, now, now);

  return {
    id: user.id,
    name: user.name,
    email: user.email.toLowerCase().trim(),
    password_hash: user.passwordHash,
    created_at: now,
    updated_at: now,
  };
}

export function getUserByEmail(email: string): UserRecord | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE email = ?
    LIMIT 1
  `);
  const row = stmt.get(email.toLowerCase().trim()) as UserRecord | undefined;
  return row || null;
}

export function getUserById(id: string): UserRecord | null {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT id, name, email, password_hash, created_at, updated_at
    FROM users
    WHERE id = ?
    LIMIT 1
  `);
  const row = stmt.get(id) as UserRecord | undefined;
  return row || null;
}

// ── SCAN REPOSITORY ──────────────────────────────────────────────────────────

export interface CreateScanParams {
  id: string;
  userId: string;
  productName: string;
  category: string;
  isImported: boolean;
  countryOfOrigin?: string | null;
  imagePath: string;
  packageFaces?: string[];
  rawOcrText?: string | null;
  extractedData: StructuredProductData;
  complianceResult: ComplianceReport;
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  violationsCount: number;
  inspectorName?: string | null;
}

export function createScan(params: CreateScanParams): ScanRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT INTO scan_history (
      id, user_id, product_name, category, is_imported, country_of_origin,
      image_path, package_faces, raw_ocr_text, extracted_data, compliance_result,
      overall_status, violations_count, inspector_name, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    params.id,
    params.userId,
    params.productName,
    params.category,
    params.isImported ? 1 : 0,
    params.countryOfOrigin || null,
    params.imagePath,
    params.packageFaces ? JSON.stringify(params.packageFaces) : null,
    params.rawOcrText || null,
    JSON.stringify(params.extractedData),
    JSON.stringify(params.complianceResult),
    params.overallStatus,
    params.violationsCount,
    params.inspectorName || null,
    now
  );

  return {
    id: params.id,
    user_id: params.userId,
    product_name: params.productName,
    category: params.category,
    is_imported: params.isImported ? 1 : 0,
    country_of_origin: params.countryOfOrigin || null,
    image_path: params.imagePath,
    package_faces: params.packageFaces ? JSON.stringify(params.packageFaces) : null,
    raw_ocr_text: params.rawOcrText || null,
    extracted_data: JSON.stringify(params.extractedData),
    compliance_result: JSON.stringify(params.complianceResult),
    overall_status: params.overallStatus,
    violations_count: params.violationsCount,
    inspector_name: params.inspectorName || null,
    created_at: now,
  };
}

export function getScanById(scanId: string, userId?: string): ScanRecord | null {
  const db = getDb();
  let query = 'SELECT * FROM scan_history WHERE id = ?';
  const args: any[] = [scanId];

  if (userId) {
    query += ' AND user_id = ?';
    args.push(userId);
  }
  query += ' LIMIT 1';

  const stmt = db.prepare(query);
  const row = stmt.get(...args) as ScanRecord | undefined;
  return row || null;
}

export function getUserScans(userId: string): ScanRecord[] {
  const db = getDb();
  const stmt = db.prepare(`
    SELECT * FROM scan_history
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return (stmt.all(userId) as ScanRecord[]) || [];
}

export function updateScanReview(
  scanId: string,
  userId: string,
  extractedData: StructuredProductData,
  complianceResult: ComplianceReport,
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW',
  violationsCount: number
): boolean {
  const db = getDb();
  const stmt = db.prepare(`
    UPDATE scan_history
    SET extracted_data = ?,
        compliance_result = ?,
        overall_status = ?,
        violations_count = ?
    WHERE id = ? AND user_id = ?
  `);

  const info = stmt.run(
    JSON.stringify(extractedData),
    JSON.stringify(complianceResult),
    overallStatus,
    violationsCount,
    scanId,
    userId
  );

  return info.changes > 0;
}

export function getDashboardMetrics(userId: string) {
  const db = getDb();
  const scans = getUserScans(userId);

  const total = scans.length;
  const compliant = scans.filter((s) => s.overall_status === 'COMPLIANT').length;
  const violations = scans.filter((s) => s.overall_status === 'NON_COMPLIANT').length;
  const reviewRequired = scans.filter((s) => s.overall_status === 'NEEDS_REVIEW').length;

  const topViolationsMap: Record<string, { title: string; count: number }> = {};

  scans.forEach((scan) => {
    try {
      const result: ComplianceReport = JSON.parse(scan.compliance_result);
      if (result.violations) {
        result.violations.forEach((v) => {
          if (!topViolationsMap[v.rule_code]) {
            topViolationsMap[v.rule_code] = {
              title: v.violation_message,
              count: 0,
            };
          }
          topViolationsMap[v.rule_code].count += 1;
        });
      }
    } catch {
      // Ignore parse errors
    }
  });

  const topViolations = Object.entries(topViolationsMap)
    .map(([rule_code, data]) => ({
      rule_code,
      title: data.title,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalInspections: total,
    compliant,
    violations,
    reviewRequired,
    recentInspections: scans.slice(0, 5).map((s) => ({
      id: s.id,
      scan_id: `SCN-${s.id.slice(0, 8).toUpperCase()}`,
      product: s.product_name,
      category: s.category,
      date: s.created_at.split('T')[0],
      status: s.overall_status,
      violations: s.violations_count,
      inspector: s.inspector_name || 'Enforcement Officer',
    })),
    topViolations,
  };
}

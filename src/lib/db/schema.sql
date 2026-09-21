-- Parakh Database Schema
-- Compatible with SQLite (node:sqlite) and standard SQL

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
  latitude REAL,
  longitude REAL,
  altitude REAL,
  accuracy_meters REAL,
  establishment_name TEXT,
  establishment_address TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON scan_history(created_at DESC);

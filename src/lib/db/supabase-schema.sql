-- ==============================================================================
-- PARAKH SUPABASE PRODUCTION SCHEMA
-- Legal Metrology Enforcement Suite & Evidence Vault
-- Compatible with Supabase PostgreSQL (PostGIS enabled)
-- ==============================================================================

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  designation TEXT DEFAULT 'Legal Metrology Inspector',
  jurisdiction TEXT DEFAULT 'National Capital Territory',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 2. SCAN HISTORY & EVIDENCE DOSSIERS
CREATE TABLE IF NOT EXISTS public.scan_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  brand_name TEXT,
  category TEXT NOT NULL DEFAULT 'FOOD',
  is_imported BOOLEAN NOT NULL DEFAULT FALSE,
  country_of_origin TEXT,
  image_path TEXT NOT NULL,
  package_faces JSONB,
  raw_ocr_text TEXT,
  extracted_data JSONB NOT NULL,
  compliance_result JSONB NOT NULL,
  overall_status TEXT NOT NULL, -- 'COMPLIANT', 'NON_COMPLIANT', 'NEEDS_REVIEW'
  violations_count INTEGER NOT NULL DEFAULT 0,
  inspector_name TEXT,
  -- Geospatial Telemetry
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  altitude NUMERIC(8, 2),
  accuracy_meters NUMERIC(6, 2),
  establishment_name TEXT,
  establishment_address TEXT,
  -- Cryptographic Chain of Custody (Section 63 BSA / 65B IEA)
  forensic_hash TEXT,
  verification_code TEXT,
  forensic_manifest JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_history_user_id ON public.scan_history(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_history_created_at ON public.scan_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_history_status ON public.scan_history(overall_status);
CREATE INDEX IF NOT EXISTS idx_scan_history_geo ON public.scan_history(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_scan_history_brand ON public.scan_history(brand_name);

-- 3. RECIDIVIST BRAND & CORPORATE ENTITY TRACKER
CREATE TABLE IF NOT EXISTS public.recidivist_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_bytes(16),
  brand_name TEXT NOT NULL,
  manufacturer_name TEXT,
  total_violations INTEGER DEFAULT 1,
  distinct_retail_locations INTEGER DEFAULT 1,
  risk_tier TEXT NOT NULL DEFAULT 'MONITORING', -- 'MONITORING', 'WARNING', 'ESCALATED_SECTION_36_2'
  last_violation_rule TEXT,
  last_store_inspected TEXT,
  last_violated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recidivist_brand ON public.recidivist_entities(brand_name);
CREATE INDEX IF NOT EXISTS idx_recidivist_risk ON public.recidivist_entities(risk_tier);

-- 4. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recidivist_entities ENABLE ROW LEVEL SECURITY;

-- 5. PUBLIC / SERVICE POLICIES
CREATE POLICY "Public read and write for parakh inspectors" ON public.scan_history
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read and write for users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public read and write for recidivist tracker" ON public.recidivist_entities
  FOR ALL USING (true) WITH CHECK (true);

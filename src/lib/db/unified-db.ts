import { getDb, createScan, getScanById, getUserScans, type CreateScanParams, type ScanRecord } from './index';
import { getSupabase } from './supabase';

export interface UnifiedScanParams extends CreateScanParams {
  brandName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  accuracyMeters?: number | null;
  establishmentName?: string | null;
  establishmentAddress?: string | null;
  forensicHash?: string | null;
  verificationCode?: string | null;
  forensicManifest?: any;
}

export interface GeospatialInspectionPoint {
  id: string;
  productName: string;
  brandName: string;
  establishmentName: string;
  establishmentAddress: string;
  latitude: number;
  longitude: number;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  violationsCount: number;
  violations: Array<{ rule_code: string; title: string }>;
  verificationCode?: string;
  createdAt: string;
}

export interface RecidivistBrandEntry {
  brandName: string;
  manufacturerName: string;
  totalViolations: number;
  distinctStores: number;
  riskTier: 'MONITORING' | 'WARNING' | 'ESCALATED_SECTION_36_2';
  commonInfringements: string[];
  lastStoreInspected: string;
  lastViolatedAt: string;
}

/**
 * Save scan to SQLite and synchronize with Supabase cluster
 */
export async function saveUnifiedScan(params: UnifiedScanParams): Promise<ScanRecord> {
  // 1. Save to local SQLite
  const localRecord = createScan(params);

  // 2. Sync to Supabase if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.from('scan_history').upsert({
        id: params.id,
        user_id: params.userId,
        product_name: params.productName,
        brand_name: params.brandName || params.extractedData?.brand || null,
        category: params.category,
        is_imported: params.isImported,
        country_of_origin: params.countryOfOrigin || null,
        image_path: params.imagePath,
        package_faces: params.packageFaces ? params.packageFaces : null,
        raw_ocr_text: params.rawOcrText || null,
        extracted_data: params.extractedData,
        compliance_result: params.complianceResult,
        overall_status: params.overallStatus,
        violations_count: params.violationsCount,
        inspector_name: params.inspectorName || null,
        latitude: params.latitude || null,
        longitude: params.longitude || null,
        altitude: params.altitude || null,
        accuracy_meters: params.accuracyMeters || null,
        establishment_name: params.establishmentName || null,
        establishment_address: params.establishmentAddress || null,
        forensic_hash: params.forensicHash || null,
        verification_code: params.verificationCode || null,
        forensic_manifest: params.forensicManifest || null,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Supabase sync notice:', err);
    }
  }

  return localRecord;
}

/**
 * Retrieve scan by ID (checks SQLite, with Supabase fallback)
 */
export async function getUnifiedScanById(scanId: string, userId?: string): Promise<any | null> {
  const local = getScanById(scanId, userId);
  if (local) return local;

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scan_history')
        .select('*')
        .eq('id', scanId)
        .single();
      if (!error && data) {
        return {
          id: data.id,
          user_id: data.user_id,
          product_name: data.product_name,
          category: data.category,
          is_imported: data.is_imported ? 1 : 0,
          country_of_origin: data.country_of_origin,
          image_path: data.image_path,
          package_faces: typeof data.package_faces === 'string' ? data.package_faces : JSON.stringify(data.package_faces),
          raw_ocr_text: data.raw_ocr_text,
          extracted_data: typeof data.extracted_data === 'string' ? data.extracted_data : JSON.stringify(data.extracted_data),
          compliance_result: typeof data.compliance_result === 'string' ? data.compliance_result : JSON.stringify(data.compliance_result),
          overall_status: data.overall_status,
          violations_count: data.violations_count,
          inspector_name: data.inspector_name,
          created_at: data.created_at,
          latitude: data.latitude,
          longitude: data.longitude,
          establishment_name: data.establishment_name,
          establishment_address: data.establishment_address,
          forensic_hash: data.forensic_hash,
          verification_code: data.verification_code,
          forensic_manifest: data.forensic_manifest,
        };
      }
    } catch (err) {
      console.warn('Supabase getScanById error:', err);
    }
  }

  return null;
}

/**
 * Fetch genuine geospatial inspection points across retail centres for GIS mapping.
 * Strictly uses authentic officer device coordinates (latitude & longitude).
 * Excludes dummy/mock demonstration data and un-geocoded records.
 */
export async function getGeospatialInspections(): Promise<GeospatialInspectionPoint[]> {
  const points: GeospatialInspectionPoint[] = [];
  const coordCount = new Map<string, number>();

  // Helper to format authentic inspection points
  const processRow = (row: any, idx: number) => {
    // 1. Skip un-geocoded or invalid coordinates
    if (row.latitude == null || row.longitude == null) return;
    const lat = typeof row.latitude === 'number' ? row.latitude : parseFloat(row.latitude);
    const lng = typeof row.longitude === 'number' ? row.longitude : parseFloat(row.longitude);
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

    // 2. Reject known dummy/mock test scans
    const isOldTestDate = row.created_at && (row.created_at.startsWith('2026-09-05') || row.created_at.startsWith('2026-09-06'));
    const isDummyId = row.id && (row.id.startsWith('scn_') || row.id === 'wellcore-creatine-analysis');
    const isDummyName = row.product_name === 'Amrit Pure Cow Ghee 500ml' || row.product_name === 'kk';
    if (isOldTestDate || isDummyId || isDummyName) return;

    // 3. Extract compliance and violations
    let compliance: any = {};
    try {
      compliance = typeof row.compliance_result === 'string' ? JSON.parse(row.compliance_result) : (row.compliance_result || {});
    } catch {}

    const violations = Array.isArray(compliance.violations)
      ? compliance.violations.map((v: any) => ({
          rule_code: v.rule_code || 'PCR-GEN',
          title: v.violation_message || 'Statutory Non-Compliance',
        }))
      : [];

    // 4. Handle multiple inspections at the exact same physical coordinates
    // Micro-offset (~20m radial spread) so officers can view and click every scanned product without occlusion
    const coordKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const countAtLocation = coordCount.get(coordKey) || 0;
    coordCount.set(coordKey, countAtLocation + 1);

    let displayLat = lat;
    let displayLng = lng;
    if (countAtLocation > 0) {
      const angle = (countAtLocation * (2 * Math.PI)) / 6; // 6-way radial dispersion
      const offsetDeg = 0.00022; // ~22 meters
      displayLat = lat + Math.sin(angle) * offsetDeg;
      displayLng = lng + Math.cos(angle) * offsetDeg;
    }

    const brand = row.brand_name || compliance.brand || compliance.extractedData?.brand || 'Commercial Brand';
    const estName = row.establishment_name?.trim() || `Field Inspection Point #${idx + 1}`;
    const estAddress = row.establishment_address?.trim() || `GPS: ${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;

    points.push({
      id: row.id,
      productName: row.product_name || 'Packaged Commodity',
      brandName: brand,
      establishmentName: estName,
      establishmentAddress: estAddress,
      latitude: displayLat,
      longitude: displayLng,
      status: row.overall_status || 'NEEDS_REVIEW',
      violationsCount: row.violations_count != null ? row.violations_count : violations.length,
      violations,
      verificationCode: row.verification_code || `PRK-EVI-${row.id.slice(0, 8).toUpperCase()}`,
      createdAt: row.created_at,
    });
  };

  // Try Supabase first if configured
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('scan_history')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (data && data.length > 0) {
        data.forEach((row, idx) => processRow(row, idx));
        if (points.length > 0) return points;
      }
    } catch (err) {
      console.warn('Supabase geospatial query note:', err);
    }
  }

  // SQLite query for local database
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM scan_history 
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL 
      ORDER BY created_at DESC 
      LIMIT 200
    `).all() as ScanRecord[];

    rows.forEach((row, idx) => processRow(row, idx));
  } catch (err) {
    console.warn('SQLite geospatial query note:', err);
  }

  return points;
}

/**
 * Aggregate infractions to build the Recidivist Brand Index
 */
export async function getRecidivistBrandIndex(): Promise<RecidivistBrandEntry[]> {
  const points = await getGeospatialInspections();
  const brandMap = new Map<string, {
    violations: number;
    stores: Set<string>;
    rules: Set<string>;
    lastStore: string;
    lastTime: string;
  }>();

  points.forEach((p) => {
    if (p.status === 'NON_COMPLIANT' || p.violationsCount > 0) {
      const bName = p.brandName || p.productName || 'Unbranded Commodity';
      if (!brandMap.has(bName)) {
        brandMap.set(bName, {
          violations: 0,
          stores: new Set(),
          rules: new Set(),
          lastStore: p.establishmentName,
          lastTime: p.createdAt,
        });
      }

      const entry = brandMap.get(bName)!;
      entry.violations += Math.max(1, p.violationsCount);
      entry.stores.add(p.establishmentAddress || p.establishmentName);
      p.violations.forEach((v) => entry.rules.add(v.rule_code));
      if (new Date(p.createdAt) > new Date(entry.lastTime)) {
        entry.lastTime = p.createdAt;
        entry.lastStore = p.establishmentName;
      }
    }
  });

  const list: RecidivistBrandEntry[] = [];
  brandMap.forEach((val, brand) => {
    const distinctStoresCount = val.stores.size;
    let riskTier: RecidivistBrandEntry['riskTier'] = 'MONITORING';

    if (val.violations >= 3 && distinctStoresCount >= 2) {
      // Multiple infractions across distinct establishments triggers Section 36(2)
      riskTier = 'ESCALATED_SECTION_36_2';
    } else if (val.violations >= 2) {
      riskTier = 'WARNING';
    }

    list.push({
      brandName: brand,
      manufacturerName: `Packer / Entity for ${brand}`,
      totalViolations: val.violations,
      distinctStores: distinctStoresCount,
      riskTier,
      commonInfringements: Array.from(val.rules),
      lastStoreInspected: val.lastStore,
      lastViolatedAt: val.lastTime,
    });
  });

  return list.sort((a, b) => b.totalViolations - a.totalViolations);
}

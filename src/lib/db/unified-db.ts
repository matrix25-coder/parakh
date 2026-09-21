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
 * Fetch geospatial inspection points across retail centres for GIS mapping
 */
export async function getGeospatialInspections(): Promise<GeospatialInspectionPoint[]> {
  const points: GeospatialInspectionPoint[] = [];

  // Default demonstration hotspots across major retail hubs in Delhi-NCR / India
  const DEFAULT_CENTERS = [
    { name: 'Big Bazaar / Smart Bazaar', addr: 'Connaught Place, New Delhi', lat: 28.6315, lng: 77.2167 },
    { name: 'Reliance Fresh Superstore', addr: 'Lajpat Nagar Central Market, New Delhi', lat: 28.5700, lng: 77.2400 },
    { name: 'Nature Basket Gourmet Store', addr: 'Defence Colony Market, New Delhi', lat: 28.5733, lng: 77.2312 },
    { name: 'Blinkit Fulfillment Dark Store', addr: 'Okhla Industrial Area Phase II, Delhi', lat: 28.5284, lng: 77.2730 },
    { name: 'Zepto Quick-Commerce Hub', addr: 'Karol Bagh Retail Circle, New Delhi', lat: 28.6514, lng: 77.1907 },
    { name: 'Wholesale Provision Store', addr: 'Khari Baoli Spice Mandi, Old Delhi', lat: 28.6582, lng: 77.2219 },
    { name: 'Spencer Supermarket', addr: 'Cyber City, Sector 24, Gurugram', lat: 28.4950, lng: 77.0895 },
    { name: 'Metro Cash & Carry Wholesale', addr: 'Shahdara Industrial Area, East Delhi', lat: 28.6734, lng: 77.2882 },
  ];

  // Try Supabase first
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data } = await supabase
        .from('scan_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        data.forEach((row, idx) => {
          let compliance: any = {};
          try {
            compliance = typeof row.compliance_result === 'string' ? JSON.parse(row.compliance_result) : row.compliance_result;
          } catch {}

          const violations = Array.isArray(compliance.violations)
            ? compliance.violations.map((v: any) => ({ rule_code: v.rule_code, title: v.violation_message }))
            : [];

          const fallbackCenter = DEFAULT_CENTERS[idx % DEFAULT_CENTERS.length];
          const lat = row.latitude ? parseFloat(row.latitude) : fallbackCenter.lat + (Math.sin(idx) * 0.015);
          const lng = row.longitude ? parseFloat(row.longitude) : fallbackCenter.lng + (Math.cos(idx) * 0.015);

          points.push({
            id: row.id,
            productName: row.product_name,
            brandName: row.brand_name || 'Commercial Brand',
            establishmentName: row.establishment_name || fallbackCenter.name,
            establishmentAddress: row.establishment_address || fallbackCenter.addr,
            latitude: lat,
            longitude: lng,
            status: row.overall_status,
            violationsCount: row.violations_count || violations.length,
            violations,
            verificationCode: row.verification_code || `PRK-EVI-${row.id.slice(0, 6).toUpperCase()}`,
            createdAt: row.created_at,
          });
        });

        return points;
      }
    } catch (err) {
      console.warn('Supabase geospatial query note:', err);
    }
  }

  // SQLite fallback
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM scan_history ORDER BY created_at DESC LIMIT 50').all() as ScanRecord[];

    rows.forEach((row, idx) => {
      let compliance: any = {};
      try {
        compliance = JSON.parse(row.compliance_result);
      } catch {}

      const violations = Array.isArray(compliance.violations)
        ? compliance.violations.map((v: any) => ({ rule_code: v.rule_code, title: v.violation_message }))
        : [];

      const center = DEFAULT_CENTERS[idx % DEFAULT_CENTERS.length];
      const lat = center.lat + (Math.sin(idx * 2) * 0.012);
      const lng = center.lng + (Math.cos(idx * 2) * 0.012);

      points.push({
        id: row.id,
        productName: row.product_name,
        brandName: compliance.product_name || row.product_name,
        establishmentName: center.name,
        establishmentAddress: center.addr,
        latitude: lat,
        longitude: lng,
        status: row.overall_status,
        violationsCount: row.violations_count,
        violations,
        verificationCode: `PRK-EVI-${row.id.slice(0, 8).toUpperCase()}`,
        createdAt: row.created_at,
      });
    });
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

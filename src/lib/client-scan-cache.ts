'use client';

/**
 * Robust client-side cache and synchronization utility for Packaged Commodity scans.
 * Operates across SessionStorage, LocalStorage, and browser IndexedDB to ensure
 * data is never lost during Vercel serverless lambda rotations or cold starts.
 */

export interface CachedScanRecord {
  id: string;
  product_name: string;
  category: string;
  is_imported: boolean;
  country_of_origin: string;
  image_path?: string;
  package_faces?: Array<{ face: string; imagePath?: string; dataUrl?: string; name?: string }>;
  images?: Array<{ face: string; imagePath?: string; dataUrl?: string; name?: string }>;
  extractedData: any;
  complianceResult: any;
  overall_status: string;
  violations_count: number;
  inspector_name?: string;
  created_at?: string;
}

const DB_NAME = 'parakh_client_db';
const STORE_NAME = 'scans';
const DB_VERSION = 1;

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save scan to IndexedDB, SessionStorage, and LocalStorage.
 * Handles quota limits cleanly by degrading gracefully.
 */
export async function saveScanToClient(scan: CachedScanRecord): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Write full object (including images) to IndexedDB
  try {
    const db = await openIndexedDb();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(scan);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  } catch (err) {
    console.warn('[Cache] IndexedDB write failed:', err);
  }

  // 2. Write to SessionStorage (with fallback if images are huge)
  try {
    sessionStorage.setItem(`parakh_scan_${scan.id}`, JSON.stringify(scan));
    sessionStorage.setItem('parakh_latest_scan_id', scan.id);
    sessionStorage.setItem('parakh_latest_scan', JSON.stringify(scan));
  } catch {
    // If full object exceeds quota, store lightweight copy (strip large dataUrls)
    try {
      const lightScan = createLightweightScan(scan);
      sessionStorage.setItem(`parakh_scan_${scan.id}`, JSON.stringify(lightScan));
      sessionStorage.setItem('parakh_latest_scan', JSON.stringify(lightScan));
    } catch (e) {
      console.warn('[Cache] SessionStorage quota exceeded:', e);
    }
  }

  // 3. Write lightweight copy to LocalStorage for persistent recovery across tabs
  try {
    const lightScan = createLightweightScan(scan);
    localStorage.setItem(`parakh_scan_${scan.id}`, JSON.stringify(lightScan));
    localStorage.setItem('parakh_latest_scan_id', scan.id);
    localStorage.setItem('parakh_latest_scan', JSON.stringify(lightScan));
  } catch (e) {
    console.warn('[Cache] LocalStorage quota exceeded:', e);
  }
}

/**
 * Retrieve scan record by ID from IndexedDB, SessionStorage, or LocalStorage.
 */
export async function getScanFromClient(id: string): Promise<CachedScanRecord | null> {
  if (typeof window === 'undefined') return null;

  // 1. Try IndexedDB first (holds full images)
  try {
    const db = await openIndexedDb();
    if (db) {
      const record = await new Promise<CachedScanRecord | null>((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      });
      if (record) return record;
    }
  } catch (err) {
    console.warn('[Cache] IndexedDB read failed:', err);
  }

  // 2. Try SessionStorage
  try {
    const fromSession = sessionStorage.getItem(`parakh_scan_${id}`);
    if (fromSession) {
      return JSON.parse(fromSession);
    }
  } catch {}

  // 3. Try LocalStorage
  try {
    const fromLocal = localStorage.getItem(`parakh_scan_${id}`);
    if (fromLocal) {
      return JSON.parse(fromLocal);
    }
  } catch {}

  // 4. Try latest scan fallback if id is 'latest' or matches latest ID
  try {
    const latestId = sessionStorage.getItem('parakh_latest_scan_id') || localStorage.getItem('parakh_latest_scan_id');
    if (id === 'latest' || (latestId && latestId === id)) {
      const raw = sessionStorage.getItem('parakh_latest_scan') || localStorage.getItem('parakh_latest_scan');
      if (raw) return JSON.parse(raw);
    }
  } catch {}

  return null;
}

/**
 * Synchronize a client-cached scan record back to the server.
 * This re-hydrates the serverless lambda instance's database if it cold-started.
 */
export async function syncScanToServer(scan: CachedScanRecord): Promise<boolean> {
  if (typeof window === 'undefined' || !scan || !scan.id) return false;

  try {
    const res = await fetch(`/api/scan/${scan.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanRecord: scan }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Remove massive data URLs from scan object to create a compact ~15KB record
 * that safely fits within any browser storage quota.
 */
function createLightweightScan(scan: CachedScanRecord): CachedScanRecord {
  const light = { ...scan };
  if (light.package_faces) {
    light.package_faces = light.package_faces.map((f) => ({
      face: f.face,
      imagePath: f.imagePath?.startsWith('data:') ? undefined : f.imagePath,
      name: f.name,
    }));
  }
  if (light.images) {
    light.images = light.images.map((f) => ({
      face: f.face,
      imagePath: f.imagePath?.startsWith('data:') ? undefined : f.imagePath,
      name: f.name,
    }));
  }
  return light;
}

export interface StatutoryFieldRow {
  field_name: string;
  label: string;
  rule_ref: string;
  value: string;
  confidence: number;
  source_image: string;
  status: 'CONFIRMED' | 'REVIEW_REQUIRED' | 'MISSING';
}

/**
 * Pure deterministic conversion of extracted data into the 8 canonical FieldRows.
 */
export function buildStatutoryFieldRows(data: any): StatutoryFieldRow[] {
  const ext = data?.extractedData || {};
  const conf = ext.fieldConfidences || {};

  const mfgVal = ext.manufacturer
    ? `${ext.manufacturer}${ext.address && !ext.manufacturer.includes(ext.address) ? ', ' + ext.address : ''}`
    : '';
  const commVal = ext.commodityName || data?.product_name || ext.productName || '';
  const qtyVal = ext.netQuantity?.value !== undefined && ext.netQuantity?.value !== null
    ? String(ext.netQuantity.value)
    : (ext.netQuantity?.raw || '');
  const unitVal = ext.netQuantity?.unit || '';
  const mrpVal = ext.mrp?.raw || (ext.mrp?.value ? `₹ ${ext.mrp.value}` : '');
  const dateVal = ext.manufacturingDate?.formatted || ext.manufacturingDate?.raw || '';
  const originVal = ext.countryOfOrigin || (data?.is_imported ? 'Imported' : 'India');
  const ccVal = ext.consumerCare?.raw || (ext.consumerCare?.phone ? `Tel: ${ext.consumerCare.phone}` : (ext.consumerCare?.email || ''));

  return [
    {
      field_name: 'commodity_description',
      label: 'Generic or Common Name of Commodity',
      rule_ref: 'Rule 6(1)(b)',
      value: commVal,
      confidence: conf.commodity_description ?? (commVal ? 0.95 : 0.0),
      source_image: 'front_label.jpg',
      status: !commVal ? 'MISSING' : 'CONFIRMED',
    },
    {
      field_name: 'manufacturer_name',
      label: 'Manufacturer / Packer Name & Address',
      rule_ref: 'Rule 6(1)(a)',
      value: mfgVal,
      confidence: conf.manufacturer_name ?? (mfgVal ? 0.95 : 0.0),
      source_image: 'front_label.jpg',
      status: !mfgVal ? 'MISSING' : (conf.manufacturer_name && conf.manufacturer_name < 0.9 ? 'REVIEW_REQUIRED' : 'CONFIRMED'),
    },
    {
      field_name: 'net_quantity',
      label: 'Net Quantity Declaration',
      rule_ref: 'Rule 6(1)(c)',
      value: qtyVal,
      confidence: conf.net_quantity ?? (qtyVal ? 0.95 : 0.0),
      source_image: 'front_label.jpg',
      status: !qtyVal ? 'MISSING' : 'CONFIRMED',
    },
    {
      field_name: 'unit',
      label: 'Measurement Unit Symbol',
      rule_ref: 'Rule 12 & Sch. II',
      value: unitVal,
      confidence: conf.net_quantity ?? (unitVal ? 0.95 : 0.0),
      source_image: 'front_label.jpg',
      status: !unitVal ? 'MISSING' : 'CONFIRMED',
    },
    {
      field_name: 'mrp',
      label: 'Maximum Retail Price (MRP)',
      rule_ref: 'Rule 6(1)(e)',
      value: mrpVal,
      confidence: conf.mrp ?? (mrpVal ? 0.95 : 0.0),
      source_image: 'front_label.jpg',
      status: !mrpVal ? 'MISSING' : 'CONFIRMED',
    },
    {
      field_name: 'month_year',
      label: 'Month & Year of Manufacture / Packing',
      rule_ref: 'Rule 6(1)(d)',
      value: dateVal,
      confidence: conf.month_year ?? (dateVal ? 0.92 : 0.0),
      source_image: 'front_label.jpg',
      status: !dateVal ? 'MISSING' : 'CONFIRMED',
    },
    {
      field_name: 'consumer_care',
      label: 'Consumer Care / Grievance Redressal Contact',
      rule_ref: 'Rule 6(1)(f)',
      value: ccVal,
      confidence: conf.consumer_care ?? (ccVal ? 0.85 : 0.0),
      source_image: 'back_label.jpg',
      status: !ccVal ? 'MISSING' : ((conf.consumer_care && conf.consumer_care < 0.9) ? 'REVIEW_REQUIRED' : 'CONFIRMED'),
    },
    {
      field_name: 'country_of_origin',
      label: 'Country of Origin (Imported)',
      rule_ref: 'Rule 6(1)(da)',
      value: originVal,
      confidence: conf.country_of_origin ?? 0.99,
      source_image: 'front_label.jpg',
      status: 'CONFIRMED',
    },
  ];
}

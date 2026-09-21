import crypto from 'crypto';

/**
 * PARAKH Forensic Chain-of-Custody & Evidence Tamper-Proofing Engine
 * 
 * Adheres to:
 * - Section 63 of the Bharatiya Sakshya Adhiniyam (BSA), 2023
 * - (Formerly Section 65B of the Indian Evidence Act, 1872)
 * - ISO/IEC 27037: Guidelines for identification, collection, acquisition and preservation of digital evidence
 */

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracyMeters?: number | null;
}

export interface EnvironmentalTelemetry {
  coordinates?: GeoCoordinates | null;
  deviceFingerprint: string;
  inspectorId: string;
  inspectorName?: string;
  captureTimestamp: string;
  istTimestamp: string;
  networkCarrier?: string;
  platform: string;
}

export interface ForensicEvidenceManifest {
  manifestVersion: '1.0';
  evidenceId: string;
  rawImageSha256: string;
  telemetry: EnvironmentalTelemetry;
  signature: string; // HMAC-SHA256 cryptographic signature
  verificationCode: string; // e.g. "PRK-EVI-A49F2D81-2026"
  isTamperEvident: boolean;
  legalAdmissibilityCert: {
    statute: string;
    section: string;
    affidavitCertificateRequired: boolean;
    jurisdiction: string;
  };
}

/**
 * Compute SHA-256 hash directly on raw byte buffer or string
 */
export function computeBufferSha256(buffer: Buffer | Uint8Array | string): string {
  if (typeof buffer === 'string') {
    return crypto.createHash('sha256').update(buffer, 'utf8').digest('hex');
  }
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate cryptographic JWS manifest sealing raw image bytes and environmental telemetry
 */
export function generateEvidenceManifest(
  rawImageBuffer: Buffer | Uint8Array,
  telemetry: EnvironmentalTelemetry,
  signingSecret?: string
): ForensicEvidenceManifest {
  const secret = signingSecret || process.env.AUTH_SECRET || 'parakh_statutory_forensic_vault_key_2026';
  
  // 1. Calculate raw image SHA-256
  const rawImageSha256 = computeBufferSha256(rawImageBuffer);

  // 2. Generate unique evidence ID
  const evidenceId = `EVI-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

  // 3. Compact JWS-style payload to sign
  const payloadToSign = JSON.stringify({
    evidenceId,
    rawImageSha256,
    coordinates: telemetry.coordinates,
    deviceId: telemetry.deviceFingerprint,
    inspectorId: telemetry.inspectorId,
    timestamp: telemetry.captureTimestamp,
  });

  // 4. HMAC-SHA256 signature
  const signature = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');

  // 5. User-friendly verification code for display on physical notices & reports
  const shortHash = rawImageSha256.substring(0, 8).toUpperCase();
  const year = new Date().getFullYear();
  const verificationCode = `PRK-EVI-${shortHash}-${year}`;

  return {
    manifestVersion: '1.0',
    evidenceId,
    rawImageSha256,
    telemetry,
    signature,
    verificationCode,
    isTamperEvident: true,
    legalAdmissibilityCert: {
      statute: 'Bharatiya Sakshya Adhiniyam, 2023',
      section: 'Section 63 (Admissibility of Electronic Records in Evidence)',
      affidavitCertificateRequired: true,
      jurisdiction: 'Republic of India — Legal Metrology Court Proceedings',
    },
  };
}

/**
 * Verify integrity of stored image against recorded SHA-256 manifest
 */
export function verifyImageIntegrity(
  currentImageBuffer: Buffer | Uint8Array,
  manifest: ForensicEvidenceManifest,
  signingSecret?: string
): { isValid: boolean; reason: string } {
  const currentHash = computeBufferSha256(currentImageBuffer);
  
  if (currentHash !== manifest.rawImageSha256) {
    return {
      isValid: false,
      reason: `Cryptographic Mismatch: Image data has been altered. Expected SHA-256 ${manifest.rawImageSha256.slice(0, 12)}..., but found ${currentHash.slice(0, 12)}...`,
    };
  }

  // Verify HMAC signature
  const secret = signingSecret || process.env.AUTH_SECRET || 'parakh_statutory_forensic_vault_key_2026';
  const payloadToSign = JSON.stringify({
    evidenceId: manifest.evidenceId,
    rawImageSha256: manifest.rawImageSha256,
    coordinates: manifest.telemetry.coordinates,
    deviceId: manifest.telemetry.deviceFingerprint,
    inspectorId: manifest.telemetry.inspectorId,
    timestamp: manifest.telemetry.captureTimestamp,
  });

  const recomputedSig = crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');
  if (recomputedSig !== manifest.signature) {
    return {
      isValid: false,
      reason: 'Cryptographic Signature Invalid: The evidence manifest telemetry has been modified.',
    };
  }

  return {
    isValid: true,
    reason: 'Cryptographic verification successful: Image is bit-for-bit identical to the captured shutter state.',
  };
}

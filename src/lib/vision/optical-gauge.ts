/**
 * PARAKH AR Optical Calibration Gauge
 * 
 * Implements sub-millimeter font and numeral height verification to enforce
 * Rule 9 Table I of the Legal Metrology (Packaged Commodities) Rules, 2011.
 * 
 * Standard Calibration Reference Targets:
 * - Indian ₹5 Coin: Fixed diameter = 23.0 mm (radius = 11.5 mm)
 * - ISO/IEC 7810 ID-1 Card (Aadhaar / Debit / PAN / Driver License): 85.60 mm × 53.98 mm (Aspect Ratio ~ 1.5858)
 */

export type ReferenceTargetType = 'RS5_COIN' | 'ID1_CARD' | 'MANUAL_SCALE';

export interface ReferenceSpecification {
  type: ReferenceTargetType;
  name: string;
  nominalWidthMm: number;
  nominalHeightMm: number;
  nominalDiameterMm?: number;
  aspectRatio?: number;
  description: string;
}

export const REFERENCE_SPECS: Record<ReferenceTargetType, ReferenceSpecification> = {
  RS5_COIN: {
    type: 'RS5_COIN',
    name: 'Indian ₹5 Coin',
    nominalWidthMm: 23.0,
    nominalHeightMm: 23.0,
    nominalDiameterMm: 23.0,
    aspectRatio: 1.0,
    description: 'Standard 23.0 mm nickel-brass Indian Five Rupee circulation coin.',
  },
  ID1_CARD: {
    type: 'ID1_CARD',
    name: 'ISO/IEC 7810 ID-1 Card (Aadhaar / Debit Card)',
    nominalWidthMm: 85.60,
    nominalHeightMm: 53.98,
    aspectRatio: 85.60 / 53.98, // 1.5858
    description: 'Standard credit/debit or government photo ID card (85.60 mm × 53.98 mm).',
  },
  MANUAL_SCALE: {
    type: 'MANUAL_SCALE',
    name: 'Manual Optical Scale Reference',
    nominalWidthMm: 10.0,
    nominalHeightMm: 10.0,
    aspectRatio: 1.0,
    description: 'User-specified millimeter optical reference bar.',
  },
};

export interface Point2D {
  x: number;
  y: number;
}

export interface CalibrationResult {
  targetType: ReferenceTargetType;
  pixelsPerMm: number;
  confidenceScore: number; // 0.0 to 1.0
  aspectRatioVariance: number;
  perspectiveSkewDetected: boolean;
  calibrationTimestamp: string;
  notes: string[];
}

export interface MeasuredNumeral {
  field: string;
  label: string;
  pixelHeight: number;
  measuredHeightMm: number;
  requiredHeightMm: number;
  isCompliant: boolean;
  marginMm: number;
  confidence: number;
}

/**
 * Calibrate optical scale using Indian ₹5 Coin
 * @param diameterPixels Detected or caliper-marked coin diameter in image pixels
 * @param secondaryDiameterPixels Optional orthogonal diameter to detect elliptical perspective distortion
 */
export function calibrateFromCoin(
  diameterPixels: number,
  secondaryDiameterPixels?: number
): CalibrationResult {
  const spec = REFERENCE_SPECS.RS5_COIN;
  const nominalDiameter = spec.nominalDiameterMm!;
  
  if (diameterPixels <= 0) {
    throw new Error('Coin diameter in pixels must be greater than zero.');
  }

  let effectiveDiameter = diameterPixels;
  let eccentricity = 0;
  let perspectiveSkew = false;

  if (secondaryDiameterPixels && secondaryDiameterPixels > 0) {
    const major = Math.max(diameterPixels, secondaryDiameterPixels);
    const minor = Math.min(diameterPixels, secondaryDiameterPixels);
    eccentricity = Math.sqrt(1 - (minor * minor) / (major * major));
    effectiveDiameter = (diameterPixels + secondaryDiameterPixels) / 2;
    perspectiveSkew = eccentricity > 0.25; // Significant perspective tilt
  }

  const pixelsPerMm = effectiveDiameter / nominalDiameter;

  // Confidence formula: penalize extreme eccentricity or unrealistic scale factors
  let confidence = 0.95;
  const notes: string[] = [];

  if (perspectiveSkew) {
    confidence -= 0.15;
    notes.push('Perspective angle detected: camera not perpendicular to label plane.');
  } else {
    notes.push('Good coplanar focal alignment with reference coin.');
  }

  if (pixelsPerMm < 2.0) {
    confidence -= 0.2;
    notes.push('Low image resolution: less than 2 pixels per millimeter.');
  }

  return {
    targetType: 'RS5_COIN',
    pixelsPerMm: Math.round(pixelsPerMm * 1000) / 1000,
    confidenceScore: Math.max(0.4, Math.min(1.0, Math.round(confidence * 100) / 100)),
    aspectRatioVariance: Math.round(eccentricity * 100) / 100,
    perspectiveSkewDetected: perspectiveSkew,
    calibrationTimestamp: new Date().toISOString(),
    notes,
  };
}

/**
 * Calibrate optical scale using ISO/IEC 7810 ID-1 Card
 * @param widthPixels Detected card width in pixels
 * @param heightPixels Detected card height in pixels
 */
export function calibrateFromCard(
  widthPixels: number,
  heightPixels: number
): CalibrationResult {
  const spec = REFERENCE_SPECS.ID1_CARD;
  if (widthPixels <= 0 || heightPixels <= 0) {
    throw new Error('Card dimensions in pixels must be positive.');
  }

  const detectedRatio = widthPixels / heightPixels;
  const targetRatio = spec.aspectRatio!;
  const ratioDelta = Math.abs(detectedRatio - targetRatio);
  const ratioVariance = ratioDelta / targetRatio; // Percentage difference

  const pxPerMmW = widthPixels / spec.nominalWidthMm;
  const pxPerMmH = heightPixels / spec.nominalHeightMm;
  const avgPixelsPerMm = (pxPerMmW + pxPerMmH) / 2;

  let confidence = 0.98;
  const notes: string[] = [];
  const perspectiveSkew = ratioVariance > 0.08; // >8% aspect ratio divergence implies oblique tilt

  if (perspectiveSkew) {
    confidence -= Math.min(0.3, ratioVariance * 1.5);
    notes.push(`Perspective skew detected: aspect ratio delta ${(ratioVariance * 100).toFixed(1)}%.`);
  } else {
    notes.push('High fidelity aspect ratio match with ISO/IEC 7810 standard dimensions.');
  }

  return {
    targetType: 'ID1_CARD',
    pixelsPerMm: Math.round(avgPixelsPerMm * 1000) / 1000,
    confidenceScore: Math.max(0.4, Math.min(1.0, Math.round(confidence * 100) / 100)),
    aspectRatioVariance: Math.round(ratioVariance * 1000) / 1000,
    perspectiveSkewDetected: perspectiveSkew,
    calibrationTimestamp: new Date().toISOString(),
    notes,
  };
}

/**
 * Compute millimeter measurement for a detected text bounding box
 * @param pixelHeight Bounding box height or letter glyph height in pixels
 * @param pixelsPerMm Calibrated scale ratio
 * @param requiredHeightMm Minimum statutory height mandated under Rule 9 Table I
 * @param field Field name (e.g. 'mrp', 'net_quantity')
 * @param label Human-readable description
 */
export function measureNumeral(
  pixelHeight: number,
  calibration: CalibrationResult,
  requiredHeightMm: number,
  field: string = 'net_quantity',
  label: string = 'Net Quantity Numeral'
): MeasuredNumeral {
  if (calibration.pixelsPerMm <= 0) {
    throw new Error('Invalid calibration ratio.');
  }

  const measuredHeightMm = Math.round((pixelHeight / calibration.pixelsPerMm) * 100) / 100;
  const marginMm = Math.round((measuredHeightMm - requiredHeightMm) * 100) / 100;
  const isCompliant = measuredHeightMm >= requiredHeightMm;

  return {
    field,
    label,
    pixelHeight,
    measuredHeightMm,
    requiredHeightMm,
    isCompliant,
    marginMm,
    confidence: calibration.confidenceScore,
  };
}

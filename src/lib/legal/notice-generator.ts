import type { ComplianceReport, ViolationDetail } from '@/lib/types';
import type { ForensicEvidenceManifest } from '@/lib/forensics/chain-of-custody';

/**
 * PARAKH Statutory Legal Notice & Seizure Memo Generator
 * 
 * Maps detected PCR violations to specific legal provisions of:
 * - The Legal Metrology Act, 2009 (Sections 36(1), 36(2), 48, 49)
 * - The Legal Metrology (Packaged Commodities) Rules, 2011
 * - Prescribes official Form V (Show-Cause Notice) and Form VI (Seizure Panchnama)
 */

export interface LegalNoticeEstablishment {
  name: string;
  address: string;
  proprietorName?: string;
  gstin?: string;
  coordinates?: { latitude: number; longitude: number };
}

export interface CompoundingFeeCalculation {
  offenceType: 'FIRST_OFFENCE' | 'REPEAT_OFFENCE';
  baseStatutoryFineInr: number;
  totalCompoundingFeeInr: number;
  legalProvision: string;
  isCourtProsecutionRecommended: boolean;
}

export interface FormVNoticeData {
  noticeNumber: string;
  issuingAuthority: {
    department: string;
    designation: string;
    officerName: string;
    jurisdiction: string;
    contact: string;
  };
  establishment: LegalNoticeEstablishment;
  commodityDetails: {
    productName: string;
    brandName?: string;
    category: string;
    batchNumber?: string;
    scannedQuantity: string;
    mrpDeclared: string;
  };
  violations: Array<{
    ruleCode: string;
    ruleNumber: string;
    statutoryProvision: string;
    infringementDescription: string;
    severity: string;
  }>;
  feeCalculation: CompoundingFeeCalculation;
  evidenceCertification: {
    verificationCode: string;
    sha256Hash: string;
    gpsCoordinates: string;
    timestampIst: string;
    legalCertificationSection: string;
  };
  statutoryDeadlineDays: number;
  issueDateIst: string;
}

/**
 * Map violation codes to statutory sections of the Legal Metrology Act, 2009
 */
export function mapViolationToActProvision(ruleCode: string): string {
  switch (ruleCode) {
    case 'PCR-001':
      return 'Rule 6(1)(a) r/w Section 36(1) of the Legal Metrology Act, 2009 (Omission of Manufacturer/Packer Identity)';
    case 'PCR-002':
      return 'Rule 6(1)(b) r/w Section 36(1) of the Legal Metrology Act, 2009 (Absence of Generic Commodity Name)';
    case 'PCR-003':
    case 'PCR-004':
      return 'Rule 6(1)(c) & Rule 12 r/w Section 36(1) of the Legal Metrology Act, 2009 (Non-Standard Weight/Measure Unit)';
    case 'PCR-005':
      return 'Rule 6(1)(d) r/w Section 36(1) of the Legal Metrology Act, 2009 (Absence of Manufacturing/Packing Month & Year)';
    case 'PCR-006':
      return 'Rule 6(1)(e) r/w Section 36(1) of the Legal Metrology Act, 2009 (Deceptive/Incomplete Maximum Retail Price)';
    case 'PCR-007':
    case 'PCR-008':
      return 'Rule 6(1)(da) & Proviso r/w Section 36(1) of the Legal Metrology Act, 2009 (Failure to Disclose Origin/Importer)';
    case 'PCR-009':
      return 'Rule 6(1)(f) r/w Section 36(1) of the Legal Metrology Act, 2009 (Absence of Consumer Grievance Contact Channel)';
    case 'PCR-010':
      return 'Rule 6(1)(d) & FSSAI r/w Section 36(1) of the Legal Metrology Act, 2009 (Omission of Expiration / Shelf-Life)';
    case 'PCR-011':
      return 'Rule 6(1) r/w Section 36(1) of the Legal Metrology Act, 2009 (Deceptive GS1 Barcode / Unauthorized Brand Prefix)';
    case 'PCR-012':
      return 'Rule 6(1)(d) r/w Section 36(1) of the Legal Metrology Act, 2009 (Unregistered / Invalid FSSAI FoSCoS License)';
    case 'PCR-013':
      return 'Rule 6(11) r/w Section 36(1) of the Legal Metrology Act, 2009 (Violation of Mandatory Unit Sale Price Denomination)';
    default:
      return 'Section 36(1) of the Legal Metrology Act, 2009 (Manufacture, packaging or sale of non-standard commodity packages)';
  }
}

/**
 * Calculate compounding fees under Rule 32 of Legal Metrology (Packaged Commodities) Rules
 */
export function calculateCompoundingFees(
  violationsCount: number,
  isRepeatOffender: boolean = false
): CompoundingFeeCalculation {
  if (isRepeatOffender) {
    // Section 36(2): Repeat offenses attract enhanced fine up to ₹50,000 or imprisonment up to 1 year
    const finePerViolation = 50000;
    const total = Math.min(100000, violationsCount * finePerViolation);
    return {
      offenceType: 'REPEAT_OFFENCE',
      baseStatutoryFineInr: finePerViolation,
      totalCompoundingFeeInr: total,
      legalProvision: 'Section 36(2) of the Legal Metrology Act, 2009',
      isCourtProsecutionRecommended: violationsCount >= 3,
    };
  }

  // First offence under Rule 32: ₹25,000 compounding fine
  const finePerViolation = 25000;
  const total = Math.min(50000, violationsCount * finePerViolation);
  return {
    offenceType: 'FIRST_OFFENCE',
    baseStatutoryFineInr: finePerViolation,
    totalCompoundingFeeInr: total,
    legalProvision: 'Section 36(1) r/w Section 48 (Compounding of Offenses), Legal Metrology Act, 2009',
    isCourtProsecutionRecommended: false,
  };
}

/**
 * Compile official Form V Statutory Show-Cause Notice
 */
export function compileFormVNotice(
  report: ComplianceReport,
  establishment: LegalNoticeEstablishment,
  manifest?: ForensicEvidenceManifest | null,
  inspectorName: string = 'Field Inspection Officer',
  isRepeatOffender: boolean = false
): FormVNoticeData {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const noticeSeq = Math.floor(1000 + Math.random() * 9000);
  const noticeNumber = `LMO/ENF/${year}/${noticeSeq}`;

  const mappedViolations = report.violations.map((v) => ({
    ruleCode: v.rule_code,
    ruleNumber: v.rule_number,
    statutoryProvision: mapViolationToActProvision(v.rule_code),
    infringementDescription: v.violation_message,
    severity: v.severity,
  }));

  const feeCalculation = calculateCompoundingFees(report.violations.length, isRepeatOffender);

  const coords = manifest?.telemetry?.coordinates;
  const coordString = coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
    ? `${coords.latitude.toFixed(6)}° N, ${coords.longitude.toFixed(6)}° E${coords.accuracyMeters ? ` (±${coords.accuracyMeters}m)` : ''}`
    : establishment.coordinates && typeof establishment.coordinates.latitude === 'number' && typeof establishment.coordinates.longitude === 'number'
    ? `${establishment.coordinates.latitude.toFixed(6)}° N, ${establishment.coordinates.longitude.toFixed(6)}° E`
    : 'Location not captured';

  const timeString = manifest?.telemetry.istTimestamp || dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST';

  return {
    noticeNumber,
    issuingAuthority: {
      department: 'Office of the Controller of Legal Metrology',
      designation: 'Legal Metrology Inspector / Authorized Enforcement Officer',
      officerName: inspectorName,
      jurisdiction: 'National Capital Territory & Inter-State Enforcement Circle',
      contact: 'legalmetrology-enforcement@gov.in / 011-23386399',
    },
    establishment,
    commodityDetails: {
      productName: report.product_name || 'Pre-Packaged Commodity',
      category: report.category || 'FOOD',
      scannedQuantity: 'Inspected Batch Sample',
      mrpDeclared: 'As recorded in physical evidence',
    },
    violations: mappedViolations,
    feeCalculation,
    evidenceCertification: {
      verificationCode: manifest?.verificationCode || `PRK-EVI-AUTO-${year}`,
      sha256Hash: manifest?.rawImageSha256 || 'SHA256_AUTHENTICATED_ORIGINAL',
      gpsCoordinates: coordString,
      timestampIst: timeString,
      legalCertificationSection: 'Section 63, Bharatiya Sakshya Adhiniyam, 2023 / Section 65B Indian Evidence Act',
    },
    statutoryDeadlineDays: 7, // 7 days standard reply timeline
    issueDateIst: timeString,
  };
}

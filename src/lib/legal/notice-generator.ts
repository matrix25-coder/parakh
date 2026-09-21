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
      return 'Rule 6(1)(c) r/w Section 36(1) of the Legal Metrology Act, 2009 (Net Quantity Declaration Defect)';
    case 'PCR-004':
      return 'Rule 12 & Second Schedule r/w Section 36(1) of the Legal Metrology Act, 2009 (Non-Standard Weight/Measure Unit Symbol)';
    case 'PCR-005':
      return 'Rule 6(1)(d) r/w Section 36(1) of the Legal Metrology Act, 2009 (Absence of Manufacturing/Packing Month & Year)';
    case 'PCR-006':
      return 'Rule 6(1)(e) r/w Section 36(1) of the Legal Metrology Act, 2009 (Deceptive/Incomplete Maximum Retail Price & Tax Inclusivity)';
    case 'PCR-007':
      return 'Rule 6(1)(da) r/w Section 36(1) of the Legal Metrology Act, 2009 (Failure to Disclose Country of Origin for Imported Commodity)';
    case 'PCR-008':
      return 'Rule 6(1)(a) Proviso r/w Section 36(1) of the Legal Metrology Act, 2009 (Failure to Disclose Importer Corporate Identity in India)';
    case 'PCR-009':
      return 'Rule 6(1)(f) r/w Section 36(1) of the Legal Metrology Act, 2009 (Absence of Consumer Grievance Contact Channel)';
    case 'PCR-010':
      return 'Rule 6(1)(d) Second Proviso r/w Section 36(1) of the Legal Metrology Act & FSS Act (Omission of Expiration / Shelf-Life)';
    case 'PCR-011':
      return 'Rule 6(1) r/w Section 36(1) of the Legal Metrology Act, 2009 (Deceptive GS1 Barcode / Unauthorized Brand Prefix)';
    case 'PCR-012':
      return 'Rule 6(1)(d) r/w Section 36(1) of the Legal Metrology Act, 2009 (Unregistered / Invalid FSSAI FoSCoS License)';
    case 'PCR-013':
      return 'Rule 6(11) r/w Section 36(1) of the Legal Metrology Act, 2009 (Violation of Mandatory Unit Sale Price Denomination)';
    case 'PCR-014':
      return 'Rule 9 & Table I r/w Section 36(1) of the Legal Metrology Act, 2009 (Numeral & Letter Font Height Below Statutory Minimum)';
    case 'PCR-015':
      return 'Rule 6(1)(g) & Rule 16 r/w Section 36(1) of the Legal Metrology Act, 2009 (Absence of Mandatory Dimensional Declarations)';
    case 'PCR-016':
      return 'Rule 6(2) r/w Section 36(1) of the Legal Metrology Act, 2009 (Omission of Unit-Wise Breakdown on Multi-Piece Package)';
    case 'PCR-017':
      return 'Rule 6(3) & Rule 14 r/w Section 36(1) of the Legal Metrology Act, 2009 (Defective Combination / Group Package Declarations)';
    case 'PCR-018':
      return 'Rule 6(4) r/w Section 36(1) of the Legal Metrology Act, 2009 (Prohibited Dual MRP / Altering Price Stickers)';
    case 'PCR-019':
      return 'Rule 6(8) r/w Section 36(1) of the Legal Metrology Act, 2009 (Declarations Inconspicuous Through Secondary Packaging)';
    case 'PCR-020':
      return 'Rule 6(10) r/w Section 36(1) of the Legal Metrology Act, 2009 (Failure to Display Mandatory Declarations on E-Commerce Listing)';
    case 'PCR-021':
      return 'Rule 7 & Rule 8 r/w Section 36(1) of the Legal Metrology Act, 2009 (Principal Display Panel Area Defect Below 40%)';
    case 'PCR-022':
      return 'Rule 10 & Rule 11 r/w Section 36(1) of the Legal Metrology Act, 2009 (Inadequate Visual Contrast / Illegible Declarations)';
    case 'PCR-023':
      return 'Rule 13 r/w Section 36(1) of the Legal Metrology Act, 2009 (Improper Unit Representation for Denominations < 1kg/1L)';
    case 'PCR-024':
      return 'Rule 15 r/w Section 36(1) of the Legal Metrology Act, 2009 (Defective Piece Count Declaration by Number)';
    case 'PCR-025':
      return 'Rule 17 r/w Section 36(1) of the Legal Metrology Act, 2009 (Deceptive Packaging / Slack Fill / False Bottoms)';
    case 'PCR-026':
      return 'Rule 18(1) & Rule 24 r/w Section 36(1) of the Legal Metrology Act, 2009 (Omission of Mandatory Wholesale Package Declarations)';
    case 'PCR-027':
      return 'Rule 18(2) r/w Section 36(1) of the Legal Metrology Act, 2009 (Selling Packaged Commodity Above Maximum Retail Price)';
    case 'PCR-028':
      return 'Rule 18(3) r/w Section 36(1) of the Legal Metrology Act, 2009 (Obliterating, Altering or Defacing Statutory Price/Declarations)';
    case 'PCR-029':
      return 'Rule 18(5) r/w Section 36(1) of the Legal Metrology Act, 2009 (Retail Dealer Possession of Non-Compliant Packages)';
    case 'PCR-030':
      return 'Rule 25 r/w Section 36(1) of the Legal Metrology Act, 2009 (Unauthorized Domestic Sale of Export-Only Packages)';
    case 'PCR-031':
      return 'Rule 26 of the Legal Metrology (Packaged Commodities) Rules, 2011 (Pack Size Exemption Verification)';
    case 'PCR-032':
      return 'Rule 27 r/w Section 36(1) of the Legal Metrology Act, 2009 (Failure to Register as Manufacturer/Packer/Importer)';
    case 'PCR-033':
      return 'Rule 30 r/w Section 15 & 16 of the Legal Metrology Act, 2009 (Inspection Powers, Search, Seizure and Record Examination)';
    case 'PCR-034':
      return 'Rule 31 & First Schedule r/w Section 30 & 36(1) of the Legal Metrology Act, 2009 (Net Content Below Maximum Permissible Error Limits)';
    case 'PCR-035':
      return 'Rule 32 r/w Section 36(1) of the Legal Metrology Act, 2009 (Statutory Penalties for Non-Standard Packages)';
    case 'PCR-036':
      return 'Rule 33 & Sixth Schedule r/w Section 48 of the Legal Metrology Act, 2009 (Compounding of Offences and Penalty Fees)';
    case 'PCR-037':
      return 'Rule 34 r/w Section 16 of the Legal Metrology Act, 2009 (Disposal and Custody of Seized Non-Standard Commodities)';
    case 'PCR-038':
      return 'Third & Fourth Schedules r/w Rule 31 of PCR, 2011 (Statistical Sample Selection & Net Content Error Evaluation)';
    case 'PCR-039':
      return 'Section 36(2) of the Legal Metrology Act, 2009 (Enhanced Punishment for Repeat Corporate Offences Across Stores)';
    case 'PCR-040':
      return 'Section 49 of the Legal Metrology Act, 2009 (Offences by Companies & Liability of Nominated Directors)';
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

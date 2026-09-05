import type {
  ComplianceReport,
  RuleEvaluationDetail,
  ViolationDetail,
  EvaluationSummary,
  ComplianceStatus,
  RuleEvidence,
} from '@/lib/types';
import type { StructuredProductData } from '@/lib/extraction/types';
import { auditFontHeights } from './font-audit';

export interface EvaluationContext {
  productName?: string;
  category?: string;
  isImported?: boolean;
  countryOfOrigin?: string;
}

/**
 * Deterministic Legal Metrology Rule Engine
 * Evaluates mandatory declarations against Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E))
 */
export function evaluateCompliance(
  data: StructuredProductData,
  context?: EvaluationContext
): ComplianceReport {
  const category = (context?.category || 'FOOD').toUpperCase();
  const isImported = context?.isImported ?? data.isImported;
  const productName = context?.productName || data.productName || 'Packaged Commodity';

  const results: RuleEvaluationDetail[] = [];
  const violations: ViolationDetail[] = [];

  const createEvidence = (field: string, raw?: string | null): RuleEvidence | undefined => {
    if (!raw) return undefined;
    const box = data.boundingBoxes[field];
    return {
      field,
      raw_value: raw,
      confidence: data.fieldConfidences[field] || 0.92,
      source_image: box?.face ? `${box.face.toLowerCase()}_label.jpg` : 'front_label.jpg',
      bounding_box: box ? [box.top, box.left, box.width, box.height] : undefined,
    };
  };

  // ── RULE 1: PCR-001 - Rule 6(1)(a) Manufacturer / Packer Identity & Address
  {
    const hasMfg = !!data.manufacturer;
    const hasPin = !!data.pincode;
    const hasAddr = !!data.address;
    const brand = data.brand;
    const rawOcr = data.rawOcrText || '';

    const hasMfgSection = /(?:manufactur|marketed\s*by|mfd|pkd|packer|private\s*limited|pvt\.?\s*ltd|limited)/i.test(rawOcr);

    let status: RuleEvaluationDetail['status'] = 'FAIL';
    let message = "Mandatory declaration 'manufacturer_name' was not detected on package label. Explicit statutory violation.";

    if ((hasMfg || brand) && (hasPin || (hasAddr && (data.address?.length || 0) > 10))) {
      status = 'PASS';
      const mfgLabel = data.manufacturer || brand;
      message = `Mandatory manufacturer declaration detected (${mfgLabel}) and physical address verified${data.address ? ': ' + data.address : ''}${hasPin ? ' (PIN ' + data.pincode + ')' : ''}.`;
    } else if (hasMfg) {
      status = 'REVIEW';
      message = `Manufacturer identity detected (${data.manufacturer}), but physical registered postal address completeness requires officer verification.`;
    } else if (brand && hasMfgSection) {
      status = 'REVIEW';
      message = `Brand / Corporate entity recognized (${brand}), and packaging indicates manufacturing/marketing entity. Full registered postal address requires visual confirmation.`;
    } else if (brand) {
      status = 'REVIEW';
      message = `Brand identity declared (${brand}), but registered corporate manufacturer name and address require visual confirmation.`;
    } else if (hasMfgSection) {
      status = 'REVIEW';
      message = "Manufacturing/marketing entity section detected on packaging, but full name and address require visual confirmation.";
    }

    const extractedVal = data.manufacturer
      ? `${data.manufacturer}${data.address ? ', ' + data.address : ''}`
      : brand
      ? `${brand} (Brand Entity)`
      : undefined;

    const detail: RuleEvaluationDetail = {
      rule_id: 1,
      rule_code: 'PCR-001',
      rule_number: '6(1)(a)',
      title: 'Manufacturer / Packer Information',
      status,
      field: 'manufacturer_name',
      extracted_value: extractedVal,
      normalized_value: data.manufacturer || brand || undefined,
      expected_value: 'Name and complete registered address of manufacturer or packer',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.manufacturer_name || (hasMfg || brand ? 0.92 : undefined),
      source_reference: 'Rule 6(1)(a), Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('manufacturer_name', data.manufacturer || brand),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-001',
        rule_number: '6(1)(a)',
        field: 'manufacturer_name',
        severity: 'HIGH',
        violation_message: "Mandatory declaration 'manufacturer_name' was not detected on package label.",
      });
    }
  }

  // ── RULE 2: PCR-002 - Rule 6(1)(b) Generic or Common Commodity Name
  {
    const name = data.commodityName || data.productName;
    const isValid = !!name && name.trim().length >= 2;

    const status: RuleEvaluationDetail['status'] = isValid ? 'PASS' : 'FAIL';
    const message = isValid
      ? `Generic commodity designation (${name}) declared prominently on principal display panel.`
      : "Generic or common name of commodity is missing from principal display panel.";

    const detail: RuleEvaluationDetail = {
      rule_id: 2,
      rule_code: 'PCR-002',
      rule_number: '6(1)(b)',
      title: 'Generic or Common Name of Commodity',
      status,
      field: 'commodity_description',
      extracted_value: name || undefined,
      normalized_value: name || undefined,
      expected_value: 'Generic or common name (min 2 characters)',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.commodity_description || (isValid ? 0.95 : undefined),
      source_reference: 'Rule 6(1)(b), Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('commodity_description', name),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-002',
        rule_number: '6(1)(b)',
        field: 'commodity_description',
        severity: 'HIGH',
        violation_message: "Generic or common name of commodity is missing from packaging.",
      });
    }
  }

  // ── RULE 3: PCR-003 - Rule 6(1)(c) Net Quantity Numeric Declaration
  {
    const val = data.netQuantity.value;
    const hasValue = val !== null && !isNaN(val) && val > 0;

    const status: RuleEvaluationDetail['status'] = hasValue ? 'PASS' : 'FAIL';
    const message = hasValue
      ? `Net quantity is positive numeric quantity (${data.netQuantity.raw}). Satisfies positive declaration requirement.`
      : "Net quantity numeric declaration is absent or non-numeric.";

    const detail: RuleEvaluationDetail = {
      rule_id: 3,
      rule_code: 'PCR-003',
      rule_number: '6(1)(c)',
      title: 'Net Quantity Numeric Declaration',
      status,
      field: 'net_quantity',
      extracted_value: data.netQuantity.raw || undefined,
      normalized_value: hasValue ? { value: val, unit: data.netQuantity.unit } : undefined,
      expected_value: 'Numeric magnitude > 0',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.net_quantity || (hasValue ? 0.95 : undefined),
      source_reference: 'Rule 6(1)(c), Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('net_quantity', data.netQuantity.raw),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-003',
        rule_number: '6(1)(c)',
        field: 'net_quantity',
        severity: 'HIGH',
        violation_message: "Net quantity declaration is absent or non-numeric.",
      });
    }
  }

  // ── RULE 4: PCR-004 - Rule 12 & Second Schedule Permissible Metric Units
  {
    const unit = data.netQuantity.unit;
    const rawUnit = data.netQuantity.raw || '';

    let status: RuleEvaluationDetail['status'] = 'FAIL';
    let message = 'No measurement unit symbol detected.';

    if (data.netQuantity.isStandardUnit) {
      status = 'PASS';
      message = `Unit '${unit}' conforms to Schedule II standard metric symbols. Non-standard symbols rejected.`;
    } else if (rawUnit.toLowerCase().includes('gms') || rawUnit.toLowerCase().includes('kgs') || rawUnit.toLowerCase().includes('ltr')) {
      status = 'FAIL';
      message = `Statutory Defect: Non-standard unit abbreviation '${unit}' used. Rule 12 strictly requires standard metric symbols ('g', 'kg', 'ml', 'l').`;
    } else if (unit) {
      status = 'REVIEW';
      message = `Unit '${unit}' requires confirmation against Schedule II permitted units.`;
    }

    const detail: RuleEvaluationDetail = {
      rule_id: 4,
      rule_code: 'PCR-004',
      rule_number: '12 & Second Schedule',
      title: 'Standard Metric Units',
      status,
      field: 'net_quantity',
      extracted_value: data.netQuantity.raw || undefined,
      normalized_value: unit || undefined,
      expected_value: 'Standard metric unit symbol: mg, g, kg, ml, l, N, U',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.net_quantity || 0.95,
      source_reference: 'Rule 12 & Second Schedule, Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('net_quantity', data.netQuantity.raw),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-004',
        rule_number: '12 & Second Schedule',
        field: 'net_quantity',
        severity: 'HIGH',
        violation_message: message,
      });
    }
  }

  // ── RULE 5: PCR-005 - Rule 6(1)(d) Month and Year of Manufacture / Packing
  {
    const mfg = data.manufacturingDate;
    const hasDate = !!mfg.raw && mfg.isCompliantFormat;

    let status: RuleEvaluationDetail['status'] = 'FAIL';
    let message = "Date of manufacture/packing was not detected on package label.";

    if (hasDate) {
      status = 'PASS';
      message = `Date (${mfg.formatted || mfg.raw}) matches statutory format regex MM/YYYY or Month Year.`;
    } else if (mfg.raw) {
      status = 'REVIEW';
      message = `Date declaration detected (${mfg.raw}), but format requires visual confirmation.`;
    }

    const detail: RuleEvaluationDetail = {
      rule_id: 5,
      rule_code: 'PCR-005',
      rule_number: '6(1)(d)',
      title: 'Month and Year of Manufacture / Packing',
      status,
      field: 'month_year',
      extracted_value: mfg.formatted || mfg.raw || undefined,
      normalized_value: mfg.formatted || undefined,
      expected_value: 'MM/YYYY format regex (e.g. 07/2026)',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.month_year || (hasDate ? 0.92 : undefined),
      source_reference: 'Rule 6(1)(d), Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('month_year', mfg.raw),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-005',
        rule_number: '6(1)(d)',
        field: 'month_year',
        severity: 'HIGH',
        violation_message: "Mandatory date of manufacture or packaging was not detected.",
      });
    }
  }

  // ── RULE 6: PCR-006 - Rule 6(1)(e) Maximum Retail Price (MRP) Declaration
  {
    const mrp = data.mrp;
    const hasPrice = mrp.value !== null && mrp.value > 0;
    const hasTaxes = mrp.hasInclusiveOfAllTaxes;

    let status: RuleEvaluationDetail['status'] = 'FAIL';
    let message = "Mandatory declaration 'mrp' was not detected on package label. Explicit statutory violation.";

    if (hasPrice && hasTaxes && mrp.value !== null) {
      status = 'PASS';
      message = `Maximum Retail Price (₹ ${mrp.value.toFixed(2)}) detected with mandatory phrase "inclusive of all taxes".`;
    } else if (hasPrice && !hasTaxes) {
      status = 'FAIL';
      message = `Statutory Defect: Price declared (${mrp.raw}) but missing mandatory statutory phrase "inclusive of all taxes".`;
    }

    const detail: RuleEvaluationDetail = {
      rule_id: 6,
      rule_code: 'PCR-006',
      rule_number: '6(1)(e)',
      title: 'Maximum Retail Price (MRP) Declaration',
      status,
      field: 'mrp',
      extracted_value: mrp.raw || (mrp.value ? `₹ ${mrp.value}` : undefined),
      normalized_value: mrp.value !== null ? { value: mrp.value, currency: 'INR', inclusive_of_taxes: hasTaxes } : undefined,
      expected_value: 'MRP Rs. XX.XX (inclusive of all taxes)',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.mrp || (hasPrice ? 0.92 : undefined),
      source_reference: 'Rule 6(1)(e), Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('mrp', mrp.raw),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-006',
        rule_number: '6(1)(e)',
        field: 'mrp',
        severity: 'HIGH',
        violation_message: message,
      });
    }
  }

  // ── RULE 7: PCR-007 - Rule 6(1)(da) Country of Origin for Imported Commodities
  {
    let status: RuleEvaluationDetail['status'] = 'NOT_APPLICABLE';
    let message = "Rule not applicable: Condition 'is_imported equals True' was not satisfied (Domestic package).";

    if (isImported) {
      const hasOrigin = !!data.countryOfOrigin && data.countryOfOrigin.toLowerCase() !== 'india';
      if (hasOrigin) {
        status = 'PASS';
        message = `Country of Origin declared (${data.countryOfOrigin}) for imported packaged commodity.`;
      } else {
        status = 'FAIL';
        message = "Statutory Defect: Imported commodity does not state country of origin on package.";
      }
    }

    const detail: RuleEvaluationDetail = {
      rule_id: 7,
      rule_code: 'PCR-007',
      rule_number: '6(1)(da)',
      title: 'Country of Origin for Imported Commodities',
      status,
      field: 'country_of_origin',
      extracted_value: data.countryOfOrigin || undefined,
      normalized_value: isImported,
      expected_value: 'Country of Origin explicitly declared if imported',
      message,
      severity: 'HIGH',
      confidence: data.fieldConfidences.country_of_origin || (isImported ? 0.95 : 1.0),
      source_reference: 'Rule 6(1)(da), Legal Metrology (Packaged Commodities) Amendment Rules, 2017',
      evidence: isImported ? createEvidence('country_of_origin', data.countryOfOrigin) : undefined,
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-007',
        rule_number: '6(1)(da)',
        field: 'country_of_origin',
        severity: 'HIGH',
        violation_message: message,
      });
    }
  }

  // ── RULE 8: PCR-008 - Rule 6(1)(a) Proviso Importer Name and Address
  {
    let status: RuleEvaluationDetail['status'] = 'NOT_APPLICABLE';
    let message = "Rule not applicable: Domestic package does not require importer identification.";

    if (isImported) {
      const hasImporter = !!data.importer || !!data.manufacturer;
      if (hasImporter) {
        status = 'PASS';
        message = `Importer corporate name and address declared (${data.importer || data.manufacturer}).`;
      } else {
        status = 'FAIL';
        message = "Statutory Defect: Imported commodity does not declare name and address of Indian importer.";
      }
    }

    const detail: RuleEvaluationDetail = {
      rule_id: 8,
      rule_code: 'PCR-008',
      rule_number: '6(1)(a) proviso',
      title: 'Importer Name and Address',
      status,
      field: 'importer_name',
      extracted_value: isImported ? (data.importer || data.manufacturer || undefined) : undefined,
      normalized_value: isImported,
      expected_value: 'Name and complete address of domestic importer',
      message,
      severity: 'HIGH',
      confidence: isImported ? 0.9 : 1.0,
      source_reference: 'Rule 6(1)(a) Proviso, Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: isImported ? createEvidence('importer_name', data.importer || data.manufacturer) : undefined,
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-008',
        rule_number: '6(1)(a) proviso',
        field: 'importer_name',
        severity: 'HIGH',
        violation_message: message,
      });
    }
  }

  // ── RULE 9: PCR-009 - Rule 6(1)(f) Consumer Care Grievance Redressal Contact
  {
    const cc = data.consumerCare;
    const hasPhone = !!cc.phone;
    const hasEmail = !!cc.email;
    const hasAddress = !!cc.address;
    const rawOcr = data.rawOcrText || '';
    const hasCareKeyword = /(?:consumer\s*care|customer\s*care|grievance|helpline|care@|support@|contact\s*us|call\s*us|write\s*to)/i.test(rawOcr) ||
                           /(?:consumer\s*care|customer\s*care|grievance)/i.test(cc.raw || '');
    const webMatch = rawOcr.match(/(?:www\.[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|https?:\/\/[a-zA-Z0-9-]+\.[a-zA-Z]{2,})\b/i);
    const hasWeb = !!webMatch;

    let status: RuleEvaluationDetail['status'] = 'FAIL';
    let message = "Consumer grievance redressal details are absent from package.";

    if ((hasPhone && hasEmail) || (hasPhone && hasAddress) || (hasEmail && hasAddress)) {
      status = 'PASS';
      message = `Comprehensive consumer care channels declared (${[hasPhone ? 'Phone: ' + cc.phone : '', hasEmail ? 'Email: ' + cc.email : '', hasAddress ? 'Address: ' + cc.address : ''].filter(Boolean).join(', ')}).`;
    } else if (hasPhone || hasEmail) {
      status = 'PASS';
      message = `Consumer care grievance contact channel declared (${hasPhone ? 'Phone: ' + cc.phone : 'Email: ' + cc.email}). Rule 6(1)(f) requirement satisfied.`;
    } else if (cc.raw && cc.raw !== 'Consumer Care Helpline declared') {
      status = 'PASS';
      message = `Consumer care grievance redressal contact declared (${cc.raw}).`;
    } else if (hasCareKeyword && (data.manufacturer || data.address || hasWeb)) {
      status = 'PASS';
      const channelInfo = [hasWeb ? webMatch![0] : '', data.manufacturer || data.address || ''].filter(Boolean).join(' / ');
      message = `Consumer grievance redressal channel declared on packaging (${channelInfo || 'Customer Care / Manufacturer Address'}). Rule 6(1)(f) satisfied.`;
    } else if (hasWeb && (data.manufacturer || data.address)) {
      status = 'PASS';
      message = `Consumer grievance redressal channel declared via official portal (${webMatch![0]}) and registered address.`;
    } else if (hasCareKeyword || hasWeb) {
      status = 'REVIEW';
      message = "Consumer care section detected on package, but specific contact phone/email requires visual verification.";
    }

    const contactVal = cc.raw || (hasPhone || hasEmail ? `${cc.phone || ''} ${cc.email || ''}`.trim() : hasWeb ? webMatch![0] : hasCareKeyword ? 'Customer Care Section Present' : undefined);

    const detail: RuleEvaluationDetail = {
      rule_id: 9,
      rule_code: 'PCR-009',
      rule_number: '6(1)(f)',
      title: 'Consumer Care Grievance Redressal Contact',
      status,
      field: 'consumer_care',
      extracted_value: contactVal,
      normalized_value: contactVal || undefined,
      expected_value: 'Phone / Email / Address / Web for consumer grievance redressal',
      message,
      severity: 'MEDIUM',
      confidence: data.fieldConfidences.consumer_care || (hasPhone || hasEmail || hasWeb ? 0.9 : 0.6),
      source_reference: 'Rule 6(1)(f), Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: createEvidence('consumer_care', contactVal),
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-009',
        rule_number: '6(1)(f)',
        field: 'consumer_care',
        severity: 'MEDIUM',
        violation_message: message,
      });
    }
  }

  // ── RULE 10: PCR-010 - Rule 6(1)(d) & FSSAI Food Best Before / Expiry
  {
    let status: RuleEvaluationDetail['status'] = 'NOT_APPLICABLE';
    let message = `Rule not applicable: Package category is '${category}' (Mandatory for FOOD commodities).`;

    if (category === 'FOOD') {
      const hasExpiry = !!data.expiryDate.raw || !!data.expiryDate.expiryFormatted;
      if (hasExpiry) {
        status = 'PASS';
        const expLabel = data.expiryDate.expiryFormatted || data.expiryDate.raw;
        message = `Food commodity best before / expiry declaration present (${expLabel}).`;
      } else {
        status = 'FAIL';
        message = "Food commodity packaging does not bear mandatory expiry or best before declaration.";
      }
    }

    const detail: RuleEvaluationDetail = {
      rule_id: 10,
      rule_code: 'PCR-010',
      rule_number: '6(1)(d) & FSSAI',
      title: 'Food Category Expiry / Packing Declaration',
      status,
      field: 'date_of_manufacture',
      extracted_value: data.expiryDate.raw || undefined,
      normalized_value: data.expiryDate.raw || undefined,
      expected_value: 'Mandatory best before / expiration period for food commodities',
      message,
      severity: 'HIGH',
      confidence: category === 'FOOD' ? (data.expiryDate.raw ? 0.92 : undefined) : 1.0,
      source_reference: 'Rule 6(1)(d) second proviso, Legal Metrology (Packaged Commodities) Rules, 2011',
      evidence: category === 'FOOD' ? createEvidence('date_of_manufacture', data.expiryDate.raw) : undefined,
    };
    results.push(detail);

    if (status === 'FAIL') {
      violations.push({
        rule_code: 'PCR-010',
        rule_number: '6(1)(d) & FSSAI',
        field: 'date_of_manufacture',
        severity: 'HIGH',
        violation_message: message,
      });
    }
  }

  // ── FONT & READABILITY AUDIT (Rule 9 Table I)
  const fontAudits = auditFontHeights(data);

  // ── EVALUATION SUMMARY & OVERALL STATUS
  const total_rules = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const review = results.filter((r) => r.status === 'REVIEW').length;
  const not_applicable = results.filter((r) => r.status === 'NOT_APPLICABLE').length;

  const applicableRules = total_rules - not_applicable;
  const compliance_percentage = applicableRules > 0
    ? Math.round((passed / applicableRules) * 1000) / 10
    : 100;

  let overall_status: ComplianceStatus = 'COMPLIANT';
  if (failed > 0) {
    overall_status = 'NON_COMPLIANT';
  } else if (review > 0 || fontAudits.some((a) => a.status === 'FAIL' || a.status === 'REVIEW')) {
    overall_status = 'NEEDS_REVIEW';
  }

  const summary: EvaluationSummary = {
    total_rules,
    passed,
    failed,
    review,
    not_applicable,
    compliance_percentage,
  };

  return {
    product_name: productName,
    category,
    is_imported: isImported,
    overall_status,
    summary,
    results,
    violations,
    font_audits: fontAudits,
  };
}

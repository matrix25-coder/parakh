import type { FontReadabilityAudit } from '@/lib/types';
import type { StructuredProductData } from '@/lib/extraction/types';

/**
 * Compute Font & Readability Audit per Rule 9 Table I of Legal Metrology (Packaged Commodities) Rules, 2011
 */
export function auditFontHeights(data: StructuredProductData): FontReadabilityAudit[] {
  const qtyVal = data.netQuantity.value || 100;
  const unit = (data.netQuantity.unit || 'g').toLowerCase();

  // Standardize quantity magnitude to grams/ml
  let standardizedQty = qtyVal;
  if (unit === 'kg' || unit === 'l' || unit === 'ltr') {
    standardizedQty = qtyVal * 1000;
  }

  // Determine Table I minimum required numeral height in mm
  let requiredNumeralHeightMm = 2.0;
  let tableRuleText = 'Rule 9, Table I (Net qty 50g-200g req min 2.0mm)';

  if (standardizedQty <= 50) {
    requiredNumeralHeightMm = 1.0;
    tableRuleText = 'Rule 9, Table I (Net qty up to 50g req min 1.0mm)';
  } else if (standardizedQty <= 200) {
    requiredNumeralHeightMm = 2.0;
    tableRuleText = 'Rule 9, Table I (Net qty 50g-200g req min 2.0mm)';
  } else if (standardizedQty <= 1000) {
    requiredNumeralHeightMm = 4.0;
    tableRuleText = 'Rule 9, Table I (Net qty 200g-1kg req min 4.0mm)';
  } else {
    requiredNumeralHeightMm = 6.0;
    tableRuleText = 'Rule 9, Table I (Net qty > 1kg req min 6.0mm)';
  }

  const audits: FontReadabilityAudit[] = [
    {
      field: 'mrp',
      label: 'MRP Numeral Height',
      detected_height_mm: null,
      required_height_mm: 2.0,
      status: 'REVIEW',
      standard_rule: 'Rule 9(1) (Min 2.0mm; physical optical gauge verification required)',
    },
    {
      field: 'net_quantity',
      label: 'Net Quantity Numeral Height',
      detected_height_mm: null,
      required_height_mm: requiredNumeralHeightMm,
      status: 'REVIEW',
      standard_rule: tableRuleText,
    },
    {
      field: 'manufacturer_name',
      label: 'Packer Address Font Height',
      detected_height_mm: null,
      required_height_mm: 1.5,
      status: 'REVIEW',
      standard_rule: 'Rule 9(1) (Min 1.5mm for mandatory declarations; gauge verification required)',
    },
    {
      field: 'consumer_care',
      label: 'Consumer Care Readability',
      detected_height_mm: null,
      required_height_mm: 1.5,
      status: 'REVIEW',
      standard_rule: 'Rule 9(1) & Optical Contrast Ratio Guard',
    },
  ];

  return audits;
}

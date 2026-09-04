// Enums mapped directly from Legal Metrology Rule Engine
export type ComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
export type RuleStatus = 'PASS' | 'FAIL' | 'REVIEW' | 'NOT_APPLICABLE';
export type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
export type ValidationType =
  | 'REQUIRED'
  | 'NOT_EMPTY'
  | 'REGEX'
  | 'NUMERIC'
  | 'UNIT'
  | 'CONDITIONAL'
  | 'CONFIDENCE'
  | 'CATEGORY'
  | 'CUSTOM';
export type ProductCategory = 'GENERAL' | 'FOOD' | 'COSMETICS' | 'ELECTRONICS';
export type PackageFace = 'FRONT' | 'BACK' | 'SIDE' | 'TOP' | 'BOTTOM';

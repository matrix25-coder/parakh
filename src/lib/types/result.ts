import type { RuleStatus, Severity, ComplianceStatus } from './enums';

export interface RuleEvidence {
  field: string;
  raw_value?: string;
  normalized_value?: unknown;
  confidence?: number;
  source_image?: string;
  bounding_box?: number[] | Record<string, unknown>;
}

export interface FontReadabilityAudit {
  field: string;
  label: string;
  detected_height_mm: number | null;
  required_height_mm: number;
  status: 'PASS' | 'FAIL' | 'REVIEW';
  standard_rule: string;
}

export interface RuleEvaluationDetail {
  rule_id?: number;
  rule_code: string;
  rule_number: string;
  title: string;
  status: RuleStatus;
  field: string;
  extracted_value?: string;
  normalized_value?: unknown;
  expected_value?: string;
  message: string;
  severity: Severity;
  confidence?: number;
  source_reference?: string;
  evidence?: RuleEvidence;
}

export interface ViolationDetail {
  rule_code: string;
  rule_number: string;
  field: string;
  severity: Severity;
  violation_message: string;
  evidence?: RuleEvidence;
}

export interface EvaluationSummary {
  total_rules: number;
  passed: number;
  failed: number;
  review: number;
  not_applicable: number;
  compliance_percentage: number;
}

export interface ComplianceReport {
  scan_id?: number;
  product_name?: string;
  category?: string;
  is_imported: boolean;
  overall_status: ComplianceStatus;
  summary: EvaluationSummary;
  results: RuleEvaluationDetail[];
  violations: ViolationDetail[];
  font_audits?: FontReadabilityAudit[];
  usp_audit?: any;
  gs1_verification?: any;
  fssai_verification?: any;
  forensic_manifest?: any;
}


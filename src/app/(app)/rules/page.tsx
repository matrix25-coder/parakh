'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageHeader, SeverityBadge } from '@/components/ui';

export interface RuleDef {
  code: string;
  section: string;
  chapter: string;
  title: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'RULE_6' | 'METRIC_FONT' | 'PACKAGING' | 'RETAIL' | 'EXEMPTIONS_REG' | 'ENFORCEMENT';
  categoryLabel: string;
  actSection: string;
  statutoryDescription: string;
  validationLogic: string;
  inspectionMethod: string;
  penaltyProvision: string;
}

export const STATUTORY_RULES: RuleDef[] = [
  // ── CHAPTER II: MANDATORY DECLARATIONS (RULE 6) ──────────────────────────
  {
    code: 'PCR-001',
    section: 'Rule 6(1)(a)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Manufacturer / Packer / Importer Identity & Address',
    type: 'MandatoryPresenceValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Every pre-packaged commodity must bear the name and complete physical address of the manufacturer, or where manufacturer is not the packer, the packer thereof, including complete registered postal PIN code.',
    validationLogic: 'Verifies presence of manufacturer/packer entity name, physical street address, and valid 6-digit postal PIN code.',
    inspectionMethod: 'Automated Vision AI OCR + Postal Directory Validation',
    penaltyProvision: 'Fine up to ₹25,000 (1st offence), ₹50,000 (2nd offence), up to ₹1,00,000 or 1 yr imprisonment (Subsequent)',
  },
  {
    code: 'PCR-002',
    section: 'Rule 6(1)(b)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Generic or Common Name of Commodity',
    type: 'CommodityNameValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'The common or generic name of the commodity contained in the package must be prominently declared on the principal display panel.',
    validationLogic: 'Checks for prominent generic commodity classification (minimum 2 characters, non-trademarked terminology).',
    inspectionMethod: 'Vision AI OCR classification against Central Commodity Master Dictionary',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-003',
    section: 'Rule 6(1)(c)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Net Quantity Declaration in Metric Units',
    type: 'NetQuantityValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'The net quantity in terms of standard unit of weight or measure, or number of commodity contained in the package, must be unequivocally declared on the principal display panel.',
    validationLogic: 'Validates quantity magnitude and unit pairing against Table I statutory permissible dimensions.',
    inspectionMethod: 'Vision AI OCR + Gravimetric/Volumetric Physical Test under Fourth Schedule',
    penaltyProvision: 'Fine up to ₹25,000 (1st), ₹50,000 (2nd), ₹1,00,000 or 1 yr imprisonment (Subsequent)',
  },
  {
    code: 'PCR-004',
    section: 'Rule 12 & Second Schedule',
    chapter: 'Chapter II: Units of Measurement',
    title: 'Permissible Metric Symbols & Unit Grammar',
    type: 'UnitGrammarValidator',
    severity: 'HIGH',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'No non-metric unit or non-standard abbreviation (such as gms, kgs, ltrs, ml.) shall appear in conjunction with statutory quantity declarations.',
    validationLogic: 'Strict regex whitelist: g, kg, ml, l, m, cm, mm, N, U. Rejects "gms", "kgs", "ltrs", "ml.", etc.',
    inspectionMethod: 'Deterministic RegEx Lexical Parser',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-005',
    section: 'Rule 6(1)(d)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Month and Year of Manufacture or Packaging',
    type: 'DateValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'The month and year in which the commodity is manufactured or pre-packed or imported must be clearly declared on every package.',
    validationLogic: 'Validates two-digit month and two-digit or four-digit year format (MM/YYYY or Month Year). Rejects future dates.',
    inspectionMethod: 'Chronological Vision AI Parser against NTP atomic clock',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-006',
    section: 'Rule 6(1)(e)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Maximum Retail Price (MRP) & Tax Inclusivity',
    type: 'MRPValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Retail sale price of package must be declared as Maximum Retail Price (MRP) Rs. / ₹ ... inclusive of all taxes.',
    validationLogic: 'Detects MRP currency notation and strictly enforces mandatory statutory phrase "incl. of all taxes" or "inclusive of all taxes".',
    inspectionMethod: 'Vision AI OCR + Lexical Tax Phrase Evaluator',
    penaltyProvision: 'Fine up to ₹25,000 (1st offence), ₹50,000 (2nd offence)',
  },
  {
    code: 'PCR-007',
    section: 'Rule 6(1)(da)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Country of Origin for Imported Commodities',
    type: 'CountryOfOriginValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'For pre-packaged commodities imported from abroad, the name of the country of origin or manufacture or assembly must be stated explicitly.',
    validationLogic: 'If is_imported=True, validates declared nation against ISO-3166 country registries.',
    inspectionMethod: 'Vision AI OCR + ISO-3166 Standard Registry Cross-Check',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-008',
    section: 'Rule 6(1)(a) Proviso',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Importer Identity & Address for Imported Goods',
    type: 'ImporterPresenceValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'For imported goods, the name and complete corporate address of the importer in India must be prominently declared.',
    validationLogic: 'Verifies Indian corporate registration, importer identity, and physical jurisdictional address.',
    inspectionMethod: 'Corporate Registry Cross-Check + Vision AI OCR',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-009',
    section: 'Rule 6(1)(f)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Consumer Care Grievance Redressal Mechanism',
    type: 'CompositeValidator',
    severity: 'MEDIUM',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'The name, address, telephone number and electronic mail address of the person or office that can be contacted in case of consumer complaints.',
    validationLogic: 'Composite audit: checks at least two distinct communication channels (active phone/toll-free + verified email address / web portal).',
    inspectionMethod: 'Vision AI OCR Multi-Channel Contact Extractor',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-010',
    section: 'Rule 6(1)(d) Second Proviso',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Food Category Expiration / Best Before Date',
    type: 'CategorySpecificValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act & FSS Act, 2006',
    statutoryDescription: 'Packages of food commodities which may become unfit for human consumption must bear date of packaging and best before or use by date.',
    validationLogic: 'Mandatory for food categories. Verifies chronological alignment between packing date and shelf-life expiration duration.',
    inspectionMethod: 'Vision AI Expiry Classifier + FSSAI Packaging Norms',
    penaltyProvision: 'Fine up to ₹25,000 under LM Act + FSSAI Seizure Powers',
  },
  {
    code: 'PCR-011',
    section: 'Rule 6(1) & GS1 Standard',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'GS1 Barcode Prefix & Brand Owner Integrity',
    type: 'RegistryCrossValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Retail barcodes must bear valid GS1 standard checksums and prefix allocations matching the declared corporate entity to counter deceptive packaging and counterfeits.',
    validationLogic: 'Computes Modulo-10 checksum on GTIN-13/UPC and queries GS1 GEPIR master catalog for registered brand owner and declared catalog weight.',
    inspectionMethod: 'ZBar/ZXing Barcode Decoder + GS1 GEPIR Master API',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-012',
    section: 'Rule 6(1)(d) & FSSAI Act',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'FSSAI FoSCoS 14-Digit Food Safety License',
    type: 'LicenseValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of LM Act & Section 31 of FSS Act, 2006',
    statutoryDescription: 'Food packages must bear an active, verified 14-digit FSSAI License/Registration number issued to the manufacturer or packer.',
    validationLogic: 'Validates 14-digit license structure, state code allocation (digits 2-3), and verifies active license status against FoSCoS database records.',
    inspectionMethod: 'FSSAI FoSCoS Registry API Verification',
    penaltyProvision: 'Fine up to ₹25,000 under LM Act; Section 63 FSS Act penalty up to ₹5,00,000',
  },
  {
    code: 'PCR-013',
    section: 'Rule 6(11)',
    chapter: 'Chapter II: Retail Sale Declarations',
    title: 'Mandatory Unit Sale Price (USP) Compliance',
    type: 'ShrinkflationValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Pre-packaged commodities containing more than one unit or specified weight/volume must prominently declare the Unit Sale Price in statutory base units (per 1g/100g/1kg, 1ml/100ml/1L, 1 number) rounded off to two decimal places.',
    validationLogic: 'Computes USP = MRP / Normalized Quantity rounded to 2 decimal places, and flags non-standard base units or arithmetic divergence >2%.',
    inspectionMethod: 'Automated Arithmetic Verification against Central Price Index',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-014',
    section: 'Rule 9 & Table I',
    chapter: 'Chapter II: Manner of Declaration',
    title: 'Minimum Height of Numerals and Letters (Table I)',
    type: 'OpticalGaugeValidator',
    severity: 'HIGH',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Height of any numeral and letter in statutory declarations must not be less than the minimum height specified in Table I based on the area of the principal display panel (1.0mm to 6.0mm).',
    validationLogic: 'Measures numeral height in millimeters using optical pixel-to-millimeter ratio calibrated against coin or ID-1 card reference reticle.',
    inspectionMethod: 'AR Optical Vernier Caliper Gauge with Sub-Millimeter Scale',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-015',
    section: 'Rule 6(1)(g) & Rule 16',
    chapter: 'Chapter II: Dimensional Declarations',
    title: 'Declaration of Dimensions (Length, Width, Area, Size)',
    type: 'DimensionalValidator',
    severity: 'MEDIUM',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'For commodities like bedsheets, apparel, textiles, tiles, paper rolls or sheets, dimensions must be declared in metric units (cm or m) along with piece count.',
    validationLogic: 'Verifies length x width format (e.g. 228 cm x 274 cm) and standard size descriptors.',
    inspectionMethod: 'Vision AI OCR + Dimensional Format Parser',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-016',
    section: 'Rule 6(2)',
    chapter: 'Chapter II: Multi-Piece Packages',
    title: 'Multi-Piece Packages of Differing Sizes or Specifications',
    type: 'MultiPieceValidator',
    severity: 'MEDIUM',
    category: 'PACKAGING',
    categoryLabel: 'Packaging & Deceptive Practices',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Where a package contains pieces of different sizes, dimensions or weights, the quantity of each distinct size or dimension must be stated separately on the principal display panel.',
    validationLogic: 'Checks for individual unit quantity breakdown when package indicates assortment or multi-item contents.',
    inspectionMethod: 'Vision AI Breakdown Parser',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-017',
    section: 'Rule 6(3) & Rule 14',
    chapter: 'Chapter II: Combination & Group Packages',
    title: 'Combination Packages, Group Packages & Gift Packs',
    type: 'CombinationPackValidator',
    severity: 'MEDIUM',
    category: 'PACKAGING',
    categoryLabel: 'Packaging & Deceptive Practices',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Combination packages containing dissimilar commodities (e.g. shaving kit, festive combo) must declare net quantity, MRP and details of each commodity contained therein.',
    validationLogic: 'Validates itemized net quantity and total combined MRP on multi-commodity combos.',
    inspectionMethod: 'Multi-Commodity Evidence Extractor',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-018',
    section: 'Rule 6(4)',
    chapter: 'Chapter II: Non-Deceptive Pricing',
    title: 'Prohibition of Dual MRP & Altering Price Stickers',
    type: 'TamperStickerValidator',
    severity: 'HIGH',
    category: 'PACKAGING',
    categoryLabel: 'Packaging & Deceptive Practices',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'No manufacturer, packer, or distributor shall alter, smudge, overwrite or affix stickers to increase the Maximum Retail Price (Dual MRP prohibition).',
    validationLogic: 'Optical surface analysis detects sticker overlays, dual price prints, and altered price zones.',
    inspectionMethod: 'Optical Layer Analysis + Texture Edge Inconsistency Detection',
    penaltyProvision: 'Fine up to ₹25,000 (1st offence), ₹50,000 (2nd offence)',
  },
  {
    code: 'PCR-019',
    section: 'Rule 6(8)',
    chapter: 'Chapter II: Secondary Packaging',
    title: 'Declarations on Secondary Packaging & Transparent Wrappers',
    type: 'OuterWrapperValidator',
    severity: 'LOW',
    category: 'PACKAGING',
    categoryLabel: 'Packaging & Deceptive Practices',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Where individual packages are enclosed inside an outer wrapper, declarations must either be clearly visible through transparent wrapping or repeated on the outer wrapper.',
    validationLogic: 'Verifies external readability of all Rule 6 statutory declarations through secondary packaging.',
    inspectionMethod: 'Officer Visual Verification / Transparent Wrapper Contrast Check',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-020',
    section: 'Rule 6(10)',
    chapter: 'Chapter II: E-Commerce Regulations',
    title: 'E-Commerce Marketplace Digital Product Display',
    type: 'ECommerceValidator',
    severity: 'HIGH',
    category: 'RULE_6',
    categoryLabel: 'Mandatory Declarations',
    actSection: 'Section 36(1) of Legal Metrology Act & Consumer Protection E-Commerce Rules',
    statutoryDescription: 'E-commerce marketplace entities must display all mandatory packaging declarations (manufacturer, country of origin, net qty, MRP, USP, expiry) on digital product pages.',
    validationLogic: 'Scrapes and verifies marketplace product metadata against physical package OCR records.',
    inspectionMethod: 'Automated E-Commerce Metadata Crawler & Audit',
    penaltyProvision: 'Notice issued under Rule 6(10) with fine up to ₹25,000 per listing',
  },
  {
    code: 'PCR-021',
    section: 'Rule 7 & Rule 8',
    chapter: 'Chapter II: Principal Display Panel',
    title: 'Principal Display Panel (PDP) Minimum Area (40%) & Grouping',
    type: 'PDPGeometryValidator',
    severity: 'MEDIUM',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Principal display panel must occupy at least 40% of the total surface area for cylindrical or irregular packages, or one full face for rectangular packages, with declarations grouped cleanly.',
    validationLogic: 'Calculates package facet aspect ratios and ensures net quantity and MRP appear grouped on the principal panel.',
    inspectionMethod: '3D Geometric Package Mesh Analysis',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-022',
    section: 'Rule 10 & Rule 11',
    chapter: 'Chapter II: Manner of Declaration',
    title: 'Prominence, Conspicuous Contrast & Legibility',
    type: 'LegibilityValidator',
    severity: 'MEDIUM',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Declarations on package must be legible, prominent, and in conspicuous contrast with the background color to ensure consumer clarity.',
    validationLogic: 'Evaluates WCAG contrast ratio (>4.5:1) between statutory text strokes and background packaging color.',
    inspectionMethod: 'Computer Vision Color Contrast & Luminance Analyzer',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-023',
    section: 'Rule 13',
    chapter: 'Chapter II: Units of Measurement',
    title: 'Statement of Units for Denominations Less Than 1 kg / 1 L',
    type: 'DenominationValidator',
    severity: 'MEDIUM',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Quantities less than 1 kg must be stated in grams (g), less than 1 g in milligrams (mg), less than 1 litre in millilitres (ml). Decimals under 1 kg/L must not be used where integer sub-units apply.',
    validationLogic: 'Flags non-standard decimal expressions (e.g. 0.5 kg must be 500 g; 0.25 L must be 250 ml).',
    inspectionMethod: 'Lexical Denomination Normalizer',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-024',
    section: 'Rule 15',
    chapter: 'Chapter II: Sale by Number',
    title: 'Declaration of Quantity by Number (Piece Count)',
    type: 'CountValidator',
    severity: 'LOW',
    category: 'METRIC_FONT',
    categoryLabel: 'Metric & Font Standards',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Where a commodity is packed and sold by number, the declaration must state the net quantity in words and numbers (e.g. 10 N or 10 Units), not merely arbitrary descriptive terms.',
    validationLogic: 'Checks for standard numeric count notation accompanied by N, U, or "Units/Pieces".',
    inspectionMethod: 'Regex Unit Count Parser',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-025',
    section: 'Rule 17',
    chapter: 'Chapter II: Deceptive Packaging',
    title: 'Prohibition of Deceptive Packaging & Slack Fill',
    type: 'DeceptivePackagingValidator',
    severity: 'HIGH',
    category: 'PACKAGING',
    categoryLabel: 'Packaging & Deceptive Practices',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Packages shall not be designed or constructed with false bottoms, sidewalls, misleading shapes, or excessive headspace (slack fill) that exaggerates the true volume of contents.',
    validationLogic: 'Measures packaging volume vs net content volumetric displacement. Flags excessive headspace exceeding statutory maximums.',
    inspectionMethod: 'Headspace Volumetric Analysis & X-ray / Acoustic Fill Gauge',
    penaltyProvision: 'Fine up to ₹25,000 (1st offence), ₹50,000 (2nd offence)',
  },
  {
    code: 'PCR-026',
    section: 'Rule 18(1) & Rule 24',
    chapter: 'Chapter III: Wholesale Packages',
    title: 'Wholesale Package Mandatory Declarations & Bulk Labeling',
    type: 'WholesaleValidator',
    severity: 'MEDIUM',
    category: 'RETAIL',
    categoryLabel: 'Retail & Wholesale Enforcement',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Every wholesale package must bear name/address of manufacturer/packer, net quantity of commodity in metric units, and total number of retail packages contained therein.',
    validationLogic: 'Validates wholesale package bulk carton labels for mandatory piece count and total net mass.',
    inspectionMethod: 'Bulk Outer Carton OCR Verification',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-027',
    section: 'Rule 18(2)',
    chapter: 'Chapter II: Retail Dealer Obligations',
    title: 'Prohibition on Selling Above Maximum Retail Price (MRP Overcharging)',
    type: 'OverchargingValidator',
    severity: 'HIGH',
    category: 'RETAIL',
    categoryLabel: 'Retail & Wholesale Enforcement',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'No retail dealer or person shall sell any pre-packaged commodity at a price higher than the Maximum Retail Price declared on the package.',
    validationLogic: 'Compares billed point-of-sale invoice price against printed package MRP.',
    inspectionMethod: 'Retail Receipt Cross-Verification & Mystery Audit',
    penaltyProvision: 'Fine up to ₹25,000 (1st offence), ₹50,000 (2nd offence)',
  },
  {
    code: 'PCR-028',
    section: 'Rule 18(3)',
    chapter: 'Chapter II: Retail Dealer Obligations',
    title: 'Prohibition on Obliterating or Defacing Declarations by Retailers',
    type: 'DefacementValidator',
    severity: 'HIGH',
    category: 'RETAIL',
    categoryLabel: 'Retail & Wholesale Enforcement',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'No person shall obliterate, smudge, alter or deface any declaration made on a package, nor shall any person sell a package whose declarations have been defaced.',
    validationLogic: 'Surface inspection detects ink removal, markers, scratch-offs, or partial cover stickers.',
    inspectionMethod: 'Visual Surface Integrity Inspection',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-029',
    section: 'Rule 18(5)',
    chapter: 'Chapter II: Retail Dealer Obligations',
    title: 'Retail Dealer Liability for Possessing Non-Compliant Packages',
    type: 'DealerLiabilityValidator',
    severity: 'HIGH',
    category: 'RETAIL',
    categoryLabel: 'Retail & Wholesale Enforcement',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Every retail dealer who receives or has in possession for sale any pre-packaged commodity that violates any declaration rule is liable as an offender under the Act.',
    validationLogic: 'Associates retail store license and GPS location with non-compliant product shelf samples.',
    inspectionMethod: 'On-Site Field Inspection Record & Chain of Custody',
    penaltyProvision: 'Fine up to ₹25,000 per inspection under Section 36(1)',
  },
  {
    code: 'PCR-030',
    section: 'Rule 25',
    chapter: 'Chapter IV: Export and Import',
    title: 'Prohibition on Selling Export Packages in Domestic Territory',
    type: 'ExportPackageValidator',
    severity: 'MEDIUM',
    category: 'EXEMPTIONS_REG',
    categoryLabel: 'Exemptions & Registration',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Packages intended solely for export abroad shall not be sold or distributed in the Indian domestic retail market without complete statutory PCR compliance.',
    validationLogic: 'Detects "FOR EXPORT ONLY" markings and verifies presence of Indian statutory MRP and USP.',
    inspectionMethod: 'Vision AI Export Label Detection',
    penaltyProvision: 'Seizure of goods and fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-031',
    section: 'Rule 26',
    chapter: 'Chapter II: Statutory Exemptions',
    title: 'Statutory Pack Size Exemptions Audit (<=10g / <=10ml / >25kg)',
    type: 'ExemptionValidator',
    severity: 'LOW',
    category: 'EXEMPTIONS_REG',
    categoryLabel: 'Exemptions & Registration',
    actSection: 'Rule 26 of PCR, 2011',
    statutoryDescription: 'Exempts retail packages containing net quantity of 10g/10ml or less (except tobacco), packages above 25kg/25L (except cement/fertilizer), and direct industrial/institutional consumers from retail declaration rules.',
    validationLogic: 'Checks whether product qualifies for statutory threshold exemptions, automatically bypassing non-applicable rules.',
    inspectionMethod: 'Deterministic Net Quantity Threshold Evaluation',
    penaltyProvision: 'Statutory Exemption (No Penalty if within scope)',
  },
  {
    code: 'PCR-032',
    section: 'Rule 27, 28 & 29',
    chapter: 'Chapter V: Registration of Packers',
    title: 'Mandatory Registration of Manufacturers, Packers & Importers',
    type: 'PackerRegistrationValidator',
    severity: 'HIGH',
    category: 'EXEMPTIONS_REG',
    categoryLabel: 'Exemptions & Registration',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Every individual, firm, or company manufacturing, packing or importing pre-packaged commodities must register their name and premises with the Director or State Controller.',
    validationLogic: 'Cross-checks corporate entity name and address against Central Legal Metrology Packer Registration Directory.',
    inspectionMethod: 'National LM Packer Registry Cross-Check',
    penaltyProvision: 'Fine up to ₹25,000 under Section 36(1)',
  },
  {
    code: 'PCR-033',
    section: 'Rule 30',
    chapter: 'Chapter VI: Inspection Powers',
    title: 'Inspection Powers of Legal Metrology Officers, Search & Seizure',
    type: 'InspectionAuthorityValidator',
    severity: 'HIGH',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 15 & 16 of Legal Metrology Act, 2009',
    statutoryDescription: 'Empowers Legal Metrology Officers to enter premises, inspect packages, seize non-compliant goods, draw samples, and examine books and registers.',
    validationLogic: 'Generates tamper-evident cryptographic inspection memo with GPS location and photo hash.',
    inspectionMethod: 'PARAKH Mobile Field Enforcement Terminal & Section 65B Certificate',
    penaltyProvision: 'Obstruction punishable under Section 44 with fine up to ₹20,000 or imprisonment',
  },
  {
    code: 'PCR-034',
    section: 'Rule 31 & First Schedule',
    chapter: 'Chapter VI: Net Content Test Checks',
    title: 'Maximum Permissible Error (MPE) Limits on Net Quantity',
    type: 'MPEValidator',
    severity: 'HIGH',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 30 & 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Actual net contents of pre-packed commodities must not fall below declared quantity by more than the Maximum Permissible Error (MPE) specified in the First Schedule (1% to 9% depending on quantity).',
    validationLogic: 'Evaluates measured sample weight against First Schedule MPE table. Calculates standard deviation and average net content of sample lot.',
    inspectionMethod: 'Certified Gravimetric Balance Test under Fourth Schedule',
    penaltyProvision: 'Short-delivery offence under Section 30: Fine up to ₹10,000 or 1 yr imprisonment',
  },
  {
    code: 'PCR-035',
    section: 'Rule 32 & Section 36(1)',
    chapter: 'Chapter VI: Penalties for Non-Compliance',
    title: 'Penalty for Non-Standard Packaging / Absence of Declarations',
    type: 'PenaltyAssessmentValidator',
    severity: 'HIGH',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 36(1) of Legal Metrology Act, 2009',
    statutoryDescription: 'Whoever manufactures, packs, imports, sells, distributes or delivers any non-standard package or package without mandatory declarations shall be punished with fine up to ₹25,000 for first offence, ₹50,000 for second offence, and up to ₹1,00,000 or imprisonment for subsequent offences.',
    validationLogic: 'Calculates statutory penalty tier based on prior infraction history in the Recidivist Brand Directory.',
    inspectionMethod: 'Automated Judicial Compounding Assessment Engine',
    penaltyProvision: 'Fine ₹25,000 to ₹1,00,000 + Criminal Prosecution under Section 36',
  },
  {
    code: 'PCR-036',
    section: 'Rule 33 & Sixth Schedule',
    chapter: 'Chapter VI: Compounding of Offences',
    title: 'Departmental Compounding of Packaging Infractions (Section 48)',
    type: 'CompoundingFeeValidator',
    severity: 'MEDIUM',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 48 of Legal Metrology Act, 2009',
    statutoryDescription: 'Empowers the Controller or authorized officer to compound any offence punishable under Section 36 upon payment of compounding fees specified in the Sixth Schedule.',
    validationLogic: 'Computes statutory compounding fee based on rule count and tier, generating Form 1 Compounding Order.',
    inspectionMethod: 'Digital Compounding Order Generator with Treasury Payment Challan',
    penaltyProvision: 'Compounding fee per infraction: ₹2,000 to ₹25,000 per violation',
  },
  {
    code: 'PCR-037',
    section: 'Rule 34',
    chapter: 'Chapter VI: Disposal of Seized Commodities',
    title: 'Safe Custody, Release & Disposal of Seized Non-Standard Commodities',
    type: 'SeizureDisposalValidator',
    severity: 'MEDIUM',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 16 of Legal Metrology Act, 2009',
    statutoryDescription: 'Seized non-standard commodities must be kept in safe custody. If compoundable, released after compounding and relabeling; perishable goods disposed of as prescribed.',
    validationLogic: 'Maintains custody chain tracking seized lot status from seizure memo to compounding receipt.',
    inspectionMethod: 'Forensic Property Custody Chain Log',
    penaltyProvision: 'Forfeiture of seized commodities to State Government',
  },
  {
    code: 'PCR-038',
    section: 'Third & Fourth Schedules',
    chapter: 'Schedules: Statistical Sampling',
    title: 'Statistical Sample Lot Selection & Error Determination',
    type: 'StatisticalSamplingValidator',
    severity: 'MEDIUM',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'First & Fourth Schedules to PCR, 2011',
    statutoryDescription: 'Prescribes the exact statistical sample size (e.g. 32 samples for lot of 501-1200; 50 samples for 1201-3200) and standard error verification method for net content checks.',
    validationLogic: 'Calculates statistical sample size based on total warehouse batch inventory.',
    inspectionMethod: 'Statistical Lot Sampling Calculation',
    penaltyProvision: 'Rejection of entire batch lot if defect count exceeds acceptance criteria',
  },
  {
    code: 'PCR-039',
    section: 'Section 36(2) of Act',
    chapter: 'Legal Metrology Act: Corporate Recidivism',
    title: 'Enhanced Penalty for Repeat Corporate Offenders Across Stores',
    type: 'RecidivismEscalationValidator',
    severity: 'HIGH',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 36(2) of Legal Metrology Act, 2009',
    statutoryDescription: 'Whoever having been convicted of an offence punishable under Section 36(1) commits a second or subsequent offence shall be punished with imprisonment for a term up to one year and with fine.',
    validationLogic: 'Tracks multi-store repeat violations in Central Recidivist Database; automatically triggers Section 36(2) prosecution dossier.',
    inspectionMethod: 'PARAKH National Recidivism Tracking Engine',
    penaltyProvision: 'Mandatory Court Prosecution + Imprisonment up to 1 year + Enhanced Fine',
  },
  {
    code: 'PCR-040',
    section: 'Section 49 of Act',
    chapter: 'Legal Metrology Act: Offences by Companies',
    title: 'Corporate Liability & Nomination of Responsible Company Directors',
    type: 'CompanyLiabilityValidator',
    severity: 'HIGH',
    category: 'ENFORCEMENT',
    categoryLabel: 'Enforcement & Compounding',
    actSection: 'Section 49 of Legal Metrology Act, 2009',
    statutoryDescription: 'Where an offence is committed by a company, the nominated Director or the person in charge of business operations shall be deemed guilty of the offence and liable to be proceeded against.',
    validationLogic: 'Queries Director Identification Number (DIN) and registered Company Director filings.',
    inspectionMethod: 'Ministry of Corporate Affairs (MCA) DIN Registry Integration',
    penaltyProvision: 'Personal criminal liability and prosecution of nominated corporate director',
  },
];

export default function RulesExplorerPage() {
  const [selectedRule, setSelectedRule] = useState<RuleDef>(STATUTORY_RULES[0]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredRules = STATUTORY_RULES.filter((r) => {
    const matchesSearch =
      r.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.section.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.statutoryDescription.toLowerCase().includes(searchFilter.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' || r.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = [
    { key: 'ALL', label: `All Rules (${STATUTORY_RULES.length})` },
    { key: 'RULE_6', label: 'Mandatory Declarations (Rule 6)' },
    { key: 'METRIC_FONT', label: 'Metric & Font Standards' },
    { key: 'PACKAGING', label: 'Packaging & Deceptive' },
    { key: 'RETAIL', label: 'Retail Sale & Overcharging' },
    { key: 'EXEMPTIONS_REG', label: 'Exemptions & Registration' },
    { key: 'ENFORCEMENT', label: 'Enforcement & Compounding' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Statutory Rule Engine Explorer"
        description="Comprehensive deterministic legal validator registry covering all statutory provisions of the Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E)) and Sections 36, 48 & 49 of the Legal Metrology Act, 2009."
        actions={
          <div className="flex gap-2">
            <Link
              href="/scan"
              className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] flex items-center gap-1.5 shadow-xs"
            >
              <span>+ Test Rules Against Scan</span>
            </Link>
          </div>
        }
      />

      {/* Official Enforcement Statistics & Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 font-mono text-xs">
        <div className="bg-white p-3 border border-[#CBD5E1] shadow-xs">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">Total Rules</span>
          <span className="text-xl font-bold text-[#0A2540] mt-0.5 block">{STATUTORY_RULES.length}</span>
          <span className="text-[10px] text-[#15803D]">100% Statutory Coverage</span>
        </div>
        <div className="bg-white p-3 border border-[#CBD5E1] shadow-xs">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">Mandatory Labels</span>
          <span className="text-xl font-bold text-[#0A2540] mt-0.5 block">14</span>
          <span className="text-[10px] text-[#475569]">Rule 6(1) to 6(11)</span>
        </div>
        <div className="bg-white p-3 border border-[#CBD5E1] shadow-xs">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">Metric & Fonts</span>
          <span className="text-xl font-bold text-[#0A2540] mt-0.5 block">7</span>
          <span className="text-[10px] text-[#475569]">Rule 7-13, Table I</span>
        </div>
        <div className="bg-white p-3 border border-[#CBD5E1] shadow-xs">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">Packaging & Retail</span>
          <span className="text-xl font-bold text-[#0A2540] mt-0.5 block">8</span>
          <span className="text-[10px] text-[#475569]">Rules 14-18</span>
        </div>
        <div className="bg-white p-3 border border-[#CBD5E1] shadow-xs">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">Exemptions & Reg</span>
          <span className="text-xl font-bold text-[#0A2540] mt-0.5 block">3</span>
          <span className="text-[10px] text-[#475569]">Rules 24-29</span>
        </div>
        <div className="bg-white p-3 border border-[#CBD5E1] shadow-xs">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">Enforcement & Fines</span>
          <span className="text-xl font-bold text-[#B91C1C] mt-0.5 block">8</span>
          <span className="text-[10px] text-[#B91C1C]">Sec 36, 48 & 49</span>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-[#CBD5E1] p-3 shadow-xs space-y-3 font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1 text-[11px]">
            {categories.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setSelectedCategory(c.key)}
                className={`px-3 py-1.5 border transition-colors cursor-pointer ${
                  selectedCategory === c.key
                    ? 'bg-[#0A2540] text-white border-[#0A2540] font-bold'
                    : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search rule code, section, or keyword..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-mono bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] focus:outline-none focus:border-[#0A2540] w-64 sm:w-80"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1.5 text-xs text-[#94A3B8] hover:text-[#0F172A] cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Split Grid: Rule List (60%) vs Rule Inspector (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 60%: Rules Table */}
        <div className="lg:col-span-7 bg-white border border-[#CBD5E1] p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
                STATUTORY CODE MATRIX
              </span>
              <h3 className="text-sm font-bold text-[#0A2540] mt-0.5 font-sans">
                Showing {filteredRules.length} of {STATUTORY_RULES.length} Legal Metrology Rules
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#64748B]">Click row to inspect</span>
          </div>

          <div className="border border-[#CBD5E1] overflow-x-auto max-h-[750px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="sticky top-0 bg-[#F1F5F9] border-b border-[#CBD5E1] z-10">
                <tr className="text-[#0A2540] uppercase text-[10px]">
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Code</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Section</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Statutory Requirement</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Severity</th>
                  <th className="p-2.5 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[11px] bg-white">
                {filteredRules.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#64748B] font-mono">
                      No rules found matching &quot;{searchFilter}&quot;.
                    </td>
                  </tr>
                ) : (
                  filteredRules.map((rule) => {
                    const isSelected = selectedRule.code === rule.code;
                    return (
                      <tr
                        key={rule.code}
                        onClick={() => setSelectedRule(rule)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-orange-50/80 border-l-4 border-l-[#EA580C] text-[#0A2540] font-bold'
                            : 'hover:bg-[#F8FAFC]'
                        }`}
                      >
                        <td className="p-2.5 font-bold text-[#0A2540] border-r border-[#CBD5E1] whitespace-nowrap">
                          {rule.code}
                        </td>
                        <td className="p-2.5 text-[#475569] border-r border-[#CBD5E1] whitespace-nowrap">
                          {rule.section}
                        </td>
                        <td className="p-2.5 font-sans font-medium text-[#0F172A] border-r border-[#CBD5E1] max-w-[220px] truncate">
                          {rule.title}
                        </td>
                        <td className="p-2.5 border-r border-[#CBD5E1] whitespace-nowrap">
                          <SeverityBadge severity={rule.severity} />
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            isSelected ? 'bg-[#EA580C] text-white' : 'text-[#64748B]'
                          }`}>
                            {isSelected ? '● Active' : 'Inspect &rarr;'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 40%: Selected Rule Deep Inspector */}
        <div className="lg:col-span-5 bg-white border border-[#CBD5E1] p-5 sm:p-6 space-y-4 shadow-xs sticky top-4">
          <div className="border-b border-[#E2E8F0] pb-3 flex items-start justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#EA580C] font-bold block">
                {selectedRule.chapter}
              </span>
              <h3 className="text-base font-bold text-[#0A2540] font-sans mt-0.5">
                {selectedRule.code} &bull; {selectedRule.section}
              </h3>
            </div>
            <SeverityBadge severity={selectedRule.severity} />
          </div>

          <div className="space-y-3.5 text-xs font-mono">
            {/* Title */}
            <div>
              <span className="text-[#64748B] text-[10px] uppercase block font-bold mb-1">Requirement Title</span>
              <div className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#0A2540] font-sans font-bold">
                {selectedRule.title}
              </div>
            </div>

            {/* Statutory Description */}
            <div>
              <span className="text-[#64748B] text-[10px] uppercase block font-bold mb-1">
                Statutory Provision (LMPCR, 2011)
              </span>
              <p className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] font-sans leading-relaxed text-[11px]">
                {selectedRule.statutoryDescription}
              </p>
            </div>

            {/* Act Section & Penalty */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-slate-50 border border-slate-200">
                <span className="text-[9px] text-[#64748B] uppercase block font-bold">Parent Act Section</span>
                <span className="font-bold text-[#0A2540] text-[11px] block mt-0.5 leading-snug">
                  {selectedRule.actSection}
                </span>
              </div>
              <div className="p-2.5 bg-rose-50/60 border border-rose-200">
                <span className="text-[9px] text-rose-800 uppercase block font-bold">Statutory Penalties</span>
                <span className="font-bold text-rose-900 text-[10px] block mt-0.5 leading-snug">
                  {selectedRule.penaltyProvision}
                </span>
              </div>
            </div>

            {/* Inspection Method */}
            <div>
              <span className="text-[#64748B] text-[10px] uppercase block font-bold mb-1">
                Enforcement Audit Methodology
              </span>
              <div className="p-2.5 bg-blue-50/60 border border-blue-200 text-blue-950 font-sans text-[11px]">
                <strong>{selectedRule.inspectionMethod}</strong>
              </div>
            </div>

            {/* Deterministic Validation Logic */}
            <div>
              <span className="text-[#64748B] text-[10px] uppercase block font-bold mb-1">
                PARAKH Deterministic Validation Logic
              </span>
              <div className="p-2.5 bg-emerald-950 text-emerald-300 font-mono text-[10.5px] leading-relaxed rounded-xs overflow-x-auto">
                <code>{selectedRule.validationLogic}</code>
              </div>
            </div>

            {/* Meta Tags */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
              <div>Category: <strong className="text-[#0A2540]">{selectedRule.categoryLabel}</strong></div>
              <div>Validator: <strong className="text-[#0A2540]">{selectedRule.type}</strong></div>
            </div>

            <div className="pt-2">
              <Link
                href="/scan"
                className="w-full py-2.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-bold text-xs uppercase tracking-wider text-center block transition-colors border-t-2 border-t-[#EA580C] shadow-xs cursor-pointer"
              >
                Scan Packaged Commodity to Audit This Rule &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

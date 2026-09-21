'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PageHeader, SeverityBadge } from '@/components/ui';

interface RuleDef {
  code: string;
  section: string;
  title: string;
  type: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  statutoryDescription: string;
  validationLogic: string;
}

const STATUTORY_RULES: RuleDef[] = [
  {
    code: 'PCR-001',
    section: 'Rule 6(1)(a)',
    title: 'Manufacturer / Packer / Importer Identity & Address',
    type: 'MandatoryPresenceValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'Every pre-packaged commodity must bear the name and complete physical address of the manufacturer, or where manufacturer is not the packer, the packer thereof.',
    validationLogic: 'Verifies presence of manufacturer/packer entity name, physical street address, and valid 6-digit postal PIN code.',
  },
  {
    code: 'PCR-002',
    section: 'Rule 6(1)(b)',
    title: 'Generic or Common Name of Commodity',
    type: 'CommodityNameValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'The common or generic name of the commodity contained in the package must be prominently declared on the principal display panel.',
    validationLogic: 'Checks for prominent generic commodity classification (minimum 2 characters, non-trademarked terminology).',
  },
  {
    code: 'PCR-003',
    section: 'Rule 6(1)(c)',
    title: 'Net Quantity Declaration in Metric Units',
    type: 'NetQuantityValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'The net quantity in terms of standard unit of weight or measure must be unequivocally declared on the principal display panel.',
    validationLogic: 'Validates quantity magnitude and unit pairing against Table I statutory permissible dimensions.',
  },
  {
    code: 'PCR-004',
    section: 'Rule 12 & Schedule II',
    title: 'Permissible Metric Symbols & Unit Grammar',
    type: 'UnitGrammarValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'No non-metric unit or non-standard abbreviation (such as gms, kgs, ltrs) shall appear in conjunction with statutory quantity declarations.',
    validationLogic: 'Strict regex whitelist: g, kg, ml, l, m, cm, mm. Rejects "gms", "kgs", "ml.", etc.',
  },
  {
    code: 'PCR-005',
    section: 'Rule 6(1)(d)',
    title: 'Month and Year of Manufacture or Packaging',
    type: 'DateValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'The month and year in which the commodity is manufactured or pre-packed must be declared on every package.',
    validationLogic: 'Validates two-digit month and two-digit or four-digit year format (MM/YYYY or Month Year). Rejects future dates.',
  },
  {
    code: 'PCR-006',
    section: 'Rule 6(1)(e)',
    title: 'Maximum Retail Price (MRP) & Tax Inclusivity',
    type: 'MRPValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'Retail sale price of package must be declared as Maximum Retail Price (MRP) Rs. / ₹ ... inclusive of all taxes.',
    validationLogic: 'Detects MRP currency notation and strictly enforces mandatory phrase "incl. of all taxes" or "inclusive of all taxes".',
  },
  {
    code: 'PCR-007',
    section: 'Rule 6(1)(da)',
    title: 'Country of Origin for Imported Commodities',
    type: 'CountryOfOriginValidator',
    severity: 'HIGH',
    category: 'GENERAL (IMPORTED)',
    statutoryDescription: 'For pre-packaged commodities imported from abroad, the name of the country of origin must be stated explicitly.',
    validationLogic: 'If is_imported=True, validates declared nation against ISO standard country registries.',
  },
  {
    code: 'PCR-008',
    section: 'Rule 6(1)(a) Proviso',
    title: 'Importer Identity for Imported Commodities',
    type: 'ImporterPresenceValidator',
    severity: 'HIGH',
    category: 'GENERAL (IMPORTED)',
    statutoryDescription: 'For imported goods, the name and complete corporate address of the importer in India must be declared.',
    validationLogic: 'Verifies Indian corporate registration, importer identity, and physical jurisdictional address.',
  },
  {
    code: 'PCR-009',
    section: 'Rule 6(1)(f)',
    title: 'Consumer Care Contact Details',
    type: 'CompositeValidator',
    severity: 'MEDIUM',
    category: 'GENERAL',
    statutoryDescription: 'The name, address, telephone number and electronic mail address of the person who can be contacted in case of consumer complaints.',
    validationLogic: 'Composite audit: checks at least two distinct communication channels (active phone/toll-free + verified email address).',
  },
  {
    code: 'PCR-010',
    section: 'Rule 6(1)(d) & FSSAI',
    title: 'Food Best Before / Date of Expiry',
    type: 'CategorySpecificValidator',
    severity: 'HIGH',
    category: 'FOOD',
    statutoryDescription: 'Packages of food commodities must bear date of packaging and best before or expiry date as prescribed under FSSAI regulations.',
    validationLogic: 'Mandatory for food categories. Verifies chronological alignment between packing date and shelf life duration.',
  },
  {
    code: 'PCR-011',
    section: 'Rule 6(1) & GS1',
    title: 'GS1 Barcode Prefix & Brand Integrity',
    type: 'RegistryCrossValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'Retail barcodes must bear valid GS1 standard checksums and prefix allocations matching the declared corporate entity to counter deceptive packaging and counterfeits.',
    validationLogic: 'Computes Modulo-10 checksum on GTIN-13/UPC and queries GS1 GEPIR master catalog for registered brand owner and declared catalog weight.',
  },
  {
    code: 'PCR-012',
    section: 'Rule 6(1)(d) & FSSAI Act',
    title: 'FSSAI FoSCoS Food Safety License Verification',
    type: 'LicenseValidator',
    severity: 'HIGH',
    category: 'FOOD',
    statutoryDescription: 'Food packages must bear an active, verified 14-digit FSSAI License/Registration number issued to the manufacturer or packer.',
    validationLogic: 'Validates 14-digit license structure, state code allocation, and verifies active license status against FoSCoS database records.',
  },
  {
    code: 'PCR-013',
    section: 'Rule 6(11)',
    title: 'Mandatory Unit Sale Price (USP) Compliance',
    type: 'ShrinkflationValidator',
    severity: 'HIGH',
    category: 'GENERAL',
    statutoryDescription: 'Pre-packaged commodities containing more than one unit or specified weight/volume must prominently declare the Unit Sale Price in statutory base units (per 1g/100g/1kg, 1ml/100ml/1L, 1 number) to prevent shrinkflation.',
    validationLogic: 'Computes USP = MRP / Normalized Quantity rounded to 2 decimal places, and flags non-standard base units or arithmetic divergence >2%.',
  },
];


export default function RulesExplorerPage() {
  const [selectedRule, setSelectedRule] = useState<RuleDef>(STATUTORY_RULES[0]);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredRules = STATUTORY_RULES.filter(
    (r) =>
      r.code.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.section.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.title.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <PageHeader
        title="Statutory Rule Engine Explorer"
        description="Deterministic legal validator registry mapped to the Legal Metrology (Packaged Commodities) Rules, 2011 and Section 36 of the Legal Metrology Act, 2009."
        actions={
          <Link
            href="/scan"
            className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#2563EB] hover:bg-blue-700 transition-colors border border-[#2563EB] shadow-sm"
          >
            + Test Rule Against Scan
          </Link>
        }
      />

      {/* Cobalt Pipeline Banner */}
      <div className="p-3 bg-[#12161F] border border-[#27272A] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-[#94A3B8]">
          <span className="w-2 h-2 bg-[#2563EB]"></span>
          <span className="text-[#FAFAFA] font-bold">EXECUTION ENGINE:</span>
          <span>Vision AI (Raw OCR Extraction) &rarr; Structured Dict &rarr; Deterministic Validator Pipeline</span>
        </div>
        <span className="px-2 py-0.5 text-[10px] font-bold text-[#10B981] bg-[rgba(16,185,129,0.12)] border border-[#10B981]/40">
          10 ACTIVE RULES
        </span>
      </div>

      {/* Split Grid: Rule List (50%) vs Rule Inspector (50%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 60%: Rules Table */}
        <div className="lg:col-span-7 bg-[#12161F] border border-[#27272A] p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FAFAFA] font-mono">
              Statutory Declarations Catalog
            </h3>
            <input
              type="text"
              placeholder="Filter rules..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="px-2.5 py-1 text-xs font-mono bg-[#09090B] border border-[#27272A] text-[#FAFAFA] focus:outline-none focus:border-[#2563EB] w-40"
            />
          </div>

          <div className="border border-[#27272A] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead>
                <tr className="bg-[#161B26] border-b border-[#27272A] text-[#94A3B8] uppercase text-[10px]">
                  <th className="p-3 border-r border-[#27272A]">Code</th>
                  <th className="p-3 border-r border-[#27272A]">Section</th>
                  <th className="p-3 border-r border-[#27272A]">Requirement</th>
                  <th className="p-3 border-r border-[#27272A]">Severity</th>
                  <th className="p-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272A] text-[11px]">
                {filteredRules.map((rule) => {
                  const isSelected = selectedRule.code === rule.code;
                  return (
                    <tr
                      key={rule.code}
                      onClick={() => setSelectedRule(rule)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[rgba(37,99,235,0.14)] text-[#FAFAFA]'
                          : 'hover:bg-[#161B26] bg-[#09090B]'
                      }`}
                    >
                      <td className="p-3 font-bold text-[#2563EB] border-r border-[#27272A]">
                        {rule.code}
                      </td>
                      <td className="p-3 text-[#94A3B8] border-r border-[#27272A]">
                        {rule.section}
                      </td>
                      <td className="p-3 font-sans font-medium text-[#FAFAFA] border-r border-[#27272A] max-w-[180px] truncate">
                        {rule.title}
                      </td>
                      <td className="p-3 border-r border-[#27272A]">
                        <SeverityBadge severity={rule.severity} />
                      </td>
                      <td className="p-3 text-right text-[#2563EB] font-bold">
                        {isSelected ? '● Active' : 'Select'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 40%: Selected Rule Deep Inspector */}
        <div className="lg:col-span-5 bg-[#12161F] border border-[#27272A] p-6 space-y-4">
          <div className="border-b border-[#27272A] pb-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#94A3B8] block">
                STATUTORY RULE INSPECTION
              </span>
              <h3 className="text-base font-bold text-[#FAFAFA] font-display mt-0.5">
                {selectedRule.code} &bull; {selectedRule.section}
              </h3>
            </div>
            <SeverityBadge severity={selectedRule.severity} />
          </div>

          <div className="space-y-4 text-xs font-mono">
            <div>
              <span className="text-[#94A3B8] text-[10px] uppercase block mb-1">Requirement Title</span>
              <div className="p-2.5 bg-[#09090B] border border-[#27272A] text-[#FAFAFA] font-sans font-semibold">
                {selectedRule.title}
              </div>
            </div>

            <div>
              <span className="text-[#94A3B8] text-[10px] uppercase block mb-1">Legal Metrology Statutory Rule</span>
              <p className="p-2.5 bg-[#09090B] border border-[#27272A] text-[#94A3B8] font-sans leading-relaxed text-[11px]">
                {selectedRule.statutoryDescription}
              </p>
            </div>

            <div>
              <span className="text-[#94A3B8] text-[10px] uppercase block mb-1">Deterministic Validation Logic</span>
              <div className="p-3 bg-[#09090B] border border-[#27272A] text-[#10B981] font-mono text-[11px] leading-relaxed">
                <code>{selectedRule.validationLogic}</code>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-2.5 bg-[#09090B] border border-[#27272A]">
                <span className="text-[9px] text-[#94A3B8] uppercase block">Validator Class</span>
                <span className="font-bold text-[#FAFAFA] text-[11px] truncate block mt-0.5">
                  {selectedRule.type}
                </span>
              </div>
              <div className="p-2.5 bg-[#09090B] border border-[#27272A]">
                <span className="text-[9px] text-[#94A3B8] uppercase block">Target Category</span>
                <span className="font-bold text-[#FAFAFA] text-[11px] truncate block mt-0.5">
                  {selectedRule.category}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-[#27272A]">
              <Link
                href="/scan"
                className="w-full py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-center block transition-colors border border-[#2563EB] shadow-sm"
              >
                Scan Product to Test This Rule &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/layout';

// Commodity Sample Declarations for Live Verification Bench
interface DeclarationItem {
  id: string;
  field: string;
  ruleCode: string;
  statutoryRule: string;
  extractedValue: string;
  measuredHeightMm: number;
  requiredHeightMm: number;
  status: 'PASS' | 'FAIL' | 'REVIEW';
  legalNote: string;
  box: { top: string; left: string; width: string; height: string };
}

interface CommoditySample {
  id: string;
  name: string;
  category: string;
  pdpAreaCm2: number;
  overallStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  violationsCount: number;
  declarations: DeclarationItem[];
}

const SAMPLES: CommoditySample[] = [
  {
    id: 'sample-ghee',
    name: 'Amrit Pure Cow Ghee 500ml',
    category: 'FOOD / DAIRY',
    pdpAreaCm2: 185,
    overallStatus: 'COMPLIANT',
    violationsCount: 0,
    declarations: [
      {
        id: 'g1',
        field: 'Manufacturer & Packer Info',
        ruleCode: 'PCR-001',
        statutoryRule: 'Rule 6(1)(a)',
        extractedValue: 'Amrit Dairy Products Pvt Ltd, Plot 42, GIDC Anand, Gujarat - 388001',
        measuredHeightMm: 2.2,
        requiredHeightMm: 1.5,
        status: 'PASS',
        legalNote: 'Complete physical registered address with valid postal PIN code declared.',
        box: { top: '10%', left: '8%', width: '84%', height: '14%' },
      },
      {
        id: 'g2',
        field: 'Generic Commodity Name',
        ruleCode: 'PCR-002',
        statutoryRule: 'Rule 6(1)(b)',
        extractedValue: 'PURE COW GHEE (CLARIFIED BUTTER)',
        measuredHeightMm: 6.5,
        requiredHeightMm: 2.0,
        status: 'PASS',
        legalNote: 'Generic commodity designation prominently declared on Principal Display Panel.',
        box: { top: '28%', left: '8%', width: '84%', height: '16%' },
      },
      {
        id: 'g3',
        field: 'Net Quantity (Standard SI)',
        ruleCode: 'PCR-003',
        statutoryRule: 'Rule 6(1)(c) & Rule 12',
        extractedValue: '500 ml (452 g)',
        measuredHeightMm: 4.2,
        requiredHeightMm: 4.0,
        status: 'PASS',
        legalNote: 'Standard SI volume unit (ml). Numeral height (4.2mm) complies with Table I minimum.',
        box: { top: '48%', left: '8%', width: '48%', height: '18%' },
      },
      {
        id: 'g4',
        field: 'Maximum Retail Price (MRP)',
        ruleCode: 'PCR-006',
        statutoryRule: 'Rule 6(1)(e)',
        extractedValue: '₹ 385.00 (Incl. of all taxes)',
        measuredHeightMm: 3.1,
        requiredHeightMm: 2.0,
        status: 'PASS',
        legalNote: 'Mandatory phrase "inclusive of all taxes" unequivocally present.',
        box: { top: '48%', left: '58%', width: '34%', height: '18%' },
      },
      {
        id: 'g5',
        field: 'Month & Year of Manufacture',
        ruleCode: 'PCR-005',
        statutoryRule: 'Rule 6(1)(d)',
        extractedValue: '07/2026',
        measuredHeightMm: 2.1,
        requiredHeightMm: 1.5,
        status: 'PASS',
        legalNote: 'Two-digit month and four-digit year declared in compliant syntax.',
        box: { top: '70%', left: '8%', width: '48%', height: '18%' },
      },
      {
        id: 'g6',
        field: 'Consumer Care Helpline',
        ruleCode: 'PCR-009',
        statutoryRule: 'Rule 6(1)(f)',
        extractedValue: '1800-222-0199 | care@amritdairy.in',
        measuredHeightMm: 1.8,
        requiredHeightMm: 1.5,
        status: 'PASS',
        legalNote: 'Both toll-free telephonic helpline and registered electronic mail provided.',
        box: { top: '70%', left: '58%', width: '34%', height: '18%' },
      },
    ],
  },
  {
    id: 'sample-biscuit',
    name: 'NutriBite Butter Crisp 120g',
    category: 'FOOD / BAKERY',
    pdpAreaCm2: 120,
    overallStatus: 'NON_COMPLIANT',
    violationsCount: 2,
    declarations: [
      {
        id: 'b1',
        field: 'Maximum Retail Price (MRP)',
        ruleCode: 'PCR-006',
        statutoryRule: 'Rule 6(1)(e)',
        extractedValue: 'MRP: Rs. 35.00 only',
        measuredHeightMm: 1.8,
        requiredHeightMm: 2.0,
        status: 'FAIL',
        legalNote: 'Statutory Defect: Missing mandatory statutory phrase "inclusive of all taxes".',
        box: { top: '48%', left: '56%', width: '36%', height: '18%' },
      },
      {
        id: 'b2',
        field: 'Net Quantity Declaration',
        ruleCode: 'PCR-003',
        statutoryRule: 'Rule 6(1)(c) & Rule 9 Table I',
        extractedValue: 'Net Wt: 120 gms',
        measuredHeightMm: 1.2,
        requiredHeightMm: 2.0,
        status: 'FAIL',
        legalNote: 'Table I Defect: Measured numeral height is 1.2mm (statutory minimum is 2.0mm). Non-standard unit symbol "gms" used instead of "g".',
        box: { top: '48%', left: '8%', width: '44%', height: '18%' },
      },
      {
        id: 'b3',
        field: 'Manufacturer Identity',
        ruleCode: 'PCR-001',
        statutoryRule: 'Rule 6(1)(a)',
        extractedValue: 'Mfd by: NutriBite Foods, Okhla Phase III, New Delhi - 110020',
        measuredHeightMm: 1.6,
        requiredHeightMm: 1.5,
        status: 'PASS',
        legalNote: 'Manufacturer identity present with postal location.',
        box: { top: '10%', left: '8%', width: '84%', height: '16%' },
      },
      {
        id: 'b4',
        field: 'Month & Year of Packaging',
        ruleCode: 'PCR-005',
        statutoryRule: 'Rule 6(1)(d)',
        extractedValue: 'PKD: 06/2026',
        measuredHeightMm: 1.6,
        requiredHeightMm: 1.5,
        status: 'PASS',
        legalNote: 'Packaging date declared in standard format.',
        box: { top: '70%', left: '8%', width: '84%', height: '18%' },
      },
    ],
  },
  {
    id: 'sample-water',
    name: 'Himalayan Alpine Glacial Water 750ml',
    category: 'BEVERAGE / IMPORTED',
    pdpAreaCm2: 240,
    overallStatus: 'NEEDS_REVIEW',
    violationsCount: 1,
    declarations: [
      {
        id: 'w1',
        field: 'Country of Origin Declaration',
        ruleCode: 'PCR-007',
        statutoryRule: 'Rule 6(1)(da)',
        extractedValue: 'Imported from Bhutan [Low Contrast]',
        measuredHeightMm: 1.4,
        requiredHeightMm: 1.5,
        status: 'REVIEW',
        legalNote: 'Optical contrast ratio is below regulatory threshold (0.64). Requires field officer manual confirmation.',
        box: { top: '12%', left: '10%', width: '80%', height: '16%' },
      },
      {
        id: 'w2',
        field: 'Importer Registered Address',
        ruleCode: 'PCR-008',
        statutoryRule: 'Rule 6(1)(a) proviso',
        extractedValue: 'Apex Trade Links LLP, Nariman Point, Mumbai - 400021',
        measuredHeightMm: 1.9,
        requiredHeightMm: 1.5,
        status: 'PASS',
        legalNote: 'Importer name and physical address declared.',
        box: { top: '32%', left: '10%', width: '80%', height: '18%' },
      },
      {
        id: 'w3',
        field: 'Net Quantity',
        ruleCode: 'PCR-003',
        statutoryRule: 'Rule 6(1)(c)',
        extractedValue: '750 ml',
        measuredHeightMm: 4.5,
        requiredHeightMm: 4.0,
        status: 'PASS',
        legalNote: 'Complies with SI units and minimum height.',
        box: { top: '54%', left: '10%', width: '40%', height: '18%' },
      },
      {
        id: 'w4',
        field: 'Maximum Retail Price (MRP)',
        ruleCode: 'PCR-006',
        statutoryRule: 'Rule 6(1)(e)',
        extractedValue: '₹ 120.00 (Incl. of all taxes)',
        measuredHeightMm: 3.2,
        requiredHeightMm: 2.5,
        status: 'PASS',
        legalNote: 'Standard Indian Rupee symbol with mandatory tax inclusion.',
        box: { top: '54%', left: '55%', width: '35%', height: '18%' },
      },
    ],
  },
];

const STATUTORY_RULES = [
  { code: 'PCR-001', section: 'Rule 6(1)(a)', name: 'Manufacturer / Packer Declaration', req: 'Name and complete registered address of manufacturer or packer', severity: 'HIGH' },
  { code: 'PCR-002', section: 'Rule 6(1)(b)', name: 'Generic / Common Commodity Name', req: 'Generic or common name of the commodity inside package', severity: 'HIGH' },
  { code: 'PCR-003', section: 'Rule 6(1)(c)', name: 'Net Quantity & Unit of Measurement', req: 'Net quantity declared in metric standard units (g, kg, ml, l)', severity: 'HIGH' },
  { code: 'PCR-004', section: 'Rule 9 Table I', name: 'Minimum Numeral & Letter Height', req: 'Strict minimum typography height calculated from PDP area', severity: 'HIGH' },
  { code: 'PCR-005', section: 'Rule 6(1)(d)', name: 'Month & Year of Manufacture / Packing', req: 'Pre-printed date declaration in MM/YYYY format', severity: 'HIGH' },
  { code: 'PCR-006', section: 'Rule 6(1)(e)', name: 'Maximum Retail Price (MRP)', req: 'MRP in INR with statutory phrase "inclusive of all taxes"', severity: 'HIGH' },
  { code: 'PCR-007', section: 'Rule 6(1)(da)', name: 'Country of Origin (Imported Commodities)', req: 'Explicit declaration of country of manufacture / assembly', severity: 'HIGH' },
  { code: 'PCR-008', section: 'Rule 6(1)(a) prov.', name: 'Importer Corporate Details', req: 'Name and complete address of the domestic importer', severity: 'HIGH' },
  { code: 'PCR-009', section: 'Rule 6(1)(f)', name: 'Consumer Care Contact Information', req: 'Name, address, telephone number and email of grievance cell', severity: 'MEDIUM' },
  { code: 'PCR-010', section: 'Rule 6(1)(d) & FSSAI', name: 'Best Before / Expiry Declaration', req: 'Statutory expiration period for perishable commodities', severity: 'HIGH' },
];

export default function HomePage() {
  const [selectedSampleIndex, setSelectedSampleIndex] = useState(0);
  const [activeHotspotId, setActiveHotspotId] = useState<string | null>(null);

  const currentSample = SAMPLES[selectedSampleIndex];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] font-sans antialiased flex flex-col">
      {/* Global Regulatory Navbar */}
      <Navbar />

      {/* HERO SECTION */}
      <section className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 60%: Authority Headline, Context & Primary Actions */}
            <div className="lg:col-span-7 space-y-6">
              {/* Institutional Reference Pill */}
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#F1F5F9] border border-[#CBD5E1] text-[11px] font-mono text-[#0A2540]">
                <span className="w-2 h-2 bg-[#EA580C]"></span>
                <span className="font-semibold uppercase tracking-wider">
                  Statutory Rule Enforcement Framework
                </span>
                <span className="text-[#94A3B8]">|</span>
                <span className="text-[#64748B]">GSR 202(E)</span>
              </div>

              {/* Exact Requested Hero Heading */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#0A2540] leading-tight font-sans">
                Digital Compliance Inspection for Packaged Commodities
              </h1>

              {/* Exact Requested Hero Subtext */}
              <p className="text-base sm:text-lg text-[#475569] leading-relaxed max-w-2xl">
                Verify packaged commodity declarations against the Legal Metrology (Packaged Commodities) Rules, 2011 through a structured digital inspection workflow.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/scan"
                  className="px-6 py-3 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-semibold text-sm tracking-wide transition-all shadow-xs flex items-center gap-3 border-t-2 border-t-[#EA580C]"
                >
                  <span>Start Inspection</span>
                  <span className="text-base">&rarr;</span>
                </Link>

                <a
                  href="#rules-matrix"
                  className="px-6 py-3 bg-white hover:bg-[#F8FAFC] text-[#0A2540] font-semibold text-sm tracking-wide transition-colors border border-[#CBD5E1] flex items-center gap-2"
                >
                  <span>View Compliance Rules</span>
                  <span className="text-[#94A3B8]">&darr;</span>
                </a>
              </div>

              {/* High-Level Trust Badges */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#E2E8F0] font-mono text-xs text-[#475569]">
                <div>
                  <span className="block font-bold text-[#0A2540] text-sm">10 Rules</span>
                  <span>Full statutory coverage</span>
                </div>
                <div>
                  <span className="block font-bold text-[#0A2540] text-sm">Table I Check</span>
                  <span>Numeral height audit</span>
                </div>
                <div>
                  <span className="block font-bold text-[#0A2540] text-sm">Deterministic</span>
                  <span>Zero legal ambiguity</span>
                </div>
              </div>
            </div>

            {/* Right 40%: Visual Process Flow Diagram */}
            <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#CBD5E1] p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                <span className="text-[11px] font-mono font-bold text-[#0A2540] uppercase tracking-wider">
                  Verification Process Flow
                </span>
                <span className="text-[10px] font-mono text-[#64748B] bg-white px-2 py-0.5 border border-[#E2E8F0]">
                  AUTOMATED PIPELINE
                </span>
              </div>

              <div className="mt-5 space-y-4 font-mono text-xs">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-[#E2E8F0]">
                  <div className="w-6 h-6 bg-[#0A2540] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    1
                  </div>
                  <div>
                    <span className="font-bold text-[#0A2540] block">Packaged Commodity</span>
                    <span className="text-[11px] text-[#64748B]">
                      Physical package image capture (Front, Back, MRP panel)
                    </span>
                  </div>
                </div>

                <div className="flex justify-center text-[#94A3B8] text-xs leading-none">&darr;</div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-[#E2E8F0]">
                  <div className="w-6 h-6 bg-[#0A2540] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    2
                  </div>
                  <div>
                    <span className="font-bold text-[#0A2540] block">Label / Data Extraction</span>
                    <span className="text-[11px] text-[#64748B]">
                      OCR text detection, PDP area & numeral height measurement
                    </span>
                  </div>
                </div>

                <div className="flex justify-center text-[#94A3B8] text-xs leading-none">&darr;</div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 bg-white border border-[#E2E8F0]">
                  <div className="w-6 h-6 bg-[#0A2540] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    3
                  </div>
                  <div>
                    <span className="font-bold text-[#0A2540] block">Rule Verification</span>
                    <span className="text-[11px] text-[#64748B]">
                      Deterministic validation against 10 statutory rules
                    </span>
                  </div>
                </div>

                <div className="flex justify-center text-[#94A3B8] text-xs leading-none">&darr;</div>

                {/* Step 4 */}
                <div className="flex items-start gap-3 p-3 bg-[#F0FDF4] border border-[#BBF7D0]">
                  <div className="w-6 h-6 bg-[#15803D] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                    ✓
                  </div>
                  <div>
                    <span className="font-bold text-[#15803D] block">Compliance Result & Report</span>
                    <span className="text-[11px] text-[#166534]">
                      Inspection memo with evidence mapping & legal citation
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4-STAGE HORIZONTAL STEPPER SECTION */}
      <section className="bg-white border-b border-[#E2E8F0] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-[#E2E8F0] pb-3 mb-6 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block">
                INSPECTION METHODOLOGY
              </span>
              <h2 className="text-xl font-bold text-[#0A2540] font-sans">
                Standard Four-Stage Regulatory Workflow
              </h2>
            </div>
            <span className="text-xs font-mono text-[#64748B] hidden md:inline">
              ISO/IEC 17020 Compatible Inspection Process
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Step 01 */}
            <div className="p-4 bg-[#F8FAFC] border-t-2 border-t-[#0A2540] border-x border-b border-[#E2E8F0] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#0A2540] block mb-1">01</span>
                <h3 className="font-bold text-sm text-[#0F172A] mb-2 font-sans">Upload / Capture</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Field officer uploads or captures high-resolution photographs of all package panels (Front, Back, Base).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B]">
                INPUT: High-Res Packaging Photo
              </div>
            </div>

            {/* Step 02 */}
            <div className="p-4 bg-[#F8FAFC] border-t-2 border-t-[#0A2540] border-x border-b border-[#E2E8F0] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#0A2540] block mb-1">02</span>
                <h3 className="font-bold text-sm text-[#0F172A] mb-2 font-sans">Data Extraction</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Optical detection parses mandatory declarations, measuring numeral heights (mm) and PDP area (cm²).
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B]">
                ENGINE: Optical Field Parsing
              </div>
            </div>

            {/* Step 03 */}
            <div className="p-4 bg-[#F8FAFC] border-t-2 border-t-[#EA580C] border-x border-b border-[#E2E8F0] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#EA580C] block mb-1">03</span>
                <h3 className="font-bold text-sm text-[#0F172A] mb-2 font-sans">Rule Verification</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Deterministic engine cross-references extracted declarations against statutory provisions and Table I height requirements.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B]">
                LOGIC: 10 Statutory Rules
              </div>
            </div>

            {/* Step 04 */}
            <div className="p-4 bg-[#F8FAFC] border-t-2 border-t-[#15803D] border-x border-b border-[#E2E8F0] flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#15803D] block mb-1">04</span>
                <h3 className="font-bold text-sm text-[#0F172A] mb-2 font-sans">Compliance Report</h3>
                <p className="text-xs text-[#475569] leading-relaxed">
                  Comprehensive inspection report generated with pass/fail findings, statutory references, and visual evidence mapping.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-[#E2E8F0] text-[10px] font-mono text-[#64748B]">
                OUTPUT: Formal Inspection Memo
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE COMMODITY INSPECTION BENCH */}
      <section className="py-12 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-[#EA580C]"></span>
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#64748B]">
                  LIVE REGULATORY VERIFICATION BENCH
                </span>
              </div>
              <h2 className="text-2xl font-bold text-[#0A2540] mt-1 font-sans">
                Interactive Declaration Verification
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                Select a calibrated package to test automatic statutory evaluation and visual evidence localization.
              </p>
            </div>

            {/* Sample Selector Buttons */}
            <div className="flex flex-wrap gap-2">
              {SAMPLES.map((sample, idx) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    setSelectedSampleIndex(idx);
                    setActiveHotspotId(null);
                  }}
                  className={`px-3 py-2 text-xs font-mono font-semibold transition-all border cursor-pointer ${
                    selectedSampleIndex === idx
                      ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xs'
                      : 'bg-white text-[#475569] border-[#CBD5E1] hover:bg-[#F1F5F9]'
                  }`}
                >
                  <span className="mr-1.5">{idx === 0 ? '✓' : idx === 1 ? '✕' : '⚠'}</span>
                  {sample.name.split(' ')[0]} {sample.name.split(' ')[1]}
                </button>
              ))}
            </div>
          </div>

          {/* Workbench Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-[#CBD5E1]">
            {/* Left 40%: Interactive PDP Package Simulator with Bounding Boxes */}
            <div className="lg:col-span-5 p-5 border-b lg:border-b-0 lg:border-r border-[#CBD5E1] flex flex-col justify-between bg-[#F8FAFC]">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] text-xs font-mono">
                  <span className="font-bold text-[#0A2540]">PRINCIPAL DISPLAY PANEL (PDP)</span>
                  <span className="text-[10px] text-[#64748B]">AREA: {currentSample.pdpAreaCm2} cm²</span>
                </div>

                {/* Simulated Physical Package Graphic */}
                <div className="relative mt-4 aspect-4/5 bg-white border-2 border-[#CBD5E1] p-4 flex flex-col justify-between shadow-xs overflow-hidden select-none">
                  {/* Top Branding Area */}
                  <div className="text-center pb-2 border-b border-dashed border-[#CBD5E1]">
                    <span className="text-[10px] font-mono text-[#94A3B8] tracking-widest block uppercase">
                      BRAND DECLARATION
                    </span>
                    <h4 className="text-base font-bold text-[#0A2540] font-sans">
                      {currentSample.name}
                    </h4>
                    <span className="text-[10px] font-mono text-[#64748B]">
                      CATEGORY: {currentSample.category}
                    </span>
                  </div>

                  {/* Visual Hotspots Overlaid on Package */}
                  {currentSample.declarations.map((item) => {
                    const isSelected = activeHotspotId === item.id;
                    const isFail = item.status === 'FAIL';
                    const isReview = item.status === 'REVIEW';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setActiveHotspotId(item.id)}
                        style={item.box}
                        className={`absolute border transition-all cursor-pointer flex items-center justify-between px-2 text-[10px] font-mono ${
                          isSelected
                            ? 'bg-[#0A2540]/15 border-[#0A2540] ring-2 ring-[#0A2540]'
                            : isFail
                            ? 'bg-[#FEF2F2]/80 border-[#EF4444] text-[#B91C1C]'
                            : isReview
                            ? 'bg-[#FFFBEB]/80 border-[#F59E0B] text-[#B45309]'
                            : 'bg-[#F0FDF4]/80 border-[#15803D] text-[#15803D]'
                        }`}
                      >
                        <span className="font-bold">{item.ruleCode}</span>
                        <span>{item.status}</span>
                      </div>
                    );
                  })}

                  {/* Bottom Disclaimer */}
                  <div className="pt-2 border-t border-dashed border-[#CBD5E1] text-[9px] font-mono text-center text-[#94A3B8]">
                    CLICK AN OUTLINED DECLARATION BOX TO INSPECT STATUTORY CITATION
                  </div>
                </div>
              </div>

              {/* Sample Overall Status Summary */}
              <div className="mt-4 p-3 border font-mono text-xs flex items-center justify-between bg-white border-[#E2E8F0]">
                <div>
                  <span className="text-[10px] text-[#64748B] block">OVERALL VERDICT</span>
                  <span
                    className={`font-bold ${
                      currentSample.overallStatus === 'COMPLIANT'
                        ? 'text-[#15803D]'
                        : currentSample.overallStatus === 'NON_COMPLIANT'
                        ? 'text-[#B91C1C]'
                        : 'text-[#B45309]'
                    }`}
                  >
                    {currentSample.overallStatus}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#64748B] block">INFRACTIONS</span>
                  <span className="font-bold text-[#0A2540]">
                    {currentSample.violationsCount} STATUTORY
                  </span>
                </div>
              </div>
            </div>

            {/* Right 60%: Statutory Declaration Verification Table */}
            <div className="lg:col-span-7 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
                  <div>
                    <h3 className="text-sm font-bold text-[#0A2540] font-sans">
                      Statutory Declaration Audit Table
                    </h3>
                    <p className="text-[11px] text-[#64748B]">
                      Audit against Legal Metrology (Packaged Commodities) Rules, 2011
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#0A2540] font-bold">
                    {currentSample.declarations.length} PARAMETERS
                  </span>
                </div>

                {/* Structured Table */}
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-[#F1F5F9] text-[#475569] border-b border-[#CBD5E1]">
                        <th className="py-2.5 px-3 font-semibold">RULE</th>
                        <th className="py-2.5 px-3 font-semibold">DECLARATION</th>
                        <th className="py-2.5 px-2 font-semibold">HEIGHT</th>
                        <th className="py-2.5 px-2 font-semibold">MIN REQ</th>
                        <th className="py-2.5 px-3 font-semibold">STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {currentSample.declarations.map((dec) => {
                        const isSelected = activeHotspotId === dec.id;
                        return (
                          <tr
                            key={dec.id}
                            onClick={() => setActiveHotspotId(dec.id)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#EFF6FF]'
                                : 'hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <td className="py-2.5 px-3 font-bold text-[#0A2540]">
                              <div>{dec.ruleCode}</div>
                              <div className="text-[10px] text-[#64748B]">{dec.statutoryRule}</div>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-sans font-semibold text-[#0F172A] text-xs">
                                {dec.field}
                              </div>
                              <div className="text-[11px] text-[#475569] truncate max-w-xs">
                                {dec.extractedValue}
                              </div>
                            </td>
                            <td className="py-2.5 px-2 font-bold text-[#0F172A]">
                              {dec.measuredHeightMm}mm
                            </td>
                            <td className="py-2.5 px-2 text-[#64748B]">
                              {dec.requiredHeightMm}mm
                            </td>
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-block px-2 py-0.5 text-[10px] font-bold border ${
                                  dec.status === 'PASS'
                                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                                    : dec.status === 'FAIL'
                                    ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                                    : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                                }`}
                              >
                                {dec.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Active Hotspot Regulatory Detail Readout */}
                {activeHotspotId && (
                  <div className="mt-4 p-3 bg-[#F8FAFC] border-l-4 border-l-[#0A2540] border border-[#E2E8F0] font-sans text-xs">
                    {(() => {
                      const dec = currentSample.declarations.find((d) => d.id === activeHotspotId);
                      if (!dec) return null;
                      return (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between font-mono text-[11px]">
                            <span className="font-bold text-[#0A2540]">
                              {dec.ruleCode} &bull; {dec.statutoryRule}
                            </span>
                            <span
                              className={`font-bold ${
                                dec.status === 'PASS'
                                  ? 'text-[#15803D]'
                                  : dec.status === 'FAIL'
                                  ? 'text-[#B91C1C]'
                                  : 'text-[#B45309]'
                              }`}
                            >
                              VERDICT: {dec.status}
                            </span>
                          </div>
                          <p className="text-[#334155] text-xs leading-relaxed">
                            {dec.legalNote}
                          </p>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Bottom Inspection Actions */}
              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex flex-wrap items-center justify-between gap-3">
                <span className="text-[11px] font-mono text-[#64748B]">
                  Based on Legal Metrology GSR 202(E) Table I Numerals
                </span>
                <Link
                  href="/scan"
                  className="px-4 py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-semibold text-xs transition-colors flex items-center gap-2 border-t border-t-[#EA580C]"
                >
                  <span>Launch Live Scanner</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATUTORY RULES MATRIX (PCR-001 TO PCR-010) */}
      <section id="rules-matrix" className="py-12 bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="border-b border-[#E2E8F0] pb-4 flex flex-col md:flex-row md:items-end justify-between gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block">
                STATUTORY REFERENCE FRAMEWORK
              </span>
              <h2 className="text-2xl font-bold text-[#0A2540] font-sans">
                Legal Metrology Rules Matrix (GSR 202(E))
              </h2>
              <p className="text-xs text-[#475569] mt-0.5">
                The 10 mandatory declarations enforced under the Legal Metrology (Packaged Commodities) Rules, 2011.
              </p>
            </div>
            <div className="text-right font-mono text-xs text-[#64748B]">
              SIH 2026 Problem Statement 26034
            </div>
          </div>

          <div className="border border-[#CBD5E1] overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] text-[#0A2540] border-b border-[#CBD5E1]">
                  <th className="py-3 px-4 font-bold">CODE</th>
                  <th className="py-3 px-4 font-bold">STATUTORY SECTION</th>
                  <th className="py-3 px-4 font-bold">MANDATORY DECLARATION</th>
                  <th className="py-3 px-4 font-bold">STATUTORY REQUIREMENT</th>
                  <th className="py-3 px-4 font-bold">SEVERITY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] bg-white">
                {STATUTORY_RULES.map((rule) => (
                  <tr key={rule.code} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 font-bold text-[#0A2540]">{rule.code}</td>
                    <td className="py-3 px-4 text-[#475569]">{rule.section}</td>
                    <td className="py-3 px-4 font-sans font-semibold text-[#0F172A]">
                      {rule.name}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs text-[#475569]">
                      {rule.req}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 text-[10px] font-bold border ${
                          rule.severity === 'HIGH'
                            ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                            : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                        }`}
                      >
                        {rule.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CORE REGULATORY PRINCIPLES */}
      <section className="py-12 bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="border-b border-[#E2E8F0] pb-3 mb-6">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] block">
              ARCHITECTURE & ASSURANCE
            </span>
            <h2 className="text-xl font-bold text-[#0A2540] font-sans">
              Core Principles of Digital Metrology Verification
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Principle 1 */}
            <div className="p-5 bg-white border border-[#CBD5E1] space-y-3">
              <div className="w-8 h-8 bg-[#0A2540] text-white flex items-center justify-center font-bold text-sm">
                01
              </div>
              <h3 className="font-bold text-base text-[#0A2540] font-sans">
                Optical Extraction with Geometry Calibration
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Extracts declaration text while accurately calculating the physical Principal Display Panel (PDP) area in cm² and typographical numeral heights in mm.
              </p>
            </div>

            {/* Principle 2 */}
            <div className="p-5 bg-white border border-[#CBD5E1] space-y-3">
              <div className="w-8 h-8 bg-[#0A2540] text-white flex items-center justify-center font-bold text-sm border-b-2 border-b-[#EA580C]">
                02
              </div>
              <h3 className="font-bold text-base text-[#0A2540] font-sans">
                Strict Deterministic Rule Engine
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Zero AI hallucination in legal adjudication. Statutory compliance decisions are determined exclusively by hardcoded rules matching the Legal Metrology Act, 2009.
              </p>
            </div>

            {/* Principle 3 */}
            <div className="p-5 bg-white border border-[#CBD5E1] space-y-3">
              <div className="w-8 h-8 bg-[#0A2540] text-white flex items-center justify-center font-bold text-sm">
                03
              </div>
              <h3 className="font-bold text-base text-[#0A2540] font-sans">
                Field Officer Verification & Review
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                When optical confidence is below 0.90 or declarations are ambiguous, the system flags the parameter for human inspector sign-off, ensuring total accountability.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* INSTITUTIONAL FOOTER */}
      <footer className="bg-white border-t border-[#E2E8F0] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-8 border-b border-[#E2E8F0]">
            {/* Col 1: Institutional Identity */}
            <div className="space-y-3 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[#0A2540] text-white flex items-center justify-center font-bold text-xs border-b-2 border-b-[#EA580C]">
                  P
                </div>
                <div>
                  <span className="font-bold text-base tracking-wider text-[#0A2540] font-sans">
                    PARAKH
                  </span>
                  <span className="block text-[10px] font-mono text-[#64748B]">
                    Packaged Commodity Compliance Verification System
                  </span>
                </div>
              </div>
              <p className="text-xs text-[#475569] leading-relaxed max-w-md">
                Automated statutory inspection platform evaluating pre-packaged commodities against the Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E)).
              </p>
              <div className="text-[11px] font-mono text-[#64748B]">
                Smart India Hackathon 2026 &bull; Problem Statement 26034
              </div>
            </div>

            {/* Col 2: Navigation Links */}
            <div>
              <span className="text-[11px] font-mono font-bold text-[#0A2540] uppercase tracking-wider block mb-3">
                Inspection Modules
              </span>
              <ul className="space-y-2 text-xs font-sans text-[#475569]">
                <li>
                  <Link href="/scan" className="hover:text-[#0A2540] hover:underline">
                    Scan New Package
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-[#0A2540] hover:underline">
                    Inspector Dashboard
                  </Link>
                </li>
                <li>
                  <Link href="/inspections" className="hover:text-[#0A2540] hover:underline">
                    Inspection Records Log
                  </Link>
                </li>
                <li>
                  <Link href="/reports" className="hover:text-[#0A2540] hover:underline">
                    Statutory Reports Archive
                  </Link>
                </li>
                <li>
                  <Link href="/compare" className="hover:text-[#0A2540] hover:underline">
                    Label Declaration Comparison
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Compliance Framework Reference */}
            <div>
              <span className="text-[11px] font-mono font-bold text-[#0A2540] uppercase tracking-wider block mb-3">
                Statutory Standards
              </span>
              <ul className="space-y-1.5 text-[11px] font-mono text-[#64748B]">
                <li>Legal Metrology Act, 2009</li>
                <li>Packaged Commodities Rules, 2011</li>
                <li>Notification GSR 202(E)</li>
                <li>Table I Numeral Height Standard</li>
                <li>FSSAI Packing Intersections</li>
              </ul>
              <div className="mt-3 text-[10px] text-[#94A3B8]">
                Standard: ISO/IEC 17020 Guidelines
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#64748B] gap-4">
            <div>
              &copy; 2026 PARAKH &bull; Packaged Commodity Compliance Verification System.
            </div>
            <div className="flex items-center gap-4 text-[11px] font-mono">
              <span>Platform Version: 2.4.0</span>
              <span>&bull;</span>
              <span>Last Updated: September 2026</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

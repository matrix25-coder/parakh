'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';

interface ScanSummary {
  id: string;
  scan_id: string;
  product: string;
  category: string;
  date: string;
  status: 'PASS' | 'FAIL' | 'REVIEW';
  violations: number;
}

interface ScanDetail {
  id: string;
  product_name: string;
  overall_status: string;
  violations_count: number;
  extractedData?: any;
  complianceResult?: any;
}

interface FieldDiff {
  field: string;
  rule: string;
  valA: string;
  valB: string;
  type: 'IDENTICAL' | 'CHANGED' | 'ADDED' | 'REMOVED';
}

export default function CompareLabelsPage() {
  const [scans, setScans] = useState<ScanSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [scanAId, setScanAId] = useState<string>('');
  const [scanBId, setScanBId] = useState<string>('');
  const [scanA, setScanA] = useState<ScanDetail | null>(null);
  const [scanB, setScanB] = useState<ScanDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadScans() {
      try {
        const res = await fetch('/api/history');
        if (res.ok) {
          const data = await res.json();
          const list: ScanSummary[] = data.scans || [];
          setScans(list);
          if (list.length >= 2) {
            setScanAId(list[1].id);
            setScanBId(list[0].id);
          } else if (list.length === 1) {
            setScanAId(list[0].id);
          }
        }
      } catch (e) {
        console.error('Failed to load scan history for comparison:', e);
      } finally {
        setLoadingHistory(false);
      }
    }
    loadScans();
  }, []);

  useEffect(() => {
    async function loadDetails() {
      if (!scanAId || !scanBId || scanAId === scanBId) {
        setScanA(null);
        setScanB(null);
        return;
      }
      setLoadingDetail(true);
      setError(null);
      try {
        const [resA, resB] = await Promise.all([
          fetch(`/api/scan/${scanAId}`),
          fetch(`/api/scan/${scanBId}`),
        ]);

        if (!resA.ok || !resB.ok) {
          throw new Error('Failed to load scan details for comparison.');
        }

        const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
        setScanA(dataA.scan || dataA);
        setScanB(dataB.scan || dataB);
      } catch (err: any) {
        setError(err.message || 'Error comparing scans');
      } finally {
        setLoadingDetail(false);
      }
    }
    loadDetails();
  }, [scanAId, scanBId]);

  const computeDiffs = (): FieldDiff[] => {
    if (!scanA || !scanB) return [];

    const extA = scanA.extractedData || {};
    const extB = scanB.extractedData || {};

    const fields = [
      {
        field: 'Maximum Retail Price (MRP)',
        rule: 'PCR-006 & Rule 6(1)(e)',
        valA: extA.mrp?.raw_text || (extA.mrp?.amount ? `₹ ${extA.mrp.amount}` : 'Not declared'),
        valB: extB.mrp?.raw_text || (extB.mrp?.amount ? `₹ ${extB.mrp.amount}` : 'Not declared'),
      },
      {
        field: 'Net Quantity & Metric Unit',
        rule: 'PCR-003, PCR-004 & Rule 12',
        valA: extA.net_quantity?.raw_text || (extA.net_quantity?.declared_value ? `${extA.net_quantity.declared_value} ${extA.net_quantity.declared_unit || ''}` : 'Not declared'),
        valB: extB.net_quantity?.raw_text || (extB.net_quantity?.declared_value ? `${extB.net_quantity.declared_value} ${extB.net_quantity.declared_unit || ''}` : 'Not declared'),
      },
      {
        field: 'Manufacturer / Packer Details',
        rule: 'PCR-001 & Rule 6(1)(a)',
        valA: extA.manufacturer_packer?.raw_text || extA.manufacturer_packer?.name || 'Not declared',
        valB: extB.manufacturer_packer?.raw_text || extB.manufacturer_packer?.name || 'Not declared',
      },
      {
        field: 'Consumer Care Address & Contact',
        rule: 'PCR-009 & Rule 6(1)(f)',
        valA: extA.consumer_care?.raw_text || extA.consumer_care?.phone || extA.consumer_care?.email || 'Not declared',
        valB: extB.consumer_care?.raw_text || extB.consumer_care?.phone || extB.consumer_care?.email || 'Not declared',
      },
      {
        field: 'Date of Packing / Manufacture',
        rule: 'PCR-007 & Rule 6(1)(d)',
        valA: extA.dates_marking?.raw_text || extA.dates_marking?.date_of_manufacture_or_packaging || 'Not declared',
        valB: extB.dates_marking?.raw_text || extB.dates_marking?.date_of_manufacture_or_packaging || 'Not declared',
      },
      {
        field: 'Country of Origin',
        rule: 'PCR-008 & Rule 6(1)(da)',
        valA: extA.country_of_origin?.raw_text || extA.country_of_origin?.country || 'Not declared',
        valB: extB.country_of_origin?.raw_text || extB.country_of_origin?.country || 'Not declared',
      },
      {
        field: 'Unit Sale Price (USP)',
        rule: 'Rule 6(1)(e) Proviso',
        valA: extA.unit_sale_price?.raw_text || (extA.unit_sale_price?.price_per_unit ? `₹ ${extA.unit_sale_price.price_per_unit} / ${extA.unit_sale_price.unit || ''}` : 'Not declared'),
        valB: extB.unit_sale_price?.raw_text || (extB.unit_sale_price?.price_per_unit ? `₹ ${extB.unit_sale_price.price_per_unit} / ${extB.unit_sale_price.unit || ''}` : 'Not declared'),
      },
    ];

    return fields.map((f) => {
      const isMissingA = f.valA === 'Not declared';
      const isMissingB = f.valB === 'Not declared';
      let type: FieldDiff['type'] = 'IDENTICAL';

      if (isMissingA && !isMissingB) {
        type = 'ADDED';
      } else if (!isMissingA && isMissingB) {
        type = 'REMOVED';
      } else if (f.valA !== f.valB) {
        type = 'CHANGED';
      }

      return {
        ...f,
        type,
      };
    });
  };

  const diffs = computeDiffs();
  const changedCount = diffs.filter((d) => d.type !== 'IDENTICAL').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Label Version Comparison & Delta Audit"
        description="Cross-examine packaging revisions between two inspection records to identify added, removed, or changed statutory declarations."
        actions={
          <Link
            href="/scan"
            className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] shadow-xs"
          >
            + Scan New Commodity
          </Link>
        }
      />

      {/* Scan Selector Header */}
      <div className="bg-white border border-[#CBD5E1] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <span className="text-xs font-mono font-bold text-[#0A2540] uppercase tracking-wider">
            Select Inspection Records to Compare
          </span>
          <span className="text-[11px] font-mono text-[#64748B]">
            {scans.length} completed inspection(s) in repository
          </span>
        </div>

        {loadingHistory ? (
          <div className="p-4 text-center font-mono text-xs text-[#64748B]">
            Loading historical inspection records...
          </div>
        ) : scans.length < 2 ? (
          <div className="p-8 border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center space-y-3">
            <p className="font-sans text-sm font-bold text-[#0F172A]">
              Insufficient Scans for Delta Comparison
            </p>
            <p className="font-mono text-xs text-[#64748B] max-w-md mx-auto">
              At least two completed commodity package inspections are required to compute statutory delta diffs.
            </p>
            <div className="pt-2">
              <Link
                href="/scan"
                className="inline-block px-5 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors"
              >
                Launch Scanner &rarr;
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            <div>
              <label className="block text-[#64748B] mb-1 font-bold">Baseline Inspection (Record A):</label>
              <select
                value={scanAId}
                onChange={(e) => setScanAId(e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#0A2540]"
              >
                <option value="">Select Baseline Scan...</option>
                {scans.map((s) => (
                  <option key={`a-${s.id}`} value={s.id} disabled={s.id === scanBId}>
                    {s.product} ({s.date}) — [{s.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#64748B] mb-1 font-bold">Comparison Inspection (Record B):</label>
              <select
                value={scanBId}
                onChange={(e) => setScanBId(e.target.value)}
                className="w-full p-2.5 border border-[#CBD5E1] bg-white text-[#0F172A] focus:outline-none focus:border-[#0A2540]"
              >
                <option value="">Select Comparison Scan...</option>
                {scans.map((s) => (
                  <option key={`b-${s.id}`} value={s.id} disabled={s.id === scanAId}>
                    {s.product} ({s.date}) — [{s.status}]
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-[#FEF2F2] border-l-4 border-l-[#B91C1C] text-xs font-mono text-[#B91C1C]">
          {error}
        </div>
      )}

      {loadingDetail && (
        <div className="p-8 bg-white border border-[#CBD5E1] text-center font-mono text-xs text-[#64748B] flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-[#0A2540] border-t-transparent animate-spin"></span>
          <span>Comparing statutory declarations across selected inspections...</span>
        </div>
      )}

      {scanA && scanB && !loadingDetail && (
        <>
          {/* Two-Pane Comparison Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scan A Summary Card */}
            <div className="bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                    RECORD A (BASELINE)
                  </span>
                  <h3 className="text-sm font-bold text-[#0A2540] font-sans">
                    {scanA.product_name}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold ${
                    scanA.overall_status === 'PASS'
                      ? 'text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]'
                      : scanA.overall_status === 'FAIL'
                      ? 'text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]'
                      : 'text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]'
                  }`}
                >
                  {scanA.overall_status} ({scanA.violations_count} VIOLATIONS)
                </span>
              </div>
              <div className="text-xs font-mono text-[#475569]">
                Scan Reference: <code className="text-[#0A2540] font-bold">{scanA.id}</code>
              </div>
            </div>

            {/* Scan B Summary Card */}
            <div className="bg-white border-2 border-[#0A2540] p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-[#0A2540] block font-bold">
                    RECORD B (COMPARISON)
                  </span>
                  <h3 className="text-sm font-bold text-[#0A2540] font-sans">
                    {scanB.product_name}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-mono font-bold ${
                    scanB.overall_status === 'PASS'
                      ? 'text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]'
                      : scanB.overall_status === 'FAIL'
                      ? 'text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]'
                      : 'text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]'
                  }`}
                >
                  {scanB.overall_status} ({scanB.violations_count} VIOLATIONS)
                </span>
              </div>
              <div className="text-xs font-mono text-[#475569]">
                Scan Reference: <code className="text-[#0A2540] font-bold">{scanB.id}</code>
              </div>
            </div>
          </div>

          {/* Delta Analysis Table */}
          <div className="bg-white border border-[#CBD5E1] p-6 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3 font-mono">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                  Declaration Change Audit Trail
                </h3>
                <p className="text-[11px] text-[#64748B] font-sans mt-0.5">
                  Side-by-side verification of extracted declarations impacting Legal Metrology compliance.
                </p>
              </div>
              <span className="text-xs font-bold text-[#0A2540]">
                {changedCount} Statutory Difference(s) Identified
              </span>
            </div>

            <div className="border border-[#CBD5E1] overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#0A2540] uppercase text-[10px]">
                    <th className="p-3 border-r border-[#CBD5E1] font-bold">Statutory Field</th>
                    <th className="p-3 border-r border-[#CBD5E1] font-bold">Rule Section</th>
                    <th className="p-3 border-r border-[#CBD5E1] font-bold">Record A (Baseline)</th>
                    <th className="p-3 border-r border-[#CBD5E1] font-bold">Record B (Comparison)</th>
                    <th className="p-3 font-bold">Delta Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-[11px] bg-white">
                  {diffs.map((diff) => (
                    <tr key={diff.field} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 font-bold font-sans text-[#0F172A] border-r border-[#CBD5E1]">
                        {diff.field}
                      </td>
                      <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                        {diff.rule}
                      </td>
                      <td className="p-3 text-[#334155] border-r border-[#CBD5E1]">
                        {diff.valA}
                      </td>
                      <td className="p-3 text-[#0F172A] font-medium border-r border-[#CBD5E1]">
                        {diff.valB}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                            diff.type === 'IDENTICAL'
                              ? 'text-[#64748B] bg-[#F1F5F9]'
                              : diff.type === 'ADDED'
                              ? 'text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]'
                              : diff.type === 'REMOVED'
                              ? 'text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]'
                              : 'text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]'
                          }`}
                        >
                          {diff.type}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

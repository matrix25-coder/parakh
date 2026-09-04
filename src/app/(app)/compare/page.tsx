'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui';

export default function CompareLabelsPage() {
  const comparisonDiffs = [
    {
      field: 'Maximum Retail Price (MRP)',
      rule: 'PCR-006 & Rule 6(1)(e)',
      before: 'Missing / No declaration detected',
      after: '₹ 55.00 (inclusive of all taxes)',
      type: 'ADDED',
      complianceEffect: 'RESOLVED (Passed mandatory declaration check)',
      beforeStatus: 'FAIL',
      afterStatus: 'PASS',
    },
    {
      field: 'Consumer Care Toll-Free Phone',
      rule: 'PCR-009 & Rule 6(1)(f)',
      before: 'Tel: 1800-222-333, Email: care@nutri.in',
      after: 'Email: care@nutri.in (Phone number omitted)',
      type: 'REMOVED_PARTIAL',
      complianceEffect: 'REVIEW REQUIRED (Toll-free telephone number omitted)',
      beforeStatus: 'PASS',
      afterStatus: 'REVIEW',
    },
    {
      field: 'Net Quantity & Unit Symbol',
      rule: 'PCR-003, PCR-004 & Rule 12',
      before: '150 g (Compliant unit)',
      after: '140 g (Shrinkflation -10g, unit preserved)',
      type: 'CHANGED',
      complianceEffect: 'LEGAL (Standard metric unit symbol preserved)',
      beforeStatus: 'PASS',
      afterStatus: 'PASS',
    },
    {
      field: 'Unit Sale Price (USP)',
      rule: 'Rule 6(1)(e) Proviso (2021 Amendment)',
      before: 'Not declared on older batch package',
      after: '₹ 0.39 / g (Prominently declared)',
      type: 'ADDED',
      complianceEffect: 'RESOLVED (Complies with mandatory USP amendment)',
      beforeStatus: 'FAIL',
      afterStatus: 'PASS',
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Label Version Comparison & Delta Audit"
        description="Cross-examine packaging revisions between consecutive production batches to identify added, removed, or changed statutory declarations."
        actions={
          <Link
            href="/scan"
            className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] shadow-xs"
          >
            + Scan New Batch
          </Link>
        }
      />

      {/* Two-Pane Batch Canvas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Prior Package Card */}
        <div className="bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                PRIOR BATCH (BATCH 2025-Q4)
              </span>
              <h3 className="text-sm font-bold text-[#0A2540] font-sans">
                Baseline Packaging Sample
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]">
              BEFORE: FAIL
            </span>
          </div>

          <div className="h-44 border-2 border-dashed border-[#CBD5E1] bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#64748B] mb-2">
              <rect x="3" y="3" width="18" height="18" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="text-xs font-mono font-bold text-[#0F172A]">nutricrunch_batch_2025q4.jpg</span>
            <span className="text-[11px] text-[#64748B] font-mono mt-1">MRP Missing &bull; USP Missing</span>
          </div>
        </div>

        {/* Revised Package Card */}
        <div className="bg-white border-2 border-[#15803D] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#15803D] font-bold block">
                REVISED BATCH (BATCH 2026-Q3)
              </span>
              <h3 className="text-sm font-bold text-[#0A2540] font-sans">
                Current Production Sample
              </h3>
            </div>
            <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]">
              AFTER: PASS
            </span>
          </div>

          <div className="h-44 border-2 border-dashed border-[#BBF7D0] bg-[#F0FDF4] flex flex-col items-center justify-center p-4 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#15803D] mb-2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span className="text-xs font-mono font-bold text-[#0F172A]">nutricrunch_revised_2026q3.jpg</span>
            <span className="text-[11px] text-[#15803D] font-mono mt-1">MRP Added (₹55) &bull; USP Added (₹0.39/g)</span>
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
              Side-by-side verification of declarations impacting Legal Metrology compliance.
            </p>
          </div>
          <span className="text-xs font-bold text-[#0A2540]">
            4 Statutory Differences Identified
          </span>
        </div>

        <div className="border border-[#CBD5E1] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#0A2540] uppercase text-[10px]">
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Statutory Field</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Rule Section</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Before (Old Batch)</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">After (New Batch)</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Change Type</th>
                <th className="p-3 font-bold">Statutory Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] text-[11px] bg-white">
              {comparisonDiffs.map((diff) => (
                <tr key={diff.field} className="hover:bg-[#F8FAFC]">
                  <td className="p-3 font-bold font-sans text-[#0F172A] border-r border-[#CBD5E1]">
                    {diff.field}
                  </td>
                  <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                    {diff.rule}
                  </td>
                  <td className="p-3 text-[#B91C1C] border-r border-[#CBD5E1] bg-[#FEF2F2]">
                    {diff.before}
                  </td>
                  <td className="p-3 text-[#15803D] font-bold border-r border-[#CBD5E1] bg-[#F0FDF4]">
                    {diff.after}
                  </td>
                  <td className="p-3 border-r border-[#CBD5E1]">
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                        diff.type === 'ADDED'
                          ? 'text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]'
                          : diff.type === 'REMOVED_PARTIAL'
                          ? 'text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]'
                          : 'text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]'
                      }`}
                    >
                      {diff.type.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 font-sans font-medium text-[#0F172A]">
                    {diff.complianceEffect}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

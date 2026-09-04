'use client';

import React from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge } from '@/components/ui';

export default function ReportsArchivePage() {
  const reports = [
    { id: '1', ref: 'PARAKH/LMPC/2026/001', product: 'NutriCrunch Almond Butter Cookies', category: 'FOOD', status: 'NON_COMPLIANT' as const, date: '2026-09-04', violations: 1 },
    { id: '2', ref: 'PARAKH/LMPC/2026/002', product: 'Himalayan Herbal Green Tea 100g', category: 'FOOD', status: 'COMPLIANT' as const, date: '2026-09-03', violations: 0 },
    { id: '3', ref: 'PARAKH/LMPC/2026/003', product: 'LuxeGlow Botanical Face Cream 50g', category: 'COSMETICS', status: 'COMPLIANT' as const, date: '2026-09-03', violations: 0 },
    { id: '4', ref: 'PARAKH/LMPC/2026/004', product: 'TechPro Braided USB-C Cable 1.5m', category: 'ELECTRONICS', status: 'NEEDS_REVIEW' as const, date: '2026-09-02', violations: 0 },
    { id: '5', ref: 'PARAKH/LMPC/2026/005', product: 'Royal Heritage Basmati Rice 5kg', category: 'FOOD', status: 'NON_COMPLIANT' as const, date: '2026-09-01', violations: 2 },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Reports Archive"
        description="Master repository of officially signed statutory compliance certificates generated under Legal Metrology Rules."
      />

      <div className="border border-[#CBD5E1] bg-white overflow-x-auto shadow-xs">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#0A2540] uppercase text-[10px]">
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Certificate Reference</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Commodity Name</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Category</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Issued Date</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Legal Verdict</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Violations</th>
              <th className="p-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-[11px] bg-white">
            {reports.map((r) => (
              <tr key={r.ref} className="hover:bg-[#F8FAFC]">
                <td className="p-3 font-bold text-[#0A2540] border-r border-[#CBD5E1]">
                  {r.ref}
                </td>
                <td className="p-3 font-sans font-bold text-[#0F172A] border-r border-[#CBD5E1]">
                  {r.product}
                </td>
                <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                  {r.category}
                </td>
                <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                  {r.date}
                </td>
                <td className="p-3 border-r border-[#CBD5E1]">
                  <StatusBadge status={r.status} />
                </td>
                <td className="p-3 border-r border-[#CBD5E1]">
                  <span className={r.violations > 0 ? 'text-[#B91C1C] font-bold' : 'text-[#64748B]'}>
                    {r.violations}
                  </span>
                </td>
                <td className="p-3 text-right font-sans">
                  <Link
                    href={`/scan/${r.id}/report`}
                    className="px-3 py-1 bg-[#0A2540] hover:bg-[#1E3A8A] text-white text-xs font-bold font-mono transition-colors border-t border-t-[#EA580C] shadow-xs"
                  >
                    View Certificate &rarr;
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

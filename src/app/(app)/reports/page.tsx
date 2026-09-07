'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge } from '@/components/ui';
import { getApiUrl } from '@/lib/api-config';
import type { ComplianceStatus } from '@/lib/types';

interface ReportArchiveItem {
  id: string;
  ref: string;
  product: string;
  category: string;
  status: ComplianceStatus;
  date: string;
  violations: number;
}

export default function ReportsArchivePage() {
  const [reports, setReports] = useState<ReportArchiveItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch(getApiUrl('/api/history'))
      .then((res) => res.json())
      .then((data) => {
        if (data.scans && Array.isArray(data.scans)) {
          const dynamicReports: ReportArchiveItem[] = data.scans.map((s: any, idx: number) => ({
            id: String(s.id),
            ref: `PARAKH/LMPC/2026/${String(s.scan_id || idx + 1).padStart(3, '0')}`,
            product: s.product || 'Packaged Commodity',
            category: s.category || 'FOOD',
            status: s.status as ComplianceStatus,
            date: s.date || new Date().toISOString().split('T')[0],
            violations: s.violations ?? 0,
          }));

          setReports(dynamicReports);
        }
      })
      .catch((err) => console.warn('Could not load reports history:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = reports.filter((r) =>
    r.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Reports Archive"
        description="Master repository of officially signed statutory compliance certificates generated under Legal Metrology Rules."
        actions={
          <Link
            href="/scan"
            className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] shadow-xs"
          >
            + New Inspection
          </Link>
        }
      />

      {/* Filter and Search */}
      <div className="flex items-center gap-3 p-3 bg-white border border-[#CBD5E1] shadow-xs">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#64748B]">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Filter certificates by reference number, commodity name, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 text-xs font-mono bg-transparent focus:outline-none text-[#0F172A] placeholder-[#94A3B8]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-xs font-mono text-[#64748B] hover:text-[#0F172A] cursor-pointer px-2"
          >
            Clear
          </button>
        )}
      </div>

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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[#64748B] font-mono text-xs">
                  {isLoading ? 'Loading certificates archive...' : 'No inspection certificates found matching query.'}
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
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
                      className="px-3 py-1 bg-[#0A2540] hover:bg-[#1E3A8A] text-white text-xs font-bold font-mono transition-colors border-t border-t-[#EA580C] shadow-xs inline-block"
                    >
                      View Certificate &rarr;
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

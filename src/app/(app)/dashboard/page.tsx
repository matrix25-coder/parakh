'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, MetricCard, StatusBadge } from '@/components/ui';
import { getApiUrl } from '@/lib/api-config';
const INITIAL_DASHBOARD = {
  totalInspections: 0,
  compliant: 0,
  violations: 0,
  reviewRequired: 0,
  recentInspections: [] as Array<{
    id: string;
    scan_id: string;
    product: string;
    category: string;
    date: string;
    status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
    violations: number;
    inspector: string;
  }>,
  topViolations: [] as Array<{ rule_code: string; title: string; count: number }>,
};

export default function DashboardPage() {
  const [stats, setStats] = useState(INITIAL_DASHBOARD);

  useEffect(() => {
    fetch(getApiUrl('/api/dashboard/stats'))
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.totalInspections === 'number') {
          setStats({
            totalInspections: data.totalInspections,
            compliant: data.compliant,
            violations: data.violations,
            reviewRequired: data.reviewRequired,
            recentInspections: Array.isArray(data.recentInspections) ? data.recentInspections : [],
            topViolations: Array.isArray(data.topViolations) ? data.topViolations : [],
          });
        }
      })
      .catch((err) => console.warn('Could not fetch dashboard stats:', err));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Inspector Dashboard"
        description="Enforcement monitoring command centre tracking statutory packaged commodity compliance across surveyed retail batches."
        actions={
          <Link
            href="/scan"
            className="px-5 py-2.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] flex items-center gap-2 shadow-xs"
          >
            <span>+ Scan New Product</span>
          </Link>
        }
      />

      {/* Institutional Reference Banner */}
      <div className="p-3 bg-white border border-[#CBD5E1] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between text-[#0A2540] gap-2 shadow-xs">
        <span className="font-bold flex items-center gap-2">
          <span className="w-2 h-2 bg-[#EA580C]"></span>
          PARAKH STATUTORY AUDIT &bull; ACTIVE INSPECTION LOG
        </span>
        <span className="text-[11px] text-[#64748B]">Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E))</span>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Inspections"
          value={stats.totalInspections}
          subtext="Packaged commodities audited"
          statusColor="text-[#0A2540]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0A2540]">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
        />
        <MetricCard
          label="Compliant Products"
          value={stats.compliant}
          subtext={`Zero statutory infractions (${stats.totalInspections > 0 ? Math.round((stats.compliant / stats.totalInspections) * 100) : 0}%)`}
          statusColor="text-[#15803D]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#15803D]">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          }
        />
        <MetricCard
          label="Statutory Violations"
          value={stats.violations}
          subtext="Actionable Section 36 notices"
          statusColor="text-[#B91C1C]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#B91C1C]">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          }
        />
        <MetricCard
          label="Review Required"
          value={stats.reviewRequired}
          subtext="Confidence < 0.90 threshold"
          statusColor="text-[#B45309]"
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#B45309]">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
        />
      </div>

      {/* Split Grid: Recent Inspections (60%) vs Common Violations (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 60%: Recent Inspections Table */}
        <div className="lg:col-span-7 bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
                AUDIT RECORD LOG
              </span>
              <h3 className="text-sm font-bold text-[#0A2540] mt-0.5 font-sans">
                Recent Physical Inspections
              </h3>
            </div>
            <Link
              href="/inspections"
              className="text-xs font-mono font-bold text-[#0A2540] hover:underline"
            >
              View All History &rarr;
            </Link>
          </div>

          <div className="border border-[#CBD5E1] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] font-mono text-[#0A2540] uppercase text-[10px]">
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Scan ID</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Product Name</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Category</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Verdict</th>
                  <th className="p-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px] bg-white">
                {stats.recentInspections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-[#64748B] font-mono text-xs">
                      No inspections recorded yet. Start by scanning a packaged commodity label.
                    </td>
                  </tr>
                ) : (
                  stats.recentInspections.map((row) => (
                    <tr key={row.scan_id} className="hover:bg-[#F8FAFC]">
                      <td className="p-3 font-bold text-[#0A2540] border-r border-[#CBD5E1]">
                        {row.scan_id}
                      </td>
                      <td className="p-3 font-sans font-bold text-[#0F172A] border-r border-[#CBD5E1] max-w-[150px] truncate">
                        {row.product}
                      </td>
                      <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                        {row.category}
                      </td>
                      <td className="p-3 border-r border-[#CBD5E1]">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/scan/${row.id}/results`}
                          className="text-xs font-bold text-[#0A2540] hover:underline"
                        >
                          Inspect &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 40%: Top Infraction Analysis */}
        <div className="lg:col-span-5 bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
          <div className="border-b border-[#E2E8F0] pb-3">
            <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
              STATUTORY ENFORCEMENT FREQUENCY
            </span>
            <h3 className="text-sm font-bold text-[#0A2540] mt-0.5 font-sans">
              Top Non-Compliant Rules Observed
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {stats.topViolations.length === 0 ? (
              <div className="p-6 border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-[#64748B] text-xs font-mono">
                No statutory infractions recorded in database.
              </div>
            ) : (
              stats.topViolations.map((v) => {
                const maxCount = 10;
                const widthPct = Math.round((v.count / maxCount) * 100);

                return (
                  <div key={v.rule_code} className="p-3 border border-[#CBD5E1] bg-[#F8FAFC] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#B91C1C]">{v.rule_code}</span>
                      <span className="text-[#64748B] text-[11px]">{v.count} violations detected</span>
                    </div>
                    <div className="text-[11px] font-sans text-[#0F172A] font-semibold">
                      {v.title}
                    </div>
                    <div className="w-full h-1.5 bg-[#E2E8F0]">
                      <div
                        className="h-full bg-[#B91C1C]"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

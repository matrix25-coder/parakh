'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MetricCard, StatusBadge } from '@/components/ui';
import { getApiUrl } from '@/lib/api-config';

interface RecentInspectionItem {
  id: string;
  scan_id: string;
  product: string;
  category: string;
  date: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
  violations: number;
  inspector: string;
}

interface TopViolationItem {
  rule_code: string;
  title: string;
  count: number;
}

const INITIAL_DASHBOARD = {
  totalInspections: 0,
  compliant: 0,
  violations: 0,
  reviewRequired: 0,
  recentInspections: [] as RecentInspectionItem[],
  topViolations: [] as TopViolationItem[],
};

export default function DashboardPage() {
  const [stats, setStats] = useState(INITIAL_DASHBOARD);
  const [officerUser, setOfficerUser] = useState<{ name: string; email: string } | null>(null);
  const [activeScan, setActiveScan] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Check local session officer credentials
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('parakh_user');
      if (storedUser) {
        try {
          setOfficerUser(JSON.parse(storedUser));
        } catch {}
      }

      // Check for active / latest inspection from client storage
      try {
        const rawLatest = sessionStorage.getItem('parakh_latest_scan') || localStorage.getItem('parakh_latest_scan');
        if (rawLatest) {
          const parsed = JSON.parse(rawLatest);
          if (parsed && parsed.id) {
            setActiveScan(parsed);
          }
        }
      } catch {}
    }

    // 2. Fetch authenticated officer identity
    fetch(getApiUrl('/api/auth/me'))
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setOfficerUser(data.user);
        }
      })
      .catch(() => {});

    // 3. Fetch server dashboard metrics
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
      .catch((err) => {
        console.warn('Could not fetch server dashboard stats:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Filter inspections requiring officer verification
  const reviewQueue = stats.recentInspections.filter((s) => s.status === 'NEEDS_REVIEW');

  return (
    <div data-testid="officer-dashboard" className="space-y-6 max-w-7xl mx-auto py-2">
      {/* ── 1. OFFICIAL INSTITUTIONAL HEADER ── */}
      <header className="bg-white border border-[#CBD5E1] p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-mono text-[11px] text-[#475569]">
            <span className="w-2.5 h-2.5 bg-[#EA580C]"></span>
            <span className="font-semibold text-[#0F172A] uppercase tracking-wider">
              Department of Consumer Affairs &bull; Legal Metrology Division
            </span>
            <span className="text-[#CBD5E1] hidden sm:inline">|</span>
            <span className="text-[10px] text-[#64748B] hidden sm:inline">GSR 202(E) Rules</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-tight text-[#0A2540]">
            PARAKH &bull; Enforcement Command Center
          </h1>
          <p className="text-xs text-[#475569] font-sans">
            Statutory Packaged Commodities Compliance Inspection System under Legal Metrology Act, 2009.
          </p>
        </div>

        {/* Right side: Officer Session & Prominent Primary Action */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-left md:text-right font-mono text-xs border-l md:border-l-0 md:border-r border-[#CBD5E1] pl-3 md:pl-0 md:pr-3 space-y-0.5">
            <div className="flex items-center gap-1.5 md:justify-end">
              <span className="w-2 h-2 rounded-full bg-[#15803D]"></span>
              <span className="text-[10px] text-[#15803D] font-bold uppercase tracking-wider">
                Terminal Active
              </span>
            </div>
            <div className="font-bold text-[#0A2540] truncate max-w-[180px]">
              {officerUser?.name || 'Field Enforcement Officer'}
            </div>
            <div className="text-[10px] text-[#64748B] truncate max-w-[180px]">
              {officerUser?.email || 'officer@parakh.gov.in'}
            </div>
          </div>

          {/* PRIMARY ACTION: Most prominent action immediately visible without scrolling */}
          <Link
            href="/scan"
            className="px-5 py-2.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>+ Start New Inspection</span>
            <span>&rarr;</span>
          </Link>
        </div>
      </header>

      {/* ── 2. ACTIVE INSPECTION SECTION ── */}
      {activeScan ? (
        <div className="bg-[#0A2540] border-l-4 border-l-[#EA580C] text-white p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-[#EA580C] animate-pulse"></span>
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-orange-300">
                  Active Physical Inspection in Session
                </span>
                <h2 className="text-base sm:text-lg font-bold font-sans text-white mt-0.5">
                  {activeScan.product_name || activeScan.extractedData?.productName || 'Packaged Commodity Audit'}
                </h2>
              </div>
            </div>

            <Link
              href={`/scan/${activeScan.id}/results`}
              className="px-4 py-2 bg-[#EA580C] hover:bg-orange-600 text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 shadow-xs"
            >
              <span>Continue Inspection</span>
              <span>&rarr;</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700/60 font-mono text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Inspection ID</span>
              <span className="text-white font-bold">
                SCN-{activeScan.id.slice(0, 8).toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Category</span>
              <span className="text-slate-200">{activeScan.category || 'FOOD'}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Evidence Photos</span>
              <span className="text-slate-200">
                {(activeScan.package_faces || activeScan.images || []).length || 1} Captured
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase">Statutory Status</span>
              <span
                className={`font-bold ${
                  activeScan.overall_status === 'COMPLIANT'
                    ? 'text-emerald-400'
                    : activeScan.overall_status === 'NON_COMPLIANT'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}
              >
                {activeScan.overall_status?.replace(/_/g, ' ') || 'UNDER_REVIEW'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[#CBD5E1] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#15803D]"></span>
            <div>
              <span className="font-bold text-[#0A2540]">No active inspection in progress</span>
              <p className="text-[11px] text-[#64748B] font-sans">
                All previous retail audits logged and synchronized. Terminal ready for new package sampling.
              </p>
            </div>
          </div>
          <Link
            href="/scan"
            className="px-3.5 py-1.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] shrink-0 text-center"
          >
            + Start New Inspection
          </Link>
        </div>
      )}

      {/* ── 3. KPI SECTION: RESTRAINED OFFICIAL METRIC CARDS ── */}
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
          label="Non-Compliant"
          value={stats.violations}
          subtext="Actionable statutory violations"
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
          label="Needs Review"
          value={stats.reviewRequired}
          subtext="Awaiting officer verification"
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

      {/* ── 4. OFFICER REVIEW QUEUE SECTION ── */}
      <div className="bg-white border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-[#B45309]"></span>
            <h3 className="font-bold text-sm text-[#0A2540] font-sans uppercase tracking-wider">
              Review Queue &bull; Officer Verification
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#B45309] bg-[#FFFBEB] px-2.5 py-0.5 border border-[#FDE68A]">
            {reviewQueue.length} {reviewQueue.length === 1 ? 'Inspection Requires Verification' : 'Inspections Require Verification'}
          </span>
        </div>

        {reviewQueue.length === 0 ? (
          <div className="p-4 bg-[#F8FAFC] border border-dashed border-[#CBD5E1] flex items-center justify-between font-mono text-xs text-[#64748B]">
            <span>Review Queue Clear &bull; All recorded product inspections have completed verification.</span>
            <span className="text-[#15803D] font-bold">✓ 100% Up to Date</span>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E8F0] font-mono text-xs border border-[#E2E8F0]">
            {reviewQueue.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white hover:bg-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0A2540]">{item.scan_id}</span>
                    <span className="font-sans font-bold text-[#0F172A]">{item.product}</span>
                    <span className="text-[10px] text-[#64748B] uppercase">({item.category})</span>
                  </div>
                  <p className="text-[11px] text-[#B45309] font-sans">
                    Requires manual verification of declaration clarity or numeral height.
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-[#64748B]">{item.date}</span>
                  <Link
                    href={`/scan/${item.id}/results`}
                    className="px-3 py-1.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-bold text-xs uppercase tracking-wider transition-colors"
                  >
                    Review &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 5. RECENT INSPECTIONS & VIOLATION TRENDS SPLIT ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 65%: Recent Physical Inspections Table */}
        <div className="lg:col-span-7 bg-white border border-[#CBD5E1] p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
                AUDIT LOG &bull; CHRONOLOGICAL RECORD
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

          {/* Desktop Table View */}
          <div className="hidden md:block border border-[#CBD5E1] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] font-mono text-[#0A2540] uppercase text-[10px]">
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Inspection ID</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Product</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Date</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Verdict</th>
                  <th className="p-3 border-r border-[#CBD5E1] font-bold">Issues</th>
                  <th className="p-3 text-right font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px] bg-white">
                {stats.recentInspections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-[#64748B] font-mono text-xs">
                      No inspections recorded yet. Start by conducting a packaged commodity audit.
                    </td>
                  </tr>
                ) : (
                  stats.recentInspections.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="p-3 font-bold text-[#0A2540] border-r border-[#CBD5E1]">
                        {row.scan_id}
                      </td>
                      <td className="p-3 font-sans font-bold text-[#0F172A] border-r border-[#CBD5E1] max-w-[160px] truncate">
                        {row.product}
                      </td>
                      <td className="p-3 text-[#64748B] border-r border-[#CBD5E1] whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="p-3 border-r border-[#CBD5E1]">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="p-3 text-center border-r border-[#CBD5E1]">
                        <span className={`font-bold ${row.violations > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
                          {row.violations}
                        </span>
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

          {/* Mobile Card List View (Responsive) */}
          <div className="md:hidden divide-y divide-[#E2E8F0] border border-[#CBD5E1] font-mono text-xs">
            {stats.recentInspections.length === 0 ? (
              <div className="p-6 text-center text-[#64748B]">
                No inspections recorded yet. Start a new inspection above.
              </div>
            ) : (
              stats.recentInspections.map((row) => (
                <div key={row.id} className="p-3.5 space-y-2 bg-white">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#0A2540]">{row.scan_id}</span>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="font-sans font-bold text-[#0F172A] text-sm">
                    {row.product}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1">
                    <span>{row.date}</span>
                    <span>Issues: <strong className={row.violations > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}>{row.violations}</strong></span>
                    <Link
                      href={`/scan/${row.id}/results`}
                      className="font-bold text-[#0A2540] hover:underline"
                    >
                      Inspect &rarr;
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 35%: Statutory Violation Frequency Breakdown */}
        <div className="lg:col-span-5 bg-white border border-[#CBD5E1] p-4 sm:p-5 space-y-4 shadow-xs">
          <div className="border-b border-[#E2E8F0] pb-3">
            <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
              STATUTORY ENFORCEMENT SUMMARY
            </span>
            <h3 className="text-sm font-bold text-[#0A2540] mt-0.5 font-sans">
              Most Common Infractions
            </h3>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {stats.topViolations.length === 0 ? (
              <div className="p-6 border border-dashed border-[#CBD5E1] bg-[#F8FAFC] text-center text-[#64748B] text-xs font-mono">
                No statutory infractions recorded in database.
              </div>
            ) : (
              stats.topViolations.map((v) => {
                const maxCount = Math.max(...stats.topViolations.map((t) => t.count), 1);
                const widthPct = Math.round((v.count / maxCount) * 100);

                return (
                  <div key={v.rule_code} className="p-3 border border-[#CBD5E1] bg-[#F8FAFC] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#B91C1C]">{v.rule_code}</span>
                      <span className="text-[#64748B] text-[11px] font-bold">
                        {v.count} {v.count === 1 ? 'case' : 'cases'}
                      </span>
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

          <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] text-[11px] font-mono text-[#64748B] space-y-1">
            <div className="font-bold text-[#0A2540]">Enforcement Guide (Rule 32 Compounding):</div>
            <div>&bull; First Offence: Notice & compounding fee up to ₹25,000</div>
            <div>&bull; Subsequent Offence: Compounding fee up to ₹50,000 & court referral</div>
          </div>
        </div>
      </div>
    </div>
  );
}

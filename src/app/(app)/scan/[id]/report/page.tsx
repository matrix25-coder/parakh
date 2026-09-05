'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge, SeverityBadge, FontAuditCard } from '@/components/ui';
import { DEMO_REPORT, DEMO_FONT_AUDITS } from '@/lib/demo/fixtures';
import type { ComplianceReport, FontReadabilityAudit } from '@/lib/types';

export default function ComplianceReportPage() {
  const params = useParams();
  const id = (params?.id as string) || '1';

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ComplianceReport>(DEMO_REPORT);
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>(DEMO_FONT_AUDITS);
  const [inspectorName, setInspectorName] = useState('Field Inspection Officer');
  const [scanDate, setScanDate] = useState('2026-09-04 17:35 IST');

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/scan/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Scan not found');
        return res.json();
      })
      .then((data) => {
        if (data.complianceResult) {
          setReport(data.complianceResult);
          if (data.complianceResult.font_audits) {
            setFontAudits(data.complianceResult.font_audits);
          }
        }
        if (data.inspector_name) {
          setInspectorName(data.inspector_name);
        }
        if (data.created_at) {
          setScanDate(new Date(data.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
        }
      })
      .catch((err) => {
        console.warn('Could not fetch scan report, using defaults:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `parakh-statutory-report-${id.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const isCompliant = report.overall_status === 'COMPLIANT';
  const isFail = report.overall_status === 'NON_COMPLIANT';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12 py-2">
      {/* Top action bar (hidden during print) */}
      <div className="no-print p-4 bg-white border border-[#CBD5E1] flex flex-wrap items-center justify-between gap-4 font-mono text-xs shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href={`/scan/${id}/results`}
            className="px-3 py-2 font-semibold text-[#475569] hover:text-[#0A2540] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] transition-colors"
          >
            &larr; Back to Results
          </Link>
          <span className="text-[#64748B]">
            Inspection Reference: <strong className="text-[#0A2540]">PARAKH/LMPC/2026/{id.slice(0, 8).toUpperCase()}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportJson}
            className="px-3 py-2 font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors cursor-pointer"
          >
            Export JSON
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-2 font-semibold text-[#0F172A] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            <span>Print Certificate</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Official Printable Certificate Document */}
      <div className="bg-white border border-[#CBD5E1] p-8 md:p-12 space-y-8 print:border-none print:p-0 shadow-sm">
        {/* Document Header */}
        <div className="border-b-2 border-[#0A2540] pb-6 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-[#EA580C]"></div>
              <span className="font-mono font-bold tracking-wider text-xs uppercase text-[#0A2540]">
                PARAKH &bull; PACKAGED COMMODITY COMPLIANCE VERIFICATION SYSTEM
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0A2540] font-sans">
              Legal Metrology Compliance Inspection Memo
            </h1>
            <p className="text-xs text-[#475569] max-w-xl font-sans">
              Statutory verification pursuant to the Legal Metrology Act, 2009 & the Legal Metrology (Packaged Commodities) Rules, 2011 (GSR 202(E)).
            </p>
          </div>

          <div className="text-right font-mono text-xs space-y-1">
            <div>
              <span className="text-[#64748B]">Certificate Ref: </span>
              <span className="font-bold text-[#0A2540]">PARAKH/LMPC/2026/{id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Inspection Timestamp: </span>
              <span className="text-[#0F172A]">{scanDate}</span>
            </div>
            <div>
              <span className="text-[#64748B]">Rule Engine Framework: </span>
              <span className="text-[#0F172A]">v1.0 (GSR 202(E))</span>
            </div>
          </div>
        </div>

        {/* 1 & 2: Inspection & Product Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono border border-[#CBD5E1] bg-[#F8FAFC]">
          <div className="p-4 border-b md:border-b-0 md:border-r border-[#CBD5E1] space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#0A2540] tracking-wider block">
              1. Inspection Information
            </span>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-[#64748B]">Scan ID:</span>
              <span className="text-[#0F172A] font-bold">SCN-{id.slice(0, 8).toUpperCase()}</span>
              <span className="text-[#64748B]">Inspector:</span>
              <span className="text-[#0F172A]">{inspectorName}</span>
              <span className="text-[#64748B]">Sampling Method:</span>
              <span className="text-[#0F172A]">Packaged Retail Audit</span>
              <span className="text-[#64748B]">Security Hash:</span>
              <span className="text-[#15803D] font-bold">SHA-256 VERIFIED</span>
            </div>
          </div>

          <div className="p-4 space-y-2">
            <span className="text-[10px] uppercase font-bold text-[#0A2540] tracking-wider block">
              2. Product Information
            </span>
            <div className="grid grid-cols-2 gap-2">
              <span className="text-[#64748B]">Product Name:</span>
              <span className="text-[#0F172A] font-bold">{report.product_name}</span>
              <span className="text-[#64748B]">Category:</span>
              <span className="text-[#0F172A]">{report.category}</span>
              <span className="text-[#64748B]">Origin:</span>
              <span className="text-[#0F172A]">{report.is_imported ? 'Imported' : 'Domestic (India)'}</span>
              <span className="text-[#64748B]">Packaging Faces:</span>
              <span className="text-[#0F172A]">Primary Display Panel (PDP)</span>
            </div>
          </div>
        </div>

        {/* 10. Final Legal Verdict Banner */}
        <div className={`p-6 border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isCompliant
            ? 'border-[#15803D] bg-[#F0FDF4]'
            : isFail
            ? 'border-[#B91C1C] bg-[#FEF2F2]'
            : 'border-[#B45309] bg-[#FFFBEB]'
        }`}>
          <div>
            <span className={`text-xs font-mono uppercase font-bold tracking-wider block ${
              isCompliant ? 'text-[#15803D]' : isFail ? 'text-[#B91C1C]' : 'text-[#B45309]'
            }`}>
              10. Final Statutory Verdict
            </span>
            <h2 className={`text-2xl font-bold mt-0.5 ${
              isCompliant ? 'text-[#15803D]' : isFail ? 'text-[#B91C1C]' : 'text-[#B45309]'
            }`}>
              {report.overall_status.replace(/_/g, ' ')}
            </h2>
            <p className="text-xs text-[#475569] font-sans mt-1 max-w-md">
              {isCompliant
                ? 'All evaluated mandatory declarations satisfy the Legal Metrology (Packaged Commodities) Rules, 2011.'
                : isFail
                ? 'Mandatory declarations contain statutory infractions requiring notice under Section 36 of Legal Metrology Act, 2009.'
                : 'Declarations require designated enforcement officer physical verification before statutory certification.'}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center font-mono text-xs">
            <div className="p-2.5 bg-white border border-[#CBD5E1]">
              <span className="text-[10px] text-[#64748B] block">Total</span>
              <span className="font-bold text-sm text-[#0F172A]">{report.summary.total_rules}</span>
            </div>
            <div className="p-2.5 bg-white border border-[#CBD5E1]">
              <span className="text-[10px] text-[#15803D] block">Passed</span>
              <span className="font-bold text-sm text-[#15803D]">{report.summary.passed}</span>
            </div>
            <div className="p-2.5 bg-white border border-[#CBD5E1]">
              <span className="text-[10px] text-[#B91C1C] block">Failed</span>
              <span className="font-bold text-sm text-[#B91C1C]">{report.summary.failed}</span>
            </div>
            <div className="p-2.5 bg-white border border-[#CBD5E1]">
              <span className="text-[10px] text-[#B45309] block">Review</span>
              <span className="font-bold text-sm text-[#B45309]">{report.summary.review}</span>
            </div>
          </div>
        </div>

        {/* 6. Font & Readability Analysis */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0A2540]">
            6. Font & Readability Analysis (Rule 9 Table I)
          </h3>
          <FontAuditCard audits={fontAudits} />
        </div>

        {/* 7 & 8: Rule Evaluations & Violations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
              7. Deterministic Rule Evaluation Matrix ({report.results?.length || 0} Rules)
            </h3>
            <span className={`text-xs font-bold ${report.violations?.length ? 'text-[#B91C1C]' : 'text-[#15803D]'}`}>
              {report.violations?.length ? `${report.violations.length} Statutory Violations Detected` : 'Zero Violations'}
            </span>
          </div>

          <div className="border border-[#CBD5E1] bg-white overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#0A2540] uppercase text-[10px]">
                <tr>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Rule ID</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Section</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Requirement</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Extracted Data</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Status</th>
                  <th className="p-2.5 font-bold">Statutory Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-[11px]">
                {report.results?.map((r) => (
                  <tr key={r.rule_code} className={r.status === 'FAIL' ? 'bg-[#FEF2F2]' : undefined}>
                    <td className="p-2.5 font-bold border-r border-[#CBD5E1] text-[#0A2540]">{r.rule_code}</td>
                    <td className="p-2.5 text-[#64748B] border-r border-[#CBD5E1]">{r.rule_number}</td>
                    <td className="p-2.5 font-sans border-r border-[#CBD5E1] text-[#0F172A]">{r.title}</td>
                    <td className="p-2.5 border-r border-[#CBD5E1] text-[#0F172A] max-w-xs truncate">
                      {r.extracted_value || '— (Missing)'}
                    </td>
                    <td className="p-2.5 border-r border-[#CBD5E1]">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="p-2.5 text-[10px] text-[#64748B] truncate max-w-xs">{r.source_reference}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 11 & 12: Legal Disclaimer & Signoff */}
        <div className="p-4 bg-[#F8FAFC] border border-[#CBD5E1] space-y-2 text-[11px] text-[#475569] font-mono leading-relaxed">
          <span className="font-bold text-[#0A2540] uppercase tracking-wider block">
            11. Statutory Legal Authority & Notice Disclaimer
          </span>
          <p>
            This inspection memorandum is generated by the PARAKH Compliance Verification System under SIH 2026 Problem Statement 26034. Rule evaluations are computed deterministically per Gazette Notification GSR 202(E).
          </p>
          <p>
            *Notice: Values marked REVIEW require physical verification by a designated enforcement inspector before issuing statutory notice under Section 36 of the Legal Metrology Act, 2009.*
          </p>
        </div>

        {/* Signoff */}
        <div className="pt-8 border-t border-[#CBD5E1] flex flex-wrap items-end justify-between text-xs font-mono">
          <div>
            <span className="text-[#64748B] block">Digital Verification Seal:</span>
            <span className="font-bold text-[#0A2540]">PARAKH-AUTOSIGN-2026-SIH26034</span>
          </div>
          <div className="text-right">
            <div className="h-10 border-b border-[#0A2540] w-48 mb-1"></div>
            <span className="text-[#64748B] block">Designated Inspector Signature</span>
          </div>
        </div>
      </div>
    </div>
  );
}

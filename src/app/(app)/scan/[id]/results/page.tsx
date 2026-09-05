'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, SeverityBadge, ComplianceVerdict, FontAuditCard } from '@/components/ui';
import { DEMO_REPORT, DEMO_FONT_AUDITS } from '@/lib/demo/fixtures';
import type { ComplianceReport, FontReadabilityAudit } from '@/lib/types';

export default function ComplianceResultsPage() {
  const params = useParams();
  const id = (params?.id as string) || '1';

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ComplianceReport>(DEMO_REPORT);
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>(DEMO_FONT_AUDITS);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedRuleCode, setExpandedRuleCode] = useState<string | null>(null);

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
          // Default expand first violation if any
          const firstFail = data.complianceResult.results?.find((r: any) => r.status === 'FAIL');
          if (firstFail) {
            setExpandedRuleCode(firstFail.rule_code);
          }
        }
      })
      .catch((err) => {
        console.warn('Could not fetch scan report, using defaults:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const filteredResults = report.results?.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  }) || [];

  const toggleExpand = (code: string) => {
    setExpandedRuleCode((prev) => (prev === code ? null : code));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <PageHeader
        title="Compliance Results"
        description="Deterministic statutory evaluation computed by the Rule Engine against the 10 Packaged Commodities Rules, 2011."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/scan/${id}/violations`}
              className="px-3.5 py-2 text-xs font-mono font-bold text-[#B91C1C] bg-[#FEF2F2] hover:bg-[#FEE2E2] border border-[#FECACA] transition-colors"
            >
              View Violations ({report.violations?.length || 0})
            </Link>
            <Link
              href={`/scan/${id}/evidence`}
              className="px-3.5 py-2 text-xs font-mono font-bold text-[#0A2540] bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] transition-colors"
            >
              Visual Evidence Viewer
            </Link>
            <Link
              href={`/scan/${id}/report`}
              className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] shadow-xs"
            >
              Inspection Certificate &rarr;
            </Link>
          </div>
        }
      />

      {/* Primary Compliance Verdict Banner */}
      <ComplianceVerdict
        status={report.overall_status}
        summary={report.summary}
        productName={report.product_name}
        category={report.category}
      />

      {/* Traceability Callout */}
      <div className="p-3 bg-white text-[#0F172A] border border-[#CBD5E1] border-l-4 border-l-[#0A2540] flex flex-col sm:flex-row sm:items-center justify-between font-mono text-xs gap-2">
        <span className="text-[#0A2540] font-bold">
          STATUTORY TRACEABILITY AUDIT PATH:
        </span>
        <span className="text-[#64748B]">
          FINAL VERDICT &rarr; STATUTORY RULE &rarr; EXTRACTED DATA &rarr; PHYSICAL EVIDENCE
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border border-[#CBD5E1] bg-[#F8FAFC] p-2.5 font-mono text-xs">
        <span className="text-[#64748B] px-2 text-[10px] uppercase font-bold">Filter Rules:</span>
        {['ALL', 'PASS', 'FAIL', 'REVIEW', 'NOT_APPLICABLE'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1 text-xs cursor-pointer border transition-colors ${
              filterStatus === st
                ? 'bg-[#0A2540] text-white border-[#0A2540] font-bold shadow-xs'
                : 'bg-white text-[#64748B] border-[#CBD5E1] hover:text-[#0A2540] hover:border-[#0A2540]'
            }`}
          >
            {st.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* 10 Rules Detailed Evaluation Matrix */}
      <div className="bg-white border border-[#CBD5E1] divide-y divide-[#E2E8F0] shadow-xs">
        {filteredResults.map((rule) => {
          const isExpanded = expandedRuleCode === rule.rule_code;
          const isFail = rule.status === 'FAIL';
          const isReview = rule.status === 'REVIEW';

          return (
            <div key={rule.rule_code} className="flex flex-col bg-white">
              {/* Row Summary */}
              <div
                onClick={() => toggleExpand(rule.rule_code)}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isExpanded ? 'bg-[#F8FAFC]' : 'hover:bg-[#F8FAFC]'
                } ${isFail ? 'border-l-4 border-l-[#B91C1C]' : isReview ? 'border-l-4 border-l-[#D97706]' : ''}`}
              >
                <div className="flex items-start md:items-center gap-3">
                  <span className="font-mono text-xs font-bold text-[#0A2540] w-20 shrink-0">
                    {rule.rule_code}
                  </span>
                  <div>
                    <span className="font-bold text-xs text-[#0F172A] block font-sans">
                      {rule.title}
                    </span>
                    <span className="text-[11px] font-mono text-[#64748B]">
                      Section {rule.rule_number} &bull; Target Field: {rule.field}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end md:self-auto">
                  <div className="text-right hidden sm:block font-mono text-[11px]">
                    <span className="text-[#64748B] block">Extracted Input:</span>
                    <span className="font-semibold text-[#0F172A] max-w-[150px] truncate block">
                      {rule.extracted_value || 'Missing'}
                    </span>
                  </div>

                  <SeverityBadge severity={rule.severity} />
                  <StatusBadge status={rule.status} />

                  <span className="text-[#64748B] text-xs font-mono">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Expandable Explanation Details */}
              {isExpanded && (
                <div className="p-5 bg-[#F8FAFC] border-t border-[#E2E8F0] space-y-4 text-xs font-mono">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Statutory Requirement & Message */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                          Statutory Engine Determination:
                        </span>
                        <p className="text-xs text-[#0F172A] bg-white p-3 border border-[#CBD5E1] font-sans font-medium leading-relaxed mt-1">
                          {rule.message}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                          Gazette Source Reference:
                        </span>
                        <p className="text-[11px] text-[#475569] mt-0.5 font-mono">
                          {rule.source_reference}
                        </p>
                      </div>
                    </div>

                    {/* Right: Input Data vs Expected Standard */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-white border border-[#CBD5E1]">
                          <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                            Extracted Raw Input:
                          </span>
                          <span className="font-bold text-[#0F172A] block mt-1 break-all">
                            {rule.extracted_value || 'None (Missing on package)'}
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-[#CBD5E1]">
                          <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                            Statutory Requirement:
                          </span>
                          <span className="font-bold text-[#0F172A] block mt-1">
                            {rule.expected_value || 'Present & compliant'}
                          </span>
                        </div>
                      </div>

                      {/* Evidence Link */}
                      <div className="p-3 bg-white border border-[#CBD5E1] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                            Visual Evidence Bounding Box:
                          </span>
                          <span className="text-[#0F172A] font-mono text-[11px]">
                            {rule.evidence?.bounding_box
                              ? Array.isArray(rule.evidence.bounding_box)
                                ? `Box: [${rule.evidence.bounding_box.join(', ')}]`
                                : JSON.stringify(rule.evidence.bounding_box)
                              : 'No visual declaration found'}
                          </span>
                        </div>
                        <Link
                          href={`/scan/${id}/evidence`}
                          className="px-3 py-1 text-xs font-bold text-[#0A2540] bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] transition-colors"
                        >
                          View Canvas &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Font & Readability Analysis */}
      <FontAuditCard audits={fontAudits} />
    </div>
  );
}

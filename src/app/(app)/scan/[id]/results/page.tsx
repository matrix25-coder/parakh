'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PageHeader,
  StatusBadge,
  SeverityBadge,
  ComplianceVerdict,
  FontAuditCard,
  PackageOverlayViewer,
} from '@/components/ui';
import type { ComplianceReport, FontReadabilityAudit, RuleEvaluationDetail } from '@/lib/types';
import { getScanFromClient, saveScanToClient, syncScanToServer } from '@/lib/client-scan-cache';
import { WELLCORE_SCAN_FIXTURE } from '@/lib/demo/wellcore-fixture';
import { DEMO_REPORT } from '@/lib/demo/fixtures';

export default function ComplianceResultsPage() {
  const params = useParams();
  const id = (params?.id as string) || '1';

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [scanData, setScanData] = useState<any>(null);
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedRuleCode, setExpandedRuleCode] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showVisualEvidence, setShowVisualEvidence] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const applyScanRecord = (data: any) => {
    setScanData(data);
    if (data.complianceResult) {
      setReport(data.complianceResult);
      if (data.complianceResult.font_audits) {
        setFontAudits(data.complianceResult.font_audits);
      }
      const firstFail = data.complianceResult.results?.find((r: any) => r.status === 'FAIL');
      if (firstFail) {
        setExpandedRuleCode(firstFail.rule_code);
        setSelectedField(firstFail.field);
      } else if (data.complianceResult.results?.[0]) {
        setExpandedRuleCode(data.complianceResult.results[0].rule_code);
        setSelectedField(data.complianceResult.results[0].field);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    async function loadResults() {
      // 1. Try instant client cache retrieval
      let localScan = await getScanFromClient(id);
      if (!localScan && id === 'wellcore-creatine-analysis') {
        localScan = WELLCORE_SCAN_FIXTURE as any;
      }
      if (isMounted && localScan && localScan.complianceResult) {
        applyScanRecord(localScan);
        setIsLoading(false);
        syncScanToServer(localScan);
      }

      // 2. Query server
      try {
        const res = await fetch(`/api/scan/${id}`);
        if (res.ok) {
          const serverData = await res.json();
          if (isMounted) {
            applyScanRecord(serverData);
            saveScanToClient(serverData);
          }
        } else if (!localScan) {
          if (id === 'wellcore-creatine-analysis') {
            if (isMounted) applyScanRecord(WELLCORE_SCAN_FIXTURE);
          } else {
            // Check latest scan
            const latestScan = await getScanFromClient('latest');
            if (isMounted) {
              if (latestScan && latestScan.complianceResult) {
                applyScanRecord(latestScan);
              } else if (id === '1') {
                applyScanRecord({
                  id: '1',
                  product_name: DEMO_REPORT.product_name,
                  category: DEMO_REPORT.category,
                  complianceResult: DEMO_REPORT,
                });
              } else {
                setFetchError('Scan record not found on server or local storage.');
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch scan report from server:', err);
        if (!localScan && isMounted) {
          setFetchError(err.message || 'Could not load scan record');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadResults();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleSelectField = (fieldName: string, ruleCode?: string) => {
    setSelectedField(fieldName);
    if (ruleCode) {
      setExpandedRuleCode(ruleCode);
    } else if (report?.results) {
      const match = report.results.find((r) => r.field === fieldName);
      if (match) {
        setExpandedRuleCode(match.rule_code);
      }
    }
  };

  const handleRuleClick = (rule: RuleEvaluationDetail) => {
    if (expandedRuleCode === rule.rule_code) {
      setExpandedRuleCode(null);
    } else {
      setExpandedRuleCode(rule.rule_code);
      setSelectedField(rule.field);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="border border-[#CBD5E1] bg-white p-8 text-center space-y-4 shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-[#0A2540] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0A2540] font-mono">
              COMPUTING STATUTORY DETERMINATIONS
            </h2>
            <p className="text-xs text-[#64748B] font-mono">
              Evaluating 10 statutory rules of Legal Metrology Act, 2009 against optical declarations...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !report) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="border border-red-300 bg-red-50 p-8 text-center space-y-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-red-900 font-mono">
            SCAN RECORD NOT AVAILABLE
          </h2>
          <p className="text-xs text-red-700 font-mono">
            {fetchError || 'Unable to retrieve data for this scan.'}
          </p>
          <div className="pt-2">
            <Link
              href="/scan"
              className="px-4 py-2 text-xs font-mono font-bold bg-[#0A2540] text-white hover:bg-[#1E3A8A] transition-colors"
            >
              Start New Package Scan &rarr;
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const filteredResults = report.results?.filter((r) => {
    if (filterStatus === 'ALL') return true;
    return r.status === filterStatus;
  }) || [];

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
            <button
              type="button"
              onClick={() => setShowVisualEvidence((prev) => !prev)}
              className={`px-3.5 py-2 text-xs font-mono font-bold border transition-colors cursor-pointer flex items-center gap-1.5 ${
                showVisualEvidence
                  ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xs'
                  : 'text-[#0A2540] bg-white hover:bg-[#F8FAFC] border-[#CBD5E1]'
              }`}
            >
              <span>Visual Evidence Canvas</span>
              <span>{showVisualEvidence ? '▲' : '▼'}</span>
            </button>
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

      {/* ── VISUAL EVIDENCE TOGGLE BAR (Hidden by default, shown on click) ── */}
      <div
        id="visual-evidence-section"
        className="p-3 bg-white border border-[#CBD5E1] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
      >
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#0A2540]"></span>
          <span className="font-mono text-xs font-bold uppercase text-[#0A2540]">
            Optical Packaging Evidence Canvas
          </span>
          <span className="text-[11px] font-mono text-[#64748B] hidden md:inline">
            &bull; {showVisualEvidence ? 'Bounding-box overlays active on packaging photo' : 'Click to inspect bounding-box overlays on package photo'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowVisualEvidence((prev) => !prev)}
            className="px-3.5 py-1.5 font-mono text-xs font-bold text-[#0A2540] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] cursor-pointer flex items-center gap-1.5 transition-colors"
          >
            <span>{showVisualEvidence ? '▲ Hide Evidence Canvas' : '👁️ View Visual Evidence Canvas'}</span>
          </button>
          <Link
            href={`/scan/${id}/evidence`}
            className="px-3 py-1.5 font-mono text-xs font-bold text-[#64748B] hover:text-[#0A2540] bg-white border border-[#CBD5E1] transition-colors"
          >
            Split Workspace &rarr;
          </Link>
        </div>
      </div>

      {showVisualEvidence && (
        <PackageOverlayViewer
          imagePath={scanData?.image_path}
          packageFaces={scanData?.images || scanData?.package_faces || []}
          boundingBoxes={scanData?.extractedData?.boundingBoxes || {}}
          rules={report.results || []}
          selectedField={selectedField}
          onSelectField={handleSelectField}
          productName={report.product_name}
          category={report.category}
        />
      )}

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
          const isFieldSelected = selectedField === rule.field;
          const isFail = rule.status === 'FAIL';
          const isReview = rule.status === 'REVIEW';

          return (
            <div key={rule.rule_code} className="flex flex-col bg-white">
              {/* Row Summary */}
              <div
                onClick={() => handleRuleClick(rule)}
                className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer transition-colors ${
                  isExpanded || isFieldSelected ? 'bg-[#F8FAFC]' : 'hover:bg-[#F8FAFC]'
                } ${
                  isFieldSelected
                    ? 'ring-2 ring-inset ring-[#0A2540]'
                    : isFail
                    ? 'border-l-4 border-l-[#B91C1C]'
                    : isReview
                    ? 'border-l-4 border-l-[#D97706]'
                    : ''
                }`}
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
                    <span className="font-semibold text-[#0F172A] max-w-[180px] truncate block">
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
                            Visual Evidence Coordinate:
                          </span>
                          <span className="text-[#0A2540] font-mono text-[11px] font-bold">
                            Field [{rule.field}] highlighted on Package Canvas above
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowVisualEvidence(true);
                            setSelectedField(rule.field);
                            const elem = document.getElementById('visual-evidence-section');
                            if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          }}
                          className="px-3 py-1 text-xs font-bold text-[#0A2540] bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] transition-colors cursor-pointer"
                        >
                          Show on Canvas &uarr;
                        </button>
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
      {fontAudits.length > 0 && <FontAuditCard audits={fontAudits} />}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  PageHeader,
  ConfidenceBadge,
  FontAuditCard,
  PackageOverlayViewer,
} from '@/components/ui';
import type { FontReadabilityAudit, RuleEvaluationDetail } from '@/lib/types';
import {
  getScanFromClient,
  saveScanToClient,
  syncScanToServer,
  buildStatutoryFieldRows,
  type StatutoryFieldRow,
} from '@/lib/client-scan-cache';

type FieldRow = StatutoryFieldRow;

export default function ExtractionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [productName, setProductName] = useState('Packaged Commodity');
  const [category, setCategory] = useState('FOOD');
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>([]);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [scanData, setScanData] = useState<any>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const applyScanRecord = (data: any) => {
    setScanData(data);
    setProductName(data.product_name || data.productName || 'Packaged Commodity');
    setCategory(data.category || 'FOOD');

    if (data.complianceResult?.font_audits) {
      setFontAudits(data.complianceResult.font_audits);
    } else if (data.font_audits) {
      setFontAudits(data.font_audits);
    }

    const rows = buildStatutoryFieldRows(data);
    setFields(rows);
    if (rows[0]) {
      setSelectedField(rows[0].field_name);
    }
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    async function loadData() {
      if (!id) {
        setFetchError('No inspection scan ID provided.');
        setIsLoading(false);
        return;
      }

      // 1. Check client storage first (instant zero-latency recovery)
      let localScan = await getScanFromClient(id);
      if (isMounted && localScan) {
        applyScanRecord(localScan);
        setIsLoading(false);
        syncScanToServer(localScan);
      }

      // 2. Fetch fresh or verify from server
      try {
        const res = await fetch(`/api/scan/${id}`);
        if (res.ok) {
          const serverData = await res.json();
          if (isMounted) {
            applyScanRecord(serverData);
            saveScanToClient(serverData);
          }
        } else if (!localScan) {
          if (isMounted) {
            setFetchError('Inspection scan record not found on server or local storage.');
          }
        }
      } catch (err: any) {
        console.warn('Could not fetch scan data from server:', err);
        if (!localScan && isMounted) {
          setFetchError(err.message || 'Could not load scan record');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handleFieldChange = (index: number, newVal: string) => {
    const updated = [...fields];
    updated[index].value = newVal;
    if (updated[index].confidence < 0.9) {
      updated[index].confidence = 1.0;
      updated[index].status = 'CONFIRMED';
    }
    setFields(updated);
  };

  const handleRunRuleEngine = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    // 1. Immediately persist user changes to client cache
    if (scanData) {
      const updatedScan = {
        ...scanData,
        product_name: productName,
        category,
      };
      const ext = { ...(updatedScan.extractedData || {}) };
      fields.forEach((f) => {
        if (f.field_name === 'commodity_description') ext.commodityName = f.value;
        if (f.field_name === 'manufacturer_name') { ext.manufacturer = f.value; ext.address = f.value; }
        if (f.field_name === 'mrp') ext.mrp = { ...ext.mrp, raw: f.value, value: parseFloat(f.value.replace(/[^0-9.]/g, '')) || ext.mrp?.value };
        if (f.field_name === 'net_quantity') ext.netQuantity = { ...ext.netQuantity, raw: f.value, value: parseFloat(f.value) || ext.netQuantity?.value };
        if (f.field_name === 'unit') ext.netQuantity = { ...ext.netQuantity, unit: f.value };
        if (f.field_name === 'month_year') ext.manufacturingDate = { ...ext.manufacturingDate, raw: f.value, formatted: f.value };
        if (f.field_name === 'consumer_care') ext.consumerCare = { ...ext.consumerCare, raw: f.value };
        if (f.field_name === 'country_of_origin') ext.countryOfOrigin = f.value;
      });
      updatedScan.extractedData = ext;
      await saveScanToClient(updatedScan);
    }

    try {
      const res = await fetch(`/api/scan/${id}/review`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields,
          productName,
          category,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (scanData && data.complianceResult) {
          const updatedScan = {
            ...scanData,
            extractedData: data.extractedData || scanData.extractedData,
            complianceResult: data.complianceResult,
            overall_status: data.overallStatus || data.complianceResult.overall_status,
            violations_count: data.complianceResult.violations?.length || 0,
          };
          await saveScanToClient(updatedScan);
        }
      }
    } catch (err: any) {
      console.warn('Submit warning:', err);
    } finally {
      setIsSubmitting(false);
      router.push(`/scan/${id}/results`);
    }
  };

  const syntheticRules: RuleEvaluationDetail[] = fields.map((f, i) => ({
    rule_code: `RULE-0${i + 1}`,
    rule_number: '6',
    title: f.label,
    field: f.field_name,
    status: f.value ? 'PASS' : 'FAIL',
    severity: f.value ? 'LOW' : 'HIGH',
    message: f.value ? `Detected: ${f.value}` : 'Missing declaration',
    extracted_value: f.value || undefined,
    expected_value: 'Mandatory statutory declaration',
    source_reference: f.rule_ref,
  }));

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <PageHeader
        title="Extraction Review & Verification"
        description="Review and verify raw declarations extracted by optical models before dispatching structured data to the Legal Metrology Rule Engine."
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/scan"
              className="px-3 py-2 text-xs font-mono text-[#475569] hover:text-[#0A2540] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] transition-colors"
            >
              &larr; Retake Scan
            </Link>
            <button
              onClick={handleRunRuleEngine}
              disabled={isSubmitting || isLoading}
              className="px-5 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] cursor-pointer flex items-center gap-2 disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent animate-spin"></span>
                  <span>EVALUATING RULES...</span>
                </>
              ) : (
                <>
                  <span>RUN RULE ENGINE</span>
                  <span>&rarr;</span>
                </>
              )}
            </button>
          </div>
        }
      />

      {submitError && (
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] text-xs font-mono">
          <strong>Notice: </strong> {submitError}
        </div>
      )}

      {fetchError && !scanData && (
        <div className="p-8 bg-white border border-[#CBD5E1] text-center space-y-3 font-mono text-xs text-[#B91C1C]">
          <p className="font-bold">{fetchError}</p>
          <Link
            href="/scan"
            className="inline-block px-4 py-2 bg-[#0A2540] text-white hover:bg-[#1E3A8A] transition-colors"
          >
            &larr; Return to Scanner
          </Link>
        </div>
      )}

      {/* Critical Architecture Callout */}
      <div className="p-3.5 bg-white border-l-4 border-l-[#0A2540] border border-[#CBD5E1] text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[#0F172A]">
        <div>
          <span className="font-bold uppercase tracking-wider block sm:inline mr-2 text-[#0A2540]">
            OPTICAL DATA EXTRACTED FROM PACKAGE:
          </span>
          <span className="text-[#475569]">Candidate values before statutory rule evaluation. Field officers can verify and edit text.</span>
        </div>
        <span className="text-[11px] font-bold text-[#B45309] bg-[#FFFBEB] px-2 py-0.5 border border-[#FDE68A]">
          Values &lt; 0.90 flagged for review
        </span>
      </div>

      {/* VISUAL EVIDENCE OVERLAY & EDITABLE TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 45%: Package Image with Bounding Boxes */}
        <div className="lg:col-span-5 sticky top-4">
          <PackageOverlayViewer
            imagePath={scanData?.image_path}
            packageFaces={scanData?.images || scanData?.package_faces || []}
            boundingBoxes={scanData?.extractedData?.boundingBoxes || {}}
            rules={scanData?.complianceResult?.results || syntheticRules}
            selectedField={selectedField}
            onSelectField={(fieldName) => setSelectedField(fieldName)}
            productName={productName}
            category={category}
            compact={true}
          />
        </div>

        {/* Right 55%: Main Review Table */}
        <div className="lg:col-span-7 bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-3 gap-2">
            <div>
              <span className="text-[10px] font-mono text-[#64748B] uppercase block">
                Inspection Subject SCN-{id.slice(0, 8).toUpperCase()}
              </span>
              <h2 className="text-base font-bold text-[#0A2540] font-sans">
                {productName} &bull; <span className="font-mono text-xs text-[#64748B]">{category}</span>
              </h2>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="text-[#64748B]">Panels:</span>
              <span className="font-bold text-[#0F172A]">PDP & Information Panel</span>
            </div>
          </div>

          {/* Declarations Table */}
          <div className="border border-[#CBD5E1] overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] font-mono text-[#0A2540] uppercase text-[10px]">
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Field</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Extracted Value (Editable)</th>
                  <th className="p-2.5 border-r border-[#CBD5E1] font-bold">Conf.</th>
                  <th className="p-2.5 text-right font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px] bg-white">
                {fields.map((f, idx) => {
                  const isReview = f.confidence > 0 && f.confidence < 0.9;
                  const isMissing = !f.value.trim();
                  const isSelected = selectedField === f.field_name;

                  return (
                    <tr
                      key={f.field_name}
                      onClick={() => setSelectedField(f.field_name)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#F0FDF4] ring-2 ring-inset ring-[#0A2540]'
                          : isMissing
                          ? 'bg-[#FEF2F2]'
                          : isReview
                          ? 'bg-[#FFFBEB]'
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="p-2.5 font-bold font-sans text-[#0F172A] border-r border-[#CBD5E1]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-[#0A2540] rounded-full" />
                          <span className="text-xs">{f.label}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#64748B] block mt-0.5">
                          {f.rule_ref}
                        </span>
                      </td>
                      <td className="p-2 border-r border-[#CBD5E1]">
                        <input
                          type="text"
                          value={f.value}
                          onFocus={() => setSelectedField(f.field_name)}
                          onChange={(e) => handleFieldChange(idx, e.target.value)}
                          placeholder="[Declaration Missing on Package]"
                          className={`w-full px-2.5 py-1.5 font-mono text-xs border focus:outline-none transition-colors ${
                            isMissing
                              ? 'bg-white border-[#B91C1C] text-[#B91C1C] placeholder-[#B91C1C]/50'
                              : isReview
                              ? 'bg-white border-[#D97706] text-[#0F172A]'
                              : 'bg-white border-[#CBD5E1] text-[#0F172A] focus:border-[#0A2540]'
                          }`}
                        />
                      </td>
                      <td className="p-2.5 border-r border-[#CBD5E1] text-center">
                        {isMissing ? (
                          <span className="text-[#B91C1C] font-bold">0.00</span>
                        ) : (
                          <ConfidenceBadge confidence={f.confidence} />
                        )}
                      </td>
                      <td className="p-2.5 text-right font-sans font-semibold">
                        {isMissing ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]">
                            MISSING
                          </span>
                        ) : isReview ? (
                          <span className="px-2 py-0.5 text-[10px] font-mono text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]">
                            REVIEW
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[10px] font-mono text-[#15803D] bg-[#F0FDF4] border border-[#BBF7D0]">
                            CONFIRMED
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FONT & READABILITY ANALYSIS */}
      {fontAudits.length > 0 && <FontAuditCard audits={fontAudits} />}

      {/* Bottom Dispatch Action */}
      <div className="p-4 bg-white border border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono shadow-xs">
        <p className="text-xs text-[#475569]">
          Click below to pass this verified structured dataset to the 10 statutory rules in the compliance engine.
        </p>
        <button
          onClick={handleRunRuleEngine}
          disabled={isSubmitting || isLoading}
          className="px-6 py-2.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] cursor-pointer shrink-0 disabled:opacity-50"
        >
          {isSubmitting ? 'Evaluating Rules...' : 'Run Rule Engine Evaluation →'}
        </button>
      </div>
    </div>
  );
}

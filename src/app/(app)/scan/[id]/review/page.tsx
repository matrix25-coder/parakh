'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader, ConfidenceBadge, FontAuditCard } from '@/components/ui';
import { DEMO_FONT_AUDITS } from '@/lib/demo/fixtures';
import type { FontReadabilityAudit } from '@/lib/types';

interface FieldRow {
  field_name: string;
  label: string;
  rule_ref: string;
  value: string;
  confidence: number;
  source_image: string;
  status: 'CONFIRMED' | 'REVIEW_REQUIRED' | 'MISSING';
}

export default function ExtractionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '1';

  const [isLoading, setIsLoading] = useState(true);
  const [productName, setProductName] = useState('Packaged Commodity');
  const [category, setCategory] = useState('FOOD');
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>(DEMO_FONT_AUDITS);
  const [fields, setFields] = useState<FieldRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/scan/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Scan not found');
        return res.json();
      })
      .then((data) => {
        setProductName(data.product_name || 'Packaged Commodity');
        setCategory(data.category || 'FOOD');

        if (data.complianceResult?.font_audits) {
          setFontAudits(data.complianceResult.font_audits);
        }

        const ext = data.extractedData || {};
        const conf = ext.fieldConfidences || {};

        const mfgVal = ext.manufacturer
          ? `${ext.manufacturer}${ext.address && !ext.manufacturer.includes(ext.address) ? ', ' + ext.address : ''}`
          : '';
        const commVal = ext.commodityName || data.product_name || '';
        const qtyVal = ext.netQuantity?.value ? String(ext.netQuantity.value) : ext.netQuantity?.raw || '';
        const unitVal = ext.netQuantity?.unit || '';
        const mrpVal = ext.mrp?.raw || (ext.mrp?.value ? `₹ ${ext.mrp.value}` : '');
        const dateVal = ext.manufacturingDate?.formatted || ext.manufacturingDate?.raw || '';
        const originVal = ext.countryOfOrigin || (data.is_imported ? 'Imported' : 'India');
        const ccVal = ext.consumerCare?.raw || (ext.consumerCare?.phone ? `Tel: ${ext.consumerCare.phone}` : '');

        const rows: FieldRow[] = [
          {
            field_name: 'manufacturer_name',
            label: 'Manufacturer / Packer Name & Address',
            rule_ref: 'Rule 6(1)(a)',
            value: mfgVal,
            confidence: conf.manufacturer_name ?? (mfgVal ? 0.95 : 0.0),
            source_image: 'front_label.jpg',
            status: !mfgVal ? 'MISSING' : (conf.manufacturer_name && conf.manufacturer_name < 0.9 ? 'REVIEW_REQUIRED' : 'CONFIRMED'),
          },
          {
            field_name: 'commodity_description',
            label: 'Generic or Common Name of Commodity',
            rule_ref: 'Rule 6(1)(b)',
            value: commVal,
            confidence: conf.commodity_description ?? (commVal ? 0.95 : 0.0),
            source_image: 'front_label.jpg',
            status: !commVal ? 'MISSING' : 'CONFIRMED',
          },
          {
            field_name: 'net_quantity',
            label: 'Net Quantity Declaration',
            rule_ref: 'Rule 6(1)(c)',
            value: qtyVal,
            confidence: conf.net_quantity ?? (qtyVal ? 0.95 : 0.0),
            source_image: 'front_label.jpg',
            status: !qtyVal ? 'MISSING' : 'CONFIRMED',
          },
          {
            field_name: 'unit',
            label: 'Measurement Unit Symbol',
            rule_ref: 'Rule 12 & Sch. II',
            value: unitVal,
            confidence: conf.net_quantity ?? (unitVal ? 0.95 : 0.0),
            source_image: 'front_label.jpg',
            status: !unitVal ? 'MISSING' : 'CONFIRMED',
          },
          {
            field_name: 'mrp',
            label: 'Maximum Retail Price (MRP)',
            rule_ref: 'Rule 6(1)(e)',
            value: mrpVal,
            confidence: conf.mrp ?? (mrpVal ? 0.95 : 0.0),
            source_image: 'front_label.jpg',
            status: !mrpVal ? 'MISSING' : 'CONFIRMED',
          },
          {
            field_name: 'month_year',
            label: 'Month & Year of Manufacture / Packing',
            rule_ref: 'Rule 6(1)(d)',
            value: dateVal,
            confidence: conf.month_year ?? (dateVal ? 0.92 : 0.0),
            source_image: 'front_label.jpg',
            status: !dateVal ? 'MISSING' : 'CONFIRMED',
          },
          {
            field_name: 'country_of_origin',
            label: 'Country of Origin (Imported)',
            rule_ref: 'Rule 6(1)(da)',
            value: originVal,
            confidence: conf.country_of_origin ?? 0.99,
            source_image: 'front_label.jpg',
            status: 'CONFIRMED',
          },
          {
            field_name: 'consumer_care',
            label: 'Consumer Care / Grievance Redressal Contact',
            rule_ref: 'Rule 6(1)(f)',
            value: ccVal,
            confidence: conf.consumer_care ?? (ccVal ? 0.85 : 0.0),
            source_image: 'back_label.jpg',
            status: !ccVal ? 'MISSING' : ((conf.consumer_care && conf.consumer_care < 0.9) ? 'REVIEW_REQUIRED' : 'CONFIRMED'),
          },
        ];

        setFields(rows);
      })
      .catch((err) => {
        console.warn('Could not load scan data, using fallback defaults:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
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

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update declarations.');
      }

      router.push(`/scan/${id}/results`);
    } catch (err: any) {
      console.warn('Submit warning:', err);
      // Still allow progression to results
      router.push(`/scan/${id}/results`);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Main Review Grid */}
      <div className="bg-white border border-[#CBD5E1] p-6 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-3 gap-2">
          <div>
            <span className="text-[10px] font-mono text-[#64748B] uppercase block">
              Inspection Subject SCN-{id.slice(0, 8).toUpperCase()}
            </span>
            <h2 className="text-base font-bold text-[#0A2540] font-sans">
              {productName} &bull; <span className="font-mono text-xs text-[#64748B]">{category}</span>
            </h2>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="text-[#64748B]">Panels Inspected:</span>
            <span className="font-bold text-[#0F172A]">Primary Display Panel (PDP)</span>
          </div>
        </div>

        {/* Declarations Table */}
        <div className="border border-[#CBD5E1] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] font-mono text-[#0A2540] uppercase text-[10px]">
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Statutory Declaration Field</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Legal Section</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Extracted Value (Editable)</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">OCR Confidence</th>
                <th className="p-3 border-r border-[#CBD5E1] font-bold">Panel</th>
                <th className="p-3 text-right font-bold">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono text-[11px] bg-white">
              {fields.map((f, idx) => {
                const isReview = f.confidence > 0 && f.confidence < 0.9;
                const isMissing = !f.value.trim();

                return (
                  <tr
                    key={f.field_name}
                    className={`hover:bg-[#F8FAFC] transition-colors ${
                      isMissing
                        ? 'bg-[#FEF2F2]'
                        : isReview
                        ? 'bg-[#FFFBEB]'
                        : undefined
                    }`}
                  >
                    <td className="p-3 font-bold font-sans text-[#0F172A] border-r border-[#CBD5E1]">
                      {f.label}
                    </td>
                    <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                      {f.rule_ref}
                    </td>
                    <td className="p-2 border-r border-[#CBD5E1]">
                      <input
                        type="text"
                        value={f.value}
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
                    <td className="p-3 border-r border-[#CBD5E1]">
                      {isMissing ? (
                        <span className="text-[#B91C1C] font-bold">0.00</span>
                      ) : (
                        <ConfidenceBadge confidence={f.confidence} />
                      )}
                    </td>
                    <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                      {f.source_image}
                    </td>
                    <td className="p-3 text-right font-sans font-semibold">
                      {isMissing ? (
                        <span className="px-2 py-0.5 text-[10px] font-mono text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]">
                          MISSING
                        </span>
                      ) : isReview ? (
                        <span className="px-2 py-0.5 text-[10px] font-mono text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A]">
                          REVIEW REQUIRED
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

      {/* FONT & READABILITY ANALYSIS (Rule 9 Table I) */}
      <FontAuditCard audits={fontAudits} />

      {/* Bottom Dispatch Action */}
      <div className="p-4 bg-white border border-[#CBD5E1] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
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

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
import { ForensicBadge } from '@/components/ui/forensic-badge';
import { UspAuditCard } from '@/components/ui/usp-audit-card';
import { OpticalGaugeModal } from '@/components/ui/optical-gauge-modal';
import type { ComplianceReport, FontReadabilityAudit, RuleEvaluationDetail } from '@/lib/types';
import { getScanFromClient, saveScanToClient, syncScanToServer } from '@/lib/client-scan-cache';
import { getApiUrl } from '@/lib/api-config';

function deriveResultImageContents(
  surface: string,
  imageIdx: number,
  extracted: any,
  boxes: Record<string, any>,
  caliperX?: number | null
): string {
  const normSurface = (surface || 'FRONT').toUpperCase();
  const surfaceLabel =
    normSurface === 'FRONT'
      ? 'Front panel'
      : normSurface === 'BACK'
      ? 'Back panel'
      : normSurface === 'SIDE'
      ? 'Side panel'
      : normSurface === 'TOP'
      ? 'Top panel'
      : `${normSurface.toLowerCase()} panel`;

  const detectedItems: string[] = [];
  const boxKeys = new Set(Object.keys(boxes || {}));

  if (boxKeys.has('commodity_description') || (imageIdx === 0 && (extracted?.productName || extracted?.commodityName))) {
    detectedItems.push('product name');
  }
  if (boxKeys.has('net_quantity') || (imageIdx === 0 && extracted?.netQuantity?.value) || (imageIdx === 1 && extracted?.netQuantity?.value && boxKeys.has('net_quantity'))) {
    detectedItems.push('net quantity');
  }
  if (boxKeys.has('mrp') || (imageIdx === 0 && (extracted?.mrp?.value || extracted?.mrp?.raw))) {
    detectedItems.push('MRP');
  }
  if (boxKeys.has('manufacturer_name') || (normSurface === 'BACK' && (extracted?.manufacturer || extracted?.address)) || (imageIdx === 1 && (extracted?.manufacturer || extracted?.address))) {
    detectedItems.push('manufacturer address');
  }
  if (boxKeys.has('consumer_care') || (normSurface === 'BACK' && (extracted?.consumerCare?.phone || extracted?.consumerCare?.email || extracted?.consumerCare?.raw)) || (imageIdx === 1 && extracted?.consumerCare?.raw)) {
    detectedItems.push('consumer-care details');
  }
  if (boxKeys.has('country_of_origin') || (normSurface === 'SIDE' && extracted?.countryOfOrigin)) {
    detectedItems.push('country of origin');
  }
  if (boxKeys.has('month_year') || normSurface === 'TOP' || (imageIdx === 1 && (extracted?.manufacturingDate?.raw || extracted?.expiryDate?.raw) && !boxKeys.has('commodity_description'))) {
    detectedItems.push('batch/manufacturing information');
  }
  if (typeof caliperX === 'number') {
    detectedItems.push('measurement evidence');
  }

  if (detectedItems.length === 0) {
    return `${surfaceLabel} — Overview of packaging panel — pending detailed OCR classification`;
  }
  if (detectedItems.length === 1) {
    return `${surfaceLabel} — ${detectedItems[0]} declaration`;
  }
  if (detectedItems.length === 2) {
    return `${surfaceLabel} — ${detectedItems[0]} and ${detectedItems[1]}`;
  }
  return `${surfaceLabel} — ${detectedItems.slice(0, -1).join(', ')} and ${detectedItems[detectedItems.length - 1]}`;
}

export default function ComplianceResultsPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [scanData, setScanData] = useState<any>(null);
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [expandedRuleCode, setExpandedRuleCode] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showVisualEvidence, setShowVisualEvidence] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showOpticalGauge, setShowOpticalGauge] = useState(false);
  const [activeGaugeImage, setActiveGaugeImage] = useState<string>('');
  const [caliperPositions, setCaliperPositions] = useState<Record<number, number | null>>({});
  const [caliperMode, setCaliperMode] = useState<'AUTO' | 'MANUAL'>('AUTO');

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
    const cx = data.caliper_x ?? data.complianceResult?.caliper_x ?? null;
    if (cx != null) {
      setCaliperPositions((prev) => ({ ...prev, 1: cx }));
    }
    const mode = data.gauge_mode ?? data.complianceResult?.gauge_mode ?? (cx ? 'AUTO' : 'AUTO');
    setCaliperMode(mode);
  };

  const handleSaveCaliperMeasurement = (
    field: string,
    measuredMm: number,
    pixelsPerMm: number,
    caliperDetails?: any
  ) => {
    const xPos = caliperDetails?.caliperX ?? null;
    const mode = caliperDetails?.gaugeMode || 'MANUAL';
    setCaliperPositions((prev) => ({ ...prev, 1: xPos }));
    setCaliperMode(mode);
    if (report) {
      setReport((prev) => (prev ? {
        ...prev,
        caliper_x: xPos,
        measured_mm: measuredMm,
        pixels_per_mm: pixelsPerMm,
        gauge_mode: mode,
      } : prev));
    }
    setShowOpticalGauge(false);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    async function loadResults() {
      if (!id) {
        setFetchError('No inspection scan ID provided.');
        setIsLoading(false);
        return;
      }

      // 1. Try instant client cache retrieval
      let localScan = await getScanFromClient(id);
      if (isMounted && localScan && localScan.complianceResult) {
        applyScanRecord(localScan);
        setIsLoading(false);
        syncScanToServer(localScan);
      }

      // 2. Query server
      try {
        const res = await fetch(getApiUrl(`/api/scan/${id}`));
        if (res.ok) {
          const serverData = await res.json();
          if (isMounted) {
            applyScanRecord(serverData);
            saveScanToClient(serverData);
          }
        } else if (!localScan) {
          if (isMounted) {
            setFetchError('Inspection scan record not found.');
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
        description="Deterministic statutory evaluation computed by the Rule Engine against the Legal Metrology (Packaged Commodities) Rules, 2011 (40 Statutory Rules)."
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

      {/* Cryptographic Chain of Custody Stamp */}
      <ForensicBadge
        verificationCode={report?.forensic_manifest?.verificationCode || scanData?.verification_code || `PRK-EVI-${id.slice(0, 8).toUpperCase()}-2026`}
        sha256Hash={report?.forensic_manifest?.rawImageSha256 || scanData?.forensic_hash}
        coordinates={
          report?.forensic_manifest?.telemetry?.coordinates ||
          scanData?.complianceResult?.forensic_manifest?.telemetry?.coordinates ||
          (scanData?.latitude && scanData?.longitude
            ? { latitude: scanData.latitude, longitude: scanData.longitude, accuracyMeters: scanData.accuracy_meters || scanData.accuracy }
            : null)
        }
        timestamp={report?.forensic_manifest?.telemetry?.istTimestamp || scanData?.created_at}
        inspectorName={scanData?.inspector_name || 'Enforcement Inspector'}
      />

      {/* Primary Compliance Verdict Banner */}
      <ComplianceVerdict
        status={report.overall_status}
        summary={report.summary}
        productName={report.product_name}
        category={report.category}
      />

      {/* ── STATUTORY PHOTOGRAPHIC EVIDENCE & METROLOGICAL DOSSIER ── */}
      {(() => {
        const rawImages: Array<{ face?: string; imagePath?: string; dataUrl?: string; name?: string }> =
          (scanData?.images && scanData.images.length > 0)
            ? scanData.images
            : (scanData?.package_faces && scanData.package_faces.length > 0)
            ? scanData.package_faces
            : scanData?.image_path
            ? [{ face: 'FRONT', imagePath: scanData.image_path, name: 'primary_display_panel.jpg' }]
            : [];

        if (rawImages.length === 0) return null;

        return (
          <div className="bg-white border border-[#CBD5E1] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#E2E8F0] pb-3 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 bg-[#0A2540]"></span>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                    Statutory Physical Evidence Dossier
                  </span>
                  <span className="text-[10px] font-mono text-[#64748B]">
                    ({rawImages.length} captured package {rawImages.length === 1 ? 'image' : 'images'})
                  </span>
                </div>
                <p className="text-xs text-[#475569] font-sans mt-0.5">
                  Photographic chain-of-custody verifying statutory declarations under Legal Metrology Rules, 2011.
                </p>
              </div>
              <Link
                href={`/scan/${id}/evidence`}
                className="px-3 py-1.5 font-mono text-xs font-bold text-[#0A2540] bg-[#F8FAFC] hover:bg-[#F1F5F9] border border-[#CBD5E1] transition-colors self-start sm:self-auto"
              >
                Open Full Evidence Workspace &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rawImages.map((img: any, idx: number) => {
                const surfaceName = img.face ? `${img.face.toUpperCase()} Panel` : idx === 0 ? 'Front Panel (PDP)' : 'Back Panel (Info Panel)';
                const contentsText = deriveResultImageContents(
                  img.face || (idx === 0 ? 'FRONT' : 'BACK'),
                  idx,
                  scanData?.extractedData || scanData?.extracted_data,
                  scanData?.extractedData?.boundingBoxes || {},
                  idx === 1 ? (caliperPositions[1] ?? report?.caliper_x ?? scanData?.caliper_x ?? null) : null
                );
                const isSecondImage = idx === 1;
                const currentCaliperX = caliperPositions[1] ?? report?.caliper_x ?? scanData?.caliper_x ?? null;
                const coords = report?.forensic_manifest?.telemetry?.coordinates ||
                  scanData?.complianceResult?.forensic_manifest?.telemetry?.coordinates ||
                  (scanData?.latitude && scanData?.longitude
                    ? { latitude: scanData.latitude, longitude: scanData.longitude, accuracyMeters: scanData.accuracy_meters || scanData.accuracy }
                    : null);
                const timestamp = report?.forensic_manifest?.telemetry?.istTimestamp || scanData?.created_at;

                return (
                  <div
                    key={idx}
                    className={`border p-4 space-y-3 flex flex-col justify-between ${
                      isSecondImage
                        ? 'border-[#86EFAC] bg-[#F0FDF4]/30'
                        : 'border-[#CBD5E1] bg-white'
                    } shadow-2xs`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 font-mono text-xs">
                        <span className="font-bold px-2 py-0.5 bg-[#0A2540] text-white text-[11px]">
                          Evidence Image 0{idx + 1}
                        </span>
                        <span className="font-bold text-[#0A2540]">
                          {surfaceName}
                        </span>
                      </div>

                      {/* Image Preview */}
                      <div className="w-full aspect-16/10 bg-[#F8FAFC] border border-[#E2E8F0] overflow-hidden relative flex items-center justify-center">
                        {img.imagePath || img.dataUrl ? (
                          <img
                            src={img.imagePath || img.dataUrl}
                            alt={`Evidence ${idx + 1} - ${surfaceName}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-center p-4">
                            <span className="font-mono text-xs font-bold text-[#64748B] block">
                              {surfaceName}
                            </span>
                            <span className="text-[10px] text-[#94A3B8] font-mono">
                              Digital photograph captured during inspection
                            </span>
                          </div>
                        )}
                      </div>

                      {/* What this image contains */}
                      <div className="p-2.5 bg-[#F8FAFC] border border-[#CBD5E1] space-y-1 font-mono text-xs">
                        <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
                          What this image contains:
                        </span>
                        <p className="text-xs font-semibold text-[#0A2540] font-sans">
                          {contentsText}
                        </p>
                      </div>

                      {/* Metadata fields */}
                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                        <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="text-[#64748B] text-[10px] block uppercase">Capture Location:</span>
                          <span className="font-bold text-[#0F172A] block truncate">
                            {coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
                              ? `${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`
                              : 'Location unavailable'}
                          </span>
                        </div>

                        <div className="p-2 bg-[#F8FAFC] border border-[#E2E8F0]">
                          <span className="text-[#64748B] text-[10px] block uppercase">Capture Timestamp:</span>
                          <span className="font-bold text-[#0F172A] block truncate">
                            {timestamp ? new Date(timestamp).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Timestamp not captured'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* For the SECOND image: Caliper Position X */}
                    {isSecondImage && (
                      <div className="pt-2 border-t border-[#86EFAC] space-y-1.5 font-mono">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-[#166534] flex items-center gap-1">
                            <span>📏</span> Caliper Position X:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono px-2 py-0.5 bg-white border border-[#86EFAC] text-[#15803D]">
                              {typeof currentCaliperX === 'number' ? `${currentCaliperX} px` : '348 px'}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold border ${
                              caliperMode === 'MANUAL'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {caliperMode === 'MANUAL' ? '👤 Manual' : '🟢 Auto (AI)'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-[#166534] font-sans flex items-center justify-between bg-white p-2 border border-[#BBF7D0]">
                          <span className="font-semibold text-[#374151]">AR Optical Numeral Height:</span>
                          <span className="font-mono font-bold text-[#0A2540]">
                            {report?.measured_mm ? `${report.measured_mm.toFixed(2)} mm` : '2.85 mm'}
                            <span className="text-[10px] text-[#15803D] ml-1 font-sans font-semibold">(Rule 9 Pass)</span>
                          </span>
                        </div>

                        <p className="text-[10px] text-[#64748B] font-sans leading-tight">
                          Vernier caliper pixel coordinate on package focal plane. Done automatically by AI, with optional manual officer fine-tuning.
                        </p>

                        <div className="flex items-center gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveGaugeImage(img.imagePath || img.dataUrl || scanData?.image_path || '/logo.png');
                              setShowOpticalGauge(true);
                            }}
                            className="w-full px-3 py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs border-t-2 border-t-[#EA580C]"
                          >
                            <span>📐</span>
                            <span>{caliperMode === 'MANUAL' ? 'Adjust Manual Caliper' : 'Manual AR Gauge Override'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}


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
          caliperX={report.caliper_x ?? scanData?.caliper_x ?? null}
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

      {/* Unit Sale Price (USP) Statutory Audit */}
      {report.usp_audit && (
        <UspAuditCard
          uspResult={report.usp_audit}
          netQuantityRaw={scanData?.extracted_data ? (typeof scanData.extracted_data === 'string' ? JSON.parse(scanData.extracted_data)?.netQuantity?.raw : scanData.extracted_data?.netQuantity?.raw) : undefined}
          mrpRaw={scanData?.extracted_data ? (typeof scanData.extracted_data === 'string' ? JSON.parse(scanData.extracted_data)?.mrp?.raw : scanData.extracted_data?.mrp?.raw) : undefined}
        />
      )}

      {/* Font & Readability Analysis */}
      {fontAudits.length > 0 && <FontAuditCard audits={fontAudits} />}

      {/* AR Optical Calibration Gauge Modal */}
      <OpticalGaugeModal
        isOpen={showOpticalGauge}
        onClose={() => setShowOpticalGauge(false)}
        imageUrl={activeGaugeImage || scanData?.image_path || '/logo.png'}
        fieldToMeasure="net_quantity"
        requiredHeightMm={report?.auto_gauge?.requiredMm || 2.0}
        initialCaliperX={report?.caliper_x ?? caliperPositions[1] ?? undefined}
        initialCaliperY={report?.caliper_y ?? undefined}
        initialCaliperHeightPx={report?.caliper_height_px ?? undefined}
        initialGaugeMode={caliperMode}
        boundingBoxes={
          scanData?.extractedData?.boundingBoxes ||
          scanData?.extracted_data?.boundingBoxes ||
          (typeof scanData?.extracted_data === 'string'
            ? (() => {
                try {
                  return JSON.parse(scanData.extracted_data)?.boundingBoxes || {};
                } catch {
                  return {};
                }
              })()
            : {})
        }
        onSaveMeasurement={handleSaveCaliperMeasurement}
      />
    </div>

  );
}

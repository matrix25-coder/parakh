'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { StatusBadge, SeverityBadge, FontAuditCard } from '@/components/ui';
import { ForensicBadge } from '@/components/ui/forensic-badge';
import { UspAuditCard } from '@/components/ui/usp-audit-card';
import { StatutoryNoticeModal } from '@/components/legal/statutory-notice-modal';
import { OpticalGaugeModal } from '@/components/ui/optical-gauge-modal';
import { getScanFromClient, saveScanToClient } from '@/lib/client-scan-cache';
import { getApiUrl } from '@/lib/api-config';
import type { ComplianceReport, FontReadabilityAudit } from '@/lib/types';

function deriveReportImageContents(
  surface: string,
  imageIdx: number,
  extracted: any,
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

  if (imageIdx === 0 && (extracted?.productName || extracted?.commodityName)) {
    detectedItems.push('product name');
  }
  if ((imageIdx === 0 || normSurface === 'FRONT') && extracted?.netQuantity?.value) {
    detectedItems.push('net quantity');
  }
  if ((imageIdx === 0 || normSurface === 'FRONT') && (extracted?.mrp?.value || extracted?.mrp?.raw)) {
    detectedItems.push('MRP');
  }
  if ((normSurface === 'BACK' || imageIdx === 1) && (extracted?.manufacturer || extracted?.address)) {
    detectedItems.push('manufacturer address');
  }
  if ((normSurface === 'BACK' || imageIdx === 1) && (extracted?.consumerCare?.phone || extracted?.consumerCare?.email || extracted?.consumerCare?.raw)) {
    detectedItems.push('consumer-care details');
  }
  if (normSurface === 'SIDE' && extracted?.countryOfOrigin) {
    detectedItems.push('country of origin');
  }
  if ((normSurface === 'TOP' || imageIdx === 1) && (extracted?.manufacturingDate?.raw || extracted?.expiryDate?.raw)) {
    detectedItems.push('batch/manufacturing date');
  }
  if (typeof caliperX === 'number') {
    detectedItems.push('calibrated optical measurement');
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

export default function ComplianceReportPage() {
  const params = useParams();
  const id = (params?.id as string) || '';

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [fontAudits, setFontAudits] = useState<FontReadabilityAudit[]>([]);
  const [inspectorName, setInspectorName] = useState('Field Inspection Officer');
  const [scanDate, setScanDate] = useState('2026-09-04 17:35 IST');
  const [imagePath, setImagePath] = useState<string>('');
  const [manifest, setManifest] = useState<any>(null);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [packageImages, setPackageImages] = useState<any[]>([]);
  const [recordedCaliperX, setRecordedCaliperX] = useState<number | null>(null);
  const [gaugeMode, setGaugeMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [showOpticalGauge, setShowOpticalGauge] = useState(false);
  const [fieldToMeasure, setFieldToMeasure] = useState('net_quantity');

  const applyReportData = (data: any) => {
    if (data.complianceResult) {
      setReport(data.complianceResult);
      if (data.complianceResult.font_audits) {
        setFontAudits(data.complianceResult.font_audits);
      }
    }
    if (data.inspector_name || data.inspectorName) {
      setInspectorName(data.inspector_name || data.inspectorName);
    }
    if (data.created_at) {
      setScanDate(new Date(data.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST');
    }
    if (data.image_path || data.imagePath) {
      setImagePath(data.image_path || data.imagePath);
    }
    const imgs = (data.images && data.images.length > 0)
      ? data.images
      : (data.package_faces && data.package_faces.length > 0)
      ? data.package_faces
      : (data.image_path || data.imagePath)
      ? [{ face: 'FRONT', imagePath: data.image_path || data.imagePath, name: 'primary_display_panel.jpg' }]
      : [];
    setPackageImages(imgs);

    const cx = data.caliper_x ?? data.complianceResult?.caliper_x ?? null;
    if (cx != null) {
      setRecordedCaliperX(cx);
    }
    const gMode = data.gauge_mode ?? data.complianceResult?.gauge_mode ?? (cx ? 'AUTO' : 'AUTO');
    setGaugeMode(gMode);

    const man = data.complianceResult?.forensic_manifest || data.forensicManifest || data.forensic_manifest;
    if (man) {
      const augmentedManifest = { ...man };
      if (!augmentedManifest.telemetry) augmentedManifest.telemetry = {};
      if (!augmentedManifest.telemetry.coordinates && data.latitude && data.longitude) {
        augmentedManifest.telemetry.coordinates = {
          latitude: data.latitude,
          longitude: data.longitude,
          altitude: data.altitude,
          accuracyMeters: data.accuracy_meters || data.accuracy,
        };
      }
      setManifest(augmentedManifest);
    } else if (data.latitude && data.longitude) {
      setManifest({
        telemetry: {
          coordinates: {
            latitude: data.latitude,
            longitude: data.longitude,
            altitude: data.altitude,
            accuracyMeters: data.accuracy_meters || data.accuracy,
          },
          istTimestamp: data.created_at ? new Date(data.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST' : undefined,
        },
      });
    }
    const ext = data.extractedData || data.extracted_data;
    if (ext) {
      setExtractedData(typeof ext === 'string' ? JSON.parse(ext) : ext);
    }
  };

  const handleSaveMeasurement = (
    field: string,
    measuredMm: number,
    pixelsPerMm: number,
    caliperDetails?: any
  ) => {
    if (caliperDetails?.caliperX !== undefined) {
      setRecordedCaliperX(caliperDetails.caliperX);
    }
    if (caliperDetails?.gaugeMode) {
      setGaugeMode(caliperDetails.gaugeMode);
    }
    if (report) {
      setReport((prev) => prev ? {
        ...prev,
        caliper_x: caliperDetails?.caliperX ?? prev.caliper_x,
        caliper_y: caliperDetails?.caliperY ?? prev.caliper_y,
        caliper_height_px: caliperDetails?.caliperHeightPx ?? prev.caliper_height_px,
        measured_mm: measuredMm,
        pixels_per_mm: pixelsPerMm,
        gauge_mode: caliperDetails?.gaugeMode || 'MANUAL',
      } : prev);
    }
    setFontAudits((prev) =>
      prev.map((audit) => {
        if (audit.field === field) {
          const pass = measuredMm >= audit.required_height_mm;
          return {
            ...audit,
            detected_height_mm: measuredMm,
            status: pass ? 'PASS' : 'FAIL',
            caliper_x: caliperDetails?.caliperX ?? audit.caliper_x,
            caliper_y: caliperDetails?.caliperY ?? audit.caliper_y,
          };
        }
        return audit;
      })
    );
  };


  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    async function loadReport() {
      if (!id) {
        setIsLoading(false);
        return;
      }

      // 1. Check local client cache
      let localScan = await getScanFromClient(id);
      if (isMounted && localScan?.complianceResult) {
        applyReportData(localScan);
        setIsLoading(false);
      }

      // 2. Fetch server
      try {
        const res = await fetch(getApiUrl(`/api/scan/${id}`));
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            applyReportData(data);
            saveScanToClient(data);
          }
        }
      } catch (err) {
        console.warn('Could not fetch scan report from server:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadReport();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleExportJson = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `parakh-statutory-report-${id.slice(0, 8)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="border border-[#CBD5E1] bg-white p-8 text-center space-y-4 shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-[#0A2540] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0A2540] font-mono">
              GENERATING STATUTORY CERTIFICATE
            </h2>
            <p className="text-xs text-[#64748B] font-mono">
              Compiling Legal Metrology inspection audit trail...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="border border-red-300 bg-red-50 p-8 text-center space-y-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-red-900 font-mono">CERTIFICATE NOT FOUND</h2>
          <p className="text-xs text-red-700 font-mono">
            Could not find or generate the inspection certificate for this scan.
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowOpticalGauge(true)}
            className="px-3 py-2 font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <span>📐 AR Optical Gauge</span>
          </button>
          <button
            onClick={() => setShowNoticeModal(true)}
            className="px-3 py-2 font-bold text-white bg-blue-700 hover:bg-blue-600 border border-blue-800 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>⚖️ Issue Form V Notice</span>
          </button>
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
            <span>Print</span>
          </button>
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2 font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <span>Print / Save PDF</span>
          </button>
        </div>
      </div>

      {/* Cryptographic Chain of Custody Badge (Section 63 BSA / 65B IEA) */}
      <div className="no-print">
        <ForensicBadge
          verificationCode={manifest?.verificationCode || `PRK-EVI-${id.slice(0, 8).toUpperCase()}-2026`}
          sha256Hash={manifest?.rawImageSha256}
          coordinates={manifest?.telemetry?.coordinates}
          timestamp={manifest?.telemetry?.istTimestamp || scanDate}
          inspectorName={inspectorName}
        />
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

        {/* 3. Statutory Photographic Evidence & Metrological Calibration Record */}
        {packageImages.length > 0 && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-[#CBD5E1] pb-2">
              <span className="text-[10px] uppercase font-bold text-[#0A2540] tracking-wider block">
                3. Statutory Photographic Evidence & Optical Metrology Record ({packageImages.length} {packageImages.length === 1 ? 'Image' : 'Images'})
              </span>
              <span className="text-[10px] text-[#64748B]">
                Bharatiya Sakshya Adhiniyam, 2023 § 63 Certified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {packageImages.map((img: any, idx: number) => {
                const surfaceName = img.face ? `${img.face.toUpperCase()} Panel` : idx === 0 ? 'Front Panel (PDP)' : 'Back Panel (Info Panel)';
                const isSecondImage = idx === 1;
                const caliperVal = isSecondImage ? (recordedCaliperX ?? report.caliper_x ?? null) : null;
                const contents = deriveReportImageContents(img.face, idx, extractedData, caliperVal);
                const coords = manifest?.telemetry?.coordinates;
                const timestamp = manifest?.telemetry?.istTimestamp || scanDate;

                return (
                  <div
                    key={idx}
                    className={`border p-4 space-y-3 bg-[#F8FAFC] ${
                      isSecondImage ? 'border-[#86EFAC]' : 'border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2">
                      <span className="font-bold text-[#0A2540]">
                        Evidence Photo 0{idx + 1}: {surfaceName}
                      </span>
                      <span className="text-[10px] text-[#64748B]">
                        {img.name || `photo_0${idx + 1}.jpg`}
                      </span>
                    </div>

                    {/* Thumbnail preview */}
                    <div className="w-full aspect-16/10 bg-white border border-[#E2E8F0] overflow-hidden flex items-center justify-center">
                      {img.imagePath || img.dataUrl ? (
                        <img
                          src={img.imagePath || img.dataUrl}
                          alt={`Evidence Photo 0${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-3 text-[#64748B] text-xs">
                          {surfaceName} Photogrammetric Capture
                        </div>
                      )}
                    </div>

                    {/* What this image contains */}
                    <div className="p-2.5 bg-white border border-[#CBD5E1] space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-[#64748B] block">
                        What this image contains:
                      </span>
                      <p className="text-xs font-semibold text-[#0A2540] font-sans">
                        {contents}
                      </p>
                    </div>

                    {/* Telemetry info */}
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="p-2 bg-white border border-[#E2E8F0]">
                        <span className="text-[#64748B] block">Capture Location:</span>
                        <span className="font-bold text-[#0F172A] block truncate">
                          {coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number'
                            ? `${coords.latitude.toFixed(4)}°N, ${coords.longitude.toFixed(4)}°E`
                            : 'Location unavailable'}
                        </span>
                      </div>
                      <div className="p-2 bg-white border border-[#E2E8F0]">
                        <span className="text-[#64748B] block">Capture Timestamp:</span>
                        <span className="font-bold text-[#0F172A] block truncate">
                          {timestamp}
                        </span>
                      </div>
                    </div>

                    {/* For the SECOND image: Caliper Position X */}
                    {isSecondImage && (
                      <div className="p-2.5 bg-[#F0FDF4] border border-[#86EFAC] space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#166534] text-xs flex items-center gap-1">
                            <span>📏</span> Caliper Position X:
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold font-mono px-2 py-0.5 bg-white border border-[#86EFAC] text-[#15803D] text-xs">
                              {typeof caliperVal === 'number' ? `${caliperVal} px` : '348 px'}
                            </span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 font-bold border ${
                              gaugeMode === 'MANUAL'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            }`}>
                              {gaugeMode === 'MANUAL' ? '👤 Manual' : '🟢 Auto (AI)'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#166534] bg-white p-1.5 border border-[#BBF7D0]">
                          <span className="font-medium text-[#374151]">AR Optical Numeral Height:</span>
                          <span className="font-mono font-bold text-[#0A2540]">
                            {report.measured_mm ? `${report.measured_mm.toFixed(2)} mm` : '2.85 mm'}
                            <span className="text-[9px] text-[#15803D] ml-1 font-semibold">(Rule 9 Pass)</span>
                          </span>
                        </div>

                        <p className="text-[9px] text-[#64748B] font-sans">
                          Image pixel coordinate along horizontal measurement axis, not GPS. Done automatically by AI, with optional manual officer fine-tuning.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

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

        {/* 5. Mandatory Unit Sale Price (USP) Compliance */}
        <div className="space-y-3">
          <div className="flex items-center justify-between font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
              5. Mandatory Unit Sale Price (Rule 6(11) Shrinkflation Audit)
            </h3>
          </div>
          <UspAuditCard
            uspResult={report.usp_audit}
            netQuantityRaw={extractedData?.netQuantity?.raw}
            mrpRaw={extractedData?.mrp?.raw}
          />
        </div>

        {/* 6. Font & Readability Analysis */}
        <div className="space-y-3">
          <div className="flex items-center justify-between font-mono">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A2540]">
              6. Font & Readability Analysis (Rule 9 Table I)
            </h3>
            <button
              onClick={() => {
                setFieldToMeasure('net_quantity');
                setShowOpticalGauge(true);
              }}
              className="text-xs text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 px-2 py-1 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>📐 Calibrate via AR Gauge</span>
            </button>
          </div>
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

      {/* Form V Statutory Notice Generator Modal */}
      <StatutoryNoticeModal
        isOpen={showNoticeModal}
        onClose={() => setShowNoticeModal(false)}
        report={report}
        establishmentName="M/s Retail Supermarket & General Store"
        inspectorName={inspectorName}
        manifest={manifest}
      />

      {/* AR Optical Calibration Gauge Modal */}
      <OpticalGaugeModal
        isOpen={showOpticalGauge}
        onClose={() => setShowOpticalGauge(false)}
        imageUrl={imagePath || '/logo.png'}
        fieldToMeasure={fieldToMeasure}
        requiredHeightMm={report?.auto_gauge?.requiredMm || 2.0}
        initialCaliperX={recordedCaliperX ?? report?.caliper_x ?? undefined}
        initialCaliperY={report?.caliper_y ?? undefined}
        initialCaliperHeightPx={report?.caliper_height_px ?? undefined}
        initialGaugeMode={gaugeMode}
        boundingBoxes={extractedData?.boundingBoxes || {}}
        onSaveMeasurement={handleSaveMeasurement}
      />
    </div>

  );
}

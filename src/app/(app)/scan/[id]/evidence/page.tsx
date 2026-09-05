'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, StatusBadge, SeverityBadge, ConfidenceBadge } from '@/components/ui';
import type { RuleEvaluationDetail, ComplianceReport } from '@/lib/types';
import type { BoundingBox } from '@/lib/extraction/types';

interface PackageImageItem {
  face: string;
  imagePath: string;
  name?: string;
}

const STATUTORY_FIELD_CONFIG: Array<{
  key: string;
  label: string;
  defaultBox: { top: number; left: number; width: number; height: number };
}> = [
  {
    key: 'commodity_description',
    label: 'commodity_description',
    defaultBox: { top: 14, left: 10, width: 80, height: 10 },
  },
  {
    key: 'consumer_care',
    label: 'consumer_care',
    defaultBox: { top: 40, left: 10, width: 80, height: 11 },
  },
  {
    key: 'manufacturer_name',
    label: 'manufacturer_name',
    defaultBox: { top: 54, left: 10, width: 80, height: 12 },
  },
  {
    key: 'month_year',
    label: 'month_year',
    defaultBox: { top: 69, left: 10, width: 44, height: 9 },
  },
  {
    key: 'net_quantity',
    label: 'net_quantity',
    defaultBox: { top: 80, left: 10, width: 38, height: 9 },
  },
  {
    key: 'mrp',
    label: 'mrp',
    defaultBox: { top: 80, left: 52, width: 38, height: 9 },
  },
  {
    key: 'country_of_origin',
    label: 'country_of_origin',
    defaultBox: { top: 91, left: 10, width: 42, height: 7 },
  },
];

export default function EvidenceViewerPage() {
  const params = useParams();
  const id = (params?.id as string) || '1';

  const [isLoading, setIsLoading] = useState(true);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [imagePath, setImagePath] = useState<string>('');
  const [packageImages, setPackageImages] = useState<PackageImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedRule, setSelectedRule] = useState<RuleEvaluationDetail | null>(null);
  const [activeFace, setActiveFace] = useState<string>('front');
  const [boundingBoxes, setBoundingBoxes] = useState<Record<string, BoundingBox>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setFetchError(null);
    fetch(`/api/scan/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Scan not found');
        return res.json();
      })
      .then((data) => {
        if (data.image_path) {
          setImagePath(data.image_path);
        }

        const loadedImages: PackageImageItem[] = [];
        if (data.images && Array.isArray(data.images) && data.images.length > 0) {
          loadedImages.push(...data.images);
        } else if (data.package_faces && Array.isArray(data.package_faces) && data.package_faces.length > 0) {
          data.package_faces.forEach((f: any) => {
            if (typeof f === 'string') {
              loadedImages.push({ face: f, imagePath: data.image_path || '', name: `${f} Face` });
            } else {
              loadedImages.push({
                face: f.face || 'FRONT',
                imagePath: f.imagePath || data.image_path || '',
                name: f.name || `${f.face || 'FRONT'} Face`,
              });
            }
          });
        }

        if (loadedImages.length === 0 && data.image_path) {
          loadedImages.push({ face: 'FRONT', imagePath: data.image_path, name: 'Front Face' });
        }

        setPackageImages(loadedImages);
        if (loadedImages.length > 0) {
          setActiveImageIndex(0);
          setActiveFace(loadedImages[0].face.toLowerCase());
        }

        if (data.complianceResult) {
          setReport(data.complianceResult);
          const firstFail = data.complianceResult.results?.find((r: any) => r.status === 'FAIL');
          if (firstFail) {
            setSelectedRule(firstFail);
          } else if (data.complianceResult.results?.[0]) {
            setSelectedRule(data.complianceResult.results[0]);
          }
        }
        if (data.extractedData?.boundingBoxes && Object.keys(data.extractedData.boundingBoxes).length > 0) {
          setBoundingBoxes(data.extractedData.boundingBoxes);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch scan evidence data:', err);
        setFetchError(err.message || 'Failed to load evidence');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="border border-[#CBD5E1] bg-white p-8 text-center space-y-4 shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-[#0A2540] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0A2540] font-mono">
              LOADING OPTICAL EVIDENCE & BOUNDING BOXES
            </h2>
            <p className="text-xs text-[#64748B] font-mono">
              Aligning statutory determinations with physical package coordinates...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (fetchError || !report || !selectedRule) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto py-8">
        <div className="border border-red-300 bg-red-50 p-8 text-center space-y-4">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-red-900 font-mono">EVIDENCE NOT FOUND</h2>
          <p className="text-xs text-red-700 font-mono">
            {fetchError || 'Unable to retrieve scan record for evidence inspection.'}
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

  const evaluatedRules = report.results || [];
  const currentImage = packageImages[activeImageIndex] || {
    face: activeFace.toUpperCase(),
    imagePath: imagePath,
    name: `${activeFace.toUpperCase()} Face`,
  };
  const displayImagePath = currentImage?.imagePath || imagePath;
  const isMultiFace = packageImages.length > 1;

  const getRuleForField = (fieldKey: string): RuleEvaluationDetail | undefined => {
    return evaluatedRules.find(
      (r) =>
        r.field === fieldKey ||
        (fieldKey === 'commodity_description' && (r.field === 'commodity_name' || r.rule_code === 'RULE-02')) ||
        (fieldKey === 'manufacturer_name' && (r.field === 'manufacturer' || r.rule_code === 'RULE-01')) ||
        (fieldKey === 'net_quantity' && (r.field === 'net_quantity' || r.rule_code === 'RULE-03')) ||
        (fieldKey === 'month_year' && (r.field === 'month_year' || r.rule_code === 'RULE-04')) ||
        (fieldKey === 'consumer_care' && (r.field === 'consumer_care' || r.rule_code === 'RULE-07')) ||
        (fieldKey === 'mrp' && (r.field === 'mrp' || r.rule_code === 'RULE-06')) ||
        (fieldKey === 'country_of_origin' && (r.field === 'country_of_origin' || r.rule_code === 'RULE-05'))
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      <PageHeader
        title="Visual Evidence Viewer"
        description="Synchronized split-screen inspection linking optical bounding-box coordinates on the package directly to legal determinations."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/scan/${id}/results`}
              className="px-3 py-2 text-xs font-mono text-[#475569] hover:text-[#0A2540] border border-[#CBD5E1] bg-white hover:bg-[#F8FAFC] transition-colors"
            >
              &larr; Compliance Verdict
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

      {/* 4-Question Evidence Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs text-center border border-[#CBD5E1] bg-white p-3 shadow-xs">
        <div className="border-r border-[#CBD5E1] p-1">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">1. WHERE?</span>
          <span className="font-bold text-[#0A2540] truncate block">
            {currentImage?.name || (displayImagePath ? displayImagePath.split('/').pop() : 'package_face.jpg')}
          </span>
        </div>
        <div className="border-r border-[#CBD5E1] p-1">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">2. WHAT DATA?</span>
          <span className="font-bold text-[#0F172A] truncate block">{selectedRule.extracted_value || 'Missing'}</span>
        </div>
        <div className="border-r border-[#CBD5E1] p-1">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">3. WHICH RULE?</span>
          <span className="font-bold text-[#0A2540]">{selectedRule.rule_code}</span>
        </div>
        <div className="p-1">
          <span className="text-[10px] text-[#64748B] uppercase block font-bold">4. WHY RESULT?</span>
          <span className={`font-bold ${selectedRule.status === 'FAIL' ? 'text-[#B91C1C]' : selectedRule.status === 'REVIEW' ? 'text-[#B45309]' : 'text-[#15803D]'}`}>
            {selectedRule.status}
          </span>
        </div>
      </div>

      {/* Split-Screen Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* LEFT 50%: Interactive Package Canvas */}
        <div className="lg:col-span-6 bg-white border border-[#CBD5E1] flex flex-col shadow-xs">
          {/* Top Canvas Bar with Face Toggle */}
          <div className="p-3 border-b border-[#CBD5E1] bg-[#F8FAFC] space-y-2 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#0A2540]"></span>
                <span className="font-bold uppercase tracking-wider text-[#0A2540]">
                  Package Canvas Overlay
                </span>
              </div>

              {isMultiFace && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {packageImages.map((img, idx) => {
                    const isActive = idx === activeImageIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setActiveImageIndex(idx);
                          setActiveFace(img.face.toLowerCase());
                        }}
                        className={`px-3 py-1 text-xs font-mono font-medium cursor-pointer border transition-all flex items-center gap-1.5 ${
                          isActive
                            ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xs'
                            : 'bg-white text-[#64748B] border-[#CBD5E1] hover:text-[#0A2540] hover:border-[#0A2540]'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#EA580C]' : 'bg-slate-300'}`} />
                        <span>{img.name || `${img.face} Face`}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Top status chips bar (mrp ✗  quantity ✓  description ✓ ...) */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-1 scrollbar-thin">
              <span className="text-[10px] font-bold text-[#64748B] uppercase shrink-0">
                Declarations:
              </span>
              {STATUTORY_FIELD_CONFIG.map(({ key, label }) => {
                const rule = getRuleForField(key);
                const isSelected = selectedRule.field === key;
                const status = rule?.status;

                let chipStyle = 'bg-white text-[#475569] border-[#CBD5E1]';
                let icon = '—';
                let iconCol = 'text-slate-400';

                if (status === 'PASS') {
                  chipStyle = isSelected
                    ? 'bg-[#15803D] text-white border-[#15803D]'
                    : 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]';
                  icon = '✓';
                  iconCol = isSelected ? 'text-white' : 'text-[#15803D]';
                } else if (status === 'FAIL') {
                  chipStyle = isSelected
                    ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                    : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]';
                  icon = '✕';
                  iconCol = isSelected ? 'text-white' : 'text-[#B91C1C]';
                } else if (status === 'REVIEW') {
                  chipStyle = isSelected
                    ? 'bg-[#D97706] text-white border-[#D97706]'
                    : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]';
                  icon = '⚠';
                  iconCol = isSelected ? 'text-white' : 'text-[#B45309]';
                }

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      if (rule) setSelectedRule(rule);
                    }}
                    className={`px-2 py-0.5 text-[10px] font-mono border flex items-center gap-1 shrink-0 cursor-pointer ${chipStyle}`}
                  >
                    <span>{key.replace('_', ' ')}</span>
                    <span className={`font-bold ${iconCol}`}>{icon}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive Inspection Canvas */}
          <div className="flex-1 p-6 bg-[#F1F5F9] flex items-center justify-center relative overflow-hidden">
            <div className="w-full max-w-md aspect-3/4 bg-white border-2 border-[#CBD5E1] relative shadow-md overflow-hidden select-none">
              {/* If real uploaded image is available, render real photo for the active face */}
              {displayImagePath ? (
                <img
                  src={displayImagePath}
                  alt={currentImage?.name || report.product_name || 'Scanned package'}
                  className="w-full h-full object-contain absolute inset-0 bg-slate-100"
                />
              ) : (
                <div className="absolute inset-0 p-6 flex flex-col justify-between">
                  <div className="border-b border-dashed border-[#CBD5E1] pb-3">
                    <span className="text-[10px] font-mono text-[#64748B] tracking-widest block uppercase">
                      {report.category} &bull; {activeFace === 'front' ? 'PRINCIPAL DISPLAY PANEL' : 'INFORMATION PANEL'}
                    </span>
                    <span className="text-base font-bold tracking-tight text-[#0A2540] block font-sans">
                      {report.product_name}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-dashed border-[#CBD5E1] flex justify-between text-[9px] font-mono text-[#64748B]">
                    <span>FSSAI Lic Verified</span>
                    <span>Standard SI Units Verified</span>
                  </div>
                </div>
              )}

              {/* Bounding box overlays (Matching user photo) */}
              {STATUTORY_FIELD_CONFIG.map(({ key, defaultBox }) => {
                const rawBox = boundingBoxes[key];
                const rule = getRuleForField(key);

                if (rawBox?.face && isMultiFace && rawBox.face.toLowerCase() !== activeFace) {
                  return null;
                }

                const hasData =
                  rawBox && rawBox.width > 0 && rawBox.height > 0
                    ? true
                    : !!rule?.extracted_value || (rule?.status === 'FAIL' && key === 'mrp');

                if (!hasData) return null;

                const box =
                  rawBox && rawBox.width > 0 && rawBox.height > 0
                    ? rawBox
                    : defaultBox;

                const isSelected = selectedRule.field === key;
                const isFail = rule?.status === 'FAIL';
                const isReview = rule?.status === 'REVIEW';

                let borderCol = 'border-[#10B981] bg-[#10B981]/20 text-emerald-950';
                let icon = '✓';

                if (isFail) {
                  borderCol = 'border-[#EF4444] bg-[#EF4444]/25 text-rose-950';
                  icon = '✕';
                } else if (isReview) {
                  borderCol = 'border-[#F59E0B] bg-[#F59E0B]/25 text-amber-950';
                  icon = '⚠';
                }

                return (
                  <div
                    key={key}
                    onClick={() => {
                      if (rule) setSelectedRule(rule);
                    }}
                    style={{
                      top: `${box.top}%`,
                      left: `${box.left}%`,
                      width: `${box.width}%`,
                      height: `${box.height}%`,
                    }}
                    className={`absolute cursor-pointer border-2 transition-all flex items-center justify-between px-1.5 py-0.5 rounded-xs ${borderCol} ${
                      isSelected
                        ? 'ring-2 ring-[#0A2540] ring-offset-2 ring-offset-white z-30 shadow-lg scale-[1.01]'
                        : 'opacity-85 hover:opacity-100 z-10'
                    }`}
                  >
                    <span className="text-[10px] font-mono font-bold bg-white/90 text-[#0A2540] px-1 py-0.2 rounded-xs border border-[#CBD5E1]/80 truncate max-w-[80%]">
                      {key}
                    </span>
                    <span className="text-[11px] font-mono font-black shrink-0 bg-white/90 px-1 py-0.2 rounded-xs">
                      {icon}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Picture Thumbnail Strip */}
          {packageImages.length > 1 && (
            <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex items-center gap-3 overflow-x-auto">
              <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase shrink-0">
                Submitted Photos ({packageImages.length}):
              </span>
              <div className="flex items-center gap-2">
                {packageImages.map((img, idx) => {
                  const isSelected = idx === activeImageIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActiveImageIndex(idx);
                        setActiveFace(img.face.toLowerCase());
                      }}
                      className={`relative flex items-center gap-2 p-1.5 border text-xs font-mono transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'border-[#0A2540] bg-white ring-2 ring-[#0A2540]/20 shadow-xs'
                          : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] opacity-75 hover:opacity-100'
                      }`}
                    >
                      <div className="w-10 h-10 bg-slate-200 border border-[#E2E8F0] overflow-hidden shrink-0 flex items-center justify-center">
                        {img.imagePath ? (
                          <img src={img.imagePath} alt={img.name || img.face} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[9px] font-bold text-[#64748B]">{img.face}</span>
                        )}
                      </div>
                      <div className="pr-1">
                        <span className={`block font-bold text-[11px] leading-tight ${isSelected ? 'text-[#0A2540]' : 'text-[#475569]'}`}>
                          {img.name || `${img.face} Face`}
                        </span>
                        <span className="text-[9px] text-[#64748B] uppercase">
                          {img.face}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="p-3 bg-white border-t border-[#CBD5E1] text-[11px] text-[#64748B] flex items-center justify-between font-mono">
            <span>
              Viewing: <strong className="text-[#0A2540]">{currentImage?.name || `${activeFace.toUpperCase()} Face`}</strong>
              {packageImages.length > 0 && ` (${activeImageIndex + 1} of ${packageImages.length})`}
            </span>
            <span>Click any box to inspect legal determination</span>
          </div>
        </div>

        {/* RIGHT 50%: Rule Evidence & Determination Details */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
            <div className="flex items-start justify-between gap-4 border-b border-[#E2E8F0] pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-[#0A2540] text-white px-2 py-0.5">
                    {selectedRule.rule_code}
                  </span>
                  <span className="text-xs font-mono text-[#64748B]">
                    Section {selectedRule.rule_number}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0A2540] mt-1 font-sans">{selectedRule.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={selectedRule.severity} />
                <StatusBadge status={selectedRule.status} />
              </div>
            </div>

            {/* Explanation readout */}
            <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#64748B] block font-bold">
                Rule Engine Determination Message
              </span>
              <p className="text-xs text-[#0F172A] font-medium leading-relaxed font-sans">
                {selectedRule.message}
              </p>
            </div>

            {/* Comparison Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1]">
                <span className="text-[10px] text-[#64748B] uppercase block mb-1 font-bold">
                  Extracted Raw OCR:
                </span>
                <span className="font-bold text-[#0F172A] break-all">
                  {selectedRule.extracted_value || 'None (Declaration Missing)'}
                </span>
              </div>
              <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1]">
                <span className="text-[10px] text-[#64748B] uppercase block mb-1 font-bold">
                  Legal Requirement:
                </span>
                <span className="font-bold text-[#0A2540]">
                  {selectedRule.expected_value || 'Present on primary display panel'}
                </span>
              </div>
            </div>

            {/* Evidence Metadata */}
            <div className="border border-[#CBD5E1] divide-y divide-[#E2E8F0] text-xs font-mono">
              <div className="p-2.5 flex justify-between bg-[#F8FAFC]">
                <span className="text-[#64748B]">Target Field:</span>
                <span className="font-bold text-[#0F172A]">{selectedRule.field}</span>
              </div>
              <div className="p-2.5 flex justify-between bg-white">
                <span className="text-[#64748B]">OCR Confidence:</span>
                <ConfidenceBadge confidence={selectedRule.confidence} />
              </div>
              <div className="p-2.5 flex justify-between bg-[#F8FAFC]">
                <span className="text-[#64748B]">Gazette Reference:</span>
                <span className="text-[#0F172A] text-right max-w-xs">{selectedRule.source_reference}</span>
              </div>
            </div>
          </div>

          {/* Rule Selector List */}
          <div className="bg-white border border-[#CBD5E1] flex-1 flex flex-col shadow-xs">
            <div className="p-3 border-b border-[#CBD5E1] bg-[#F8FAFC] text-xs font-mono font-bold text-[#0A2540] uppercase tracking-wider">
              Evaluated Rules Index ({evaluatedRules.length})
            </div>
            <div className="divide-y divide-[#E2E8F0] max-h-56 overflow-y-auto font-mono text-xs">
              {evaluatedRules.map((rule) => {
                const isSelected = selectedRule.rule_code === rule.rule_code;
                return (
                  <div
                    key={rule.rule_code}
                    onClick={() => {
                      setSelectedRule(rule);
                      const box = boundingBoxes[rule.field];
                      if (box?.face) {
                        const targetFace = box.face.toLowerCase();
                        setActiveFace(targetFace);
                        const matchIdx = packageImages.findIndex(
                          (img) => img.face.toLowerCase() === targetFace
                        );
                        if (matchIdx !== -1) {
                          setActiveImageIndex(matchIdx);
                        }
                      }
                    }}
                    className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#EFF6FF] border-l-4 border-l-[#0A2540]'
                        : 'hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0A2540]">{rule.rule_code}</span>
                      <span className="text-[#475569] line-clamp-1 font-sans">{rule.title}</span>
                    </div>
                    <StatusBadge status={rule.status} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import type { BoundingBox } from '@/lib/extraction/types';
import type { RuleEvaluationDetail } from '@/lib/types';

export interface PackageFaceItem {
  face: string;
  imagePath: string;
  name?: string;
}

export interface PackageOverlayViewerProps {
  imagePath?: string;
  packageFaces?: PackageFaceItem[];
  activeFace?: string;
  onFaceChange?: (face: string, index: number) => void;
  boundingBoxes?: Record<string, BoundingBox>;
  rules?: RuleEvaluationDetail[];
  selectedField?: string | null;
  onSelectField?: (fieldName: string, ruleCode?: string) => void;
  productName?: string;
  category?: string;
  compact?: boolean;
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

export function PackageOverlayViewer({
  imagePath,
  packageFaces = [],
  activeFace: externalActiveFace,
  onFaceChange,
  boundingBoxes = {},
  rules = [],
  selectedField,
  onSelectField,
  productName = 'Packaged Commodity',
  category = 'FOOD',
  compact = false,
}: PackageOverlayViewerProps) {
  const [internalActiveIndex, setInternalActiveIndex] = useState(0);
  const [hoveredField, setHoveredField] = useState<string | null>(null);

  // Normalize faces list
  const facesList: PackageFaceItem[] =
    packageFaces.length > 0
      ? packageFaces
      : imagePath
      ? [{ face: 'FRONT', imagePath, name: 'Front Face' }]
      : [];

  const currentFaceItem = facesList[internalActiveIndex] || facesList[0];
  const activeFace = (
    externalActiveFace ||
    currentFaceItem?.face ||
    'FRONT'
  ).toLowerCase();
  const displayImage = currentFaceItem?.imagePath || imagePath;

  const handleFaceSelect = (idx: number, face: string) => {
    setInternalActiveIndex(idx);
    if (onFaceChange) {
      onFaceChange(face.toLowerCase(), idx);
    }
  };

  const getRuleForField = (fieldKey: string): RuleEvaluationDetail | undefined => {
    return rules.find(
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

  const isMultiFace = facesList.length > 1;

  return (
    <div className="bg-white border border-[#CBD5E1] shadow-xs flex flex-col">
      {/* 1. TOP HEADER & DECLARATION STATUS CHIPS BAR (Matching user reference photo) */}
      <div className="p-3 border-b border-[#CBD5E1] bg-[#F8FAFC] space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-[#0A2540]"></span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A2540]">
              Visual Package Evidence Canvas
            </span>
            <span className="text-[10px] font-mono text-[#64748B] hidden sm:inline">
              (Statutory Bounding-Box Overlay)
            </span>
          </div>

          {/* Face selection tabs if multi-image */}
          {isMultiFace && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {facesList.map((f, idx) => {
                const isCurrent = idx === internalActiveIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFaceSelect(idx, f.face)}
                    className={`px-2.5 py-1 text-[11px] font-mono font-medium cursor-pointer border transition-all flex items-center gap-1.5 ${
                      isCurrent
                        ? 'bg-[#0A2540] text-white border-[#0A2540] shadow-xs'
                        : 'bg-white text-[#64748B] border-[#CBD5E1] hover:text-[#0A2540] hover:border-[#0A2540]'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isCurrent ? 'bg-[#EA580C]' : 'bg-slate-300'
                      }`}
                    />
                    <span>{f.name || `${f.face} Face`}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Top declaration status chips: mrp ✗  quantity ✓  description ✓ ... */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
          <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase shrink-0">
            Detected Declarations:
          </span>
          {STATUTORY_FIELD_CONFIG.map(({ key, label }) => {
            const rule = getRuleForField(key);
            const isSelected = selectedField === key;
            const status = rule?.status;

            let badgeStyle =
              'bg-white text-[#475569] border-[#CBD5E1] hover:border-[#94A3B8]';
            let icon = '—';
            let iconColor = 'text-slate-400';

            if (status === 'PASS') {
              badgeStyle = isSelected
                ? 'bg-[#15803D] text-white border-[#15803D]'
                : 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0] hover:bg-[#DCFCE7]';
              icon = '✓';
              iconColor = isSelected ? 'text-white' : 'text-[#15803D]';
            } else if (status === 'FAIL') {
              badgeStyle = isSelected
                ? 'bg-[#B91C1C] text-white border-[#B91C1C]'
                : 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA] hover:bg-[#FEE2E2]';
              icon = '✕';
              iconColor = isSelected ? 'text-white' : 'text-[#B91C1C]';
            } else if (status === 'REVIEW') {
              badgeStyle = isSelected
                ? 'bg-[#D97706] text-white border-[#D97706]'
                : 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A] hover:bg-[#FEF3C7]';
              icon = '⚠';
              iconColor = isSelected ? 'text-white' : 'text-[#B45309]';
            }

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectField?.(key, rule?.rule_code)}
                className={`px-2 py-0.5 text-[11px] font-mono font-medium border flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors shadow-2xs ${badgeStyle}`}
                title={rule ? `${rule.rule_code}: ${rule.extracted_value || 'Missing'}` : label}
              >
                <span>{key.replace('_', ' ')}</span>
                <span className={`font-bold ${iconColor}`}>{icon}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. IMAGE CANVAS WITH DIRECT BOUNDING BOX OVERLAYS */}
      <div
        className={`p-4 bg-[#F1F5F9] flex items-center justify-center relative overflow-hidden ${
          compact ? 'min-h-[360px]' : 'min-h-[480px] lg:min-h-[580px]'
        }`}
      >
        <div className="w-full max-w-lg aspect-3/4 bg-white border-2 border-[#CBD5E1] relative shadow-md overflow-hidden select-none">
          {/* Packaging Image */}
          {displayImage ? (
            <img
              src={displayImage}
              alt={productName || 'Uploaded packaging evidence'}
              className="w-full h-full object-contain absolute inset-0 bg-slate-100"
            />
          ) : (
            <div className="absolute inset-0 p-6 flex flex-col justify-between bg-[#F8FAFC]">
              <div className="border-b border-dashed border-[#CBD5E1] pb-3">
                <span className="text-[10px] font-mono text-[#64748B] tracking-widest block uppercase">
                  {category} &bull; {activeFace.toUpperCase()} PANEL
                </span>
                <span className="text-base font-bold tracking-tight text-[#0A2540] block font-sans">
                  {productName}
                </span>
              </div>
              <div className="pt-3 border-t border-dashed border-[#CBD5E1] flex justify-between text-[9px] font-mono text-[#64748B]">
                <span>FSSAI Lic Verified</span>
                <span>Standard SI Units</span>
              </div>
            </div>
          )}

          {/* Direct Bounding Box Overlays (Exact design from user photo) */}
          {STATUTORY_FIELD_CONFIG.map(({ key, defaultBox }) => {
            const rawBox = boundingBoxes[key];
            const rule = getRuleForField(key);

            // Determine if box should show on current active face
            if (rawBox?.face && isMultiFace && rawBox.face.toLowerCase() !== activeFace) {
              return null;
            }

            // Only show if box is defined or rule has extracted value or failure
            const hasData =
              rawBox && rawBox.width > 0 && rawBox.height > 0
                ? true
                : !!rule?.extracted_value || (rule?.status === 'FAIL' && key === 'mrp');

            if (!hasData) return null;

            const box =
              rawBox && rawBox.width > 0 && rawBox.height > 0
                ? rawBox
                : defaultBox;

            const isSelected = selectedField === key;
            const isHovered = hoveredField === key;
            const isFail = rule?.status === 'FAIL';
            const isReview = rule?.status === 'REVIEW';

            let boxStyle =
              'border-[#10B981] bg-[#10B981]/20 text-emerald-950 hover:bg-[#10B981]/30';
            let icon = '✓';

            if (isFail) {
              boxStyle =
                'border-[#EF4444] bg-[#EF4444]/25 text-rose-950 hover:bg-[#EF4444]/35';
              icon = '✕';
            } else if (isReview) {
              boxStyle =
                'border-[#F59E0B] bg-[#F59E0B]/25 text-amber-950 hover:bg-[#F59E0B]/35';
              icon = '⚠';
            }

            return (
              <div
                key={key}
                onClick={() => onSelectField?.(key, rule?.rule_code)}
                onMouseEnter={() => setHoveredField(key)}
                onMouseLeave={() => setHoveredField(null)}
                style={{
                  top: `${box.top}%`,
                  left: `${box.left}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                }}
                className={`absolute cursor-pointer border-2 transition-all flex items-center justify-between px-2 py-0.5 rounded-xs ${boxStyle} ${
                  isSelected
                    ? 'ring-2 ring-[#0A2540] ring-offset-2 ring-offset-white z-30 shadow-xl scale-[1.01]'
                    : isHovered
                    ? 'z-20 shadow-md'
                    : 'z-10'
                }`}
              >
                {/* Monospace tag name with subtle background for high contrast */}
                <span className="text-[11px] font-mono font-bold bg-white/90 text-[#0A2540] px-1.5 py-0.5 rounded-xs shadow-2xs border border-[#CBD5E1]/70 truncate max-w-[85%]">
                  {key}
                </span>

                {/* Status indicator on right */}
                <span className="text-xs font-mono font-black shrink-0 ml-1 bg-white/90 px-1 py-0.2 rounded-xs shadow-2xs">
                  {icon}
                </span>

                {/* Tooltip on hover */}
                {isHovered && rule && (
                  <div className="absolute left-0 bottom-full mb-1 z-40 bg-[#0A2540] text-white text-[10px] font-mono p-2 rounded shadow-lg pointer-events-none min-w-[200px] max-w-[280px]">
                    <div className="font-bold text-[#F97316] mb-0.5">
                      {rule.rule_code}: {rule.title}
                    </div>
                    <div className="truncate text-slate-200">
                      Value: {rule.extracted_value || 'None detected'}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-1">
                      Status: {rule.status}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOTTOM INFO & THUMBNAIL STRIP IF MULTI-IMAGE */}
      {isMultiFace && (
        <div className="p-3 bg-[#F8FAFC] border-t border-[#CBD5E1] flex items-center justify-between gap-3 overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase shrink-0">
              Switch Package View:
            </span>
            <div className="flex items-center gap-2">
              {facesList.map((f, idx) => {
                const isCurrent = idx === internalActiveIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleFaceSelect(idx, f.face)}
                    className={`flex items-center gap-2 px-2 py-1 border text-xs font-mono cursor-pointer transition-all ${
                      isCurrent
                        ? 'border-[#0A2540] bg-white shadow-xs font-bold text-[#0A2540]'
                        : 'border-[#CBD5E1] bg-slate-50 text-[#64748B] hover:bg-white'
                    }`}
                  >
                    {f.imagePath ? (
                      <img
                        src={f.imagePath}
                        alt={f.face}
                        className="w-6 h-6 object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-slate-200 flex items-center justify-center text-[9px]">
                        {f.face[0]}
                      </div>
                    )}
                    <span>{f.name || `${f.face} Face`}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <span className="text-[10px] font-mono text-[#64748B]">
            Showing {activeFace.toUpperCase()} declarations
          </span>
        </div>
      )}
    </div>
  );
}

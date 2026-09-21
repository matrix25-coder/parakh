'use client';

import React from 'react';
import type { UspEvaluationResult } from '@/lib/rule-engine/usp-calculator';

export interface UspAuditCardProps {
  uspResult?: UspEvaluationResult | null;
  netQuantityRaw?: string | null;
  mrpRaw?: string | null;
}

export function UspAuditCard({ uspResult, netQuantityRaw, mrpRaw }: UspAuditCardProps) {
  if (!uspResult) {
    return (
      <div className="border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-700 uppercase tracking-wider">
              Rule 6(11) Unit Sale Price (USP)
            </span>
          </div>
          <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-xs">
            NOT EVALUATED
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2 font-mono">
          Unit Sale Price evaluation requires both Net Quantity and MRP declarations.
        </p>
      </div>
    );
  }

  const isCompliant = uspResult.isOverallCompliant;

  return (
    <div className={`border p-4 shadow-xs transition-colors ${
      isCompliant
        ? 'border-emerald-200 bg-emerald-50/40'
        : 'border-rose-200 bg-rose-50/40'
    }`}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isCompliant ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="font-mono text-xs font-bold text-[#0A2540] uppercase tracking-wider">
            Rule 6(11) Unit Sale Price (USP) Audit
          </span>
        </div>
        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 border ${
          isCompliant
            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
            : 'bg-rose-100 border-rose-300 text-rose-800'
        }`}>
          {isCompliant ? 'STATUTORY COMPLIANT' : 'STATUTORY DEFECT'}
        </span>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 font-mono text-xs">
        <div className="bg-white/80 p-2.5 border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase">Declared Net Qty</div>
          <div className="font-bold text-slate-900 mt-0.5">{netQuantityRaw || 'Declared'}</div>
        </div>

        <div className="bg-white/80 p-2.5 border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase">Declared MRP</div>
          <div className="font-bold text-slate-900 mt-0.5">{mrpRaw || 'Declared'}</div>
        </div>

        <div className="bg-white/80 p-2.5 border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase">Statutory Base Unit</div>
          <div className="font-bold text-[#0A2540] mt-0.5">per {uspResult.statutoryBaseUnit}</div>
        </div>

        <div className="bg-white/80 p-2.5 border border-slate-200">
          <div className="text-[10px] text-slate-500 uppercase">Statutory Computed USP</div>
          <div className="font-bold text-emerald-700 mt-0.5">{uspResult.calculatedUspDisplay || 'N/A'}</div>
        </div>
      </div>

      {/* Comparison Details */}
      <div className="pt-2 text-xs font-mono">
        <div className="flex items-center justify-between text-slate-700">
          <span>Printed On-Pack USP:</span>
          <span className="font-bold">
            {uspResult.printedUspDetected
              ? (uspResult.printedUspValue ? `₹ ${uspResult.printedUspValue} per ${uspResult.printedUspUnit || uspResult.statutoryBaseUnit}` : 'Detected on Label')
              : 'ABSENT FROM PACKAGING (Non-compliant)'}
          </span>
        </div>

        {uspResult.deviationPercentage !== null && (
          <div className="flex items-center justify-between text-rose-700 mt-1">
            <span>Shrinkflation / Arithmetic Deviation:</span>
            <span className="font-bold">{uspResult.deviationPercentage}% divergence</span>
          </div>
        )}

        {uspResult.violationMessage && (
          <div className="mt-2.5 p-2 bg-rose-100/70 border border-rose-200 text-rose-900 text-[11px] rounded-xs">
            <strong>Legal Infringement:</strong> {uspResult.violationMessage}
          </div>
        )}
      </div>
    </div>
  );
}

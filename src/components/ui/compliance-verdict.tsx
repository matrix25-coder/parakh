import React from 'react';
import type { ComplianceStatus, EvaluationSummary } from '@/lib/types';

interface ComplianceVerdictProps {
  status: ComplianceStatus;
  summary: EvaluationSummary;
  productName?: string;
  category?: string;
}

export default function ComplianceVerdict({
  status,
  summary,
  productName,
  category,
}: ComplianceVerdictProps) {
  const isPass = status === 'COMPLIANT';
  const isFail = status === 'NON_COMPLIANT';
  const isReview = status === 'NEEDS_REVIEW';

  const borderColor = isPass
    ? 'border-[#15803D]'
    : isFail
    ? 'border-[#B91C1C]'
    : 'border-[#B45309]';

  const bgStatus = isPass
    ? 'bg-[#F0FDF4]'
    : isFail
    ? 'bg-[#FEF2F2]'
    : 'bg-[#FFFBEB]';

  const textColor = isPass
    ? 'text-[#15803D]'
    : isFail
    ? 'text-[#B91C1C]'
    : 'text-[#B45309]';

  return (
    <div className={`border-2 ${borderColor} bg-white shadow-xs p-6 space-y-4`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E2E8F0] pb-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#64748B] block font-semibold">
            STATUTORY COMPLIANCE DETERMINATION
          </span>
          <div className="flex items-center gap-3 mt-1">
            <h2 className={`text-2xl md:text-3xl font-bold tracking-tight font-sans ${textColor}`}>
              {status.replace(/_/g, ' ')}
            </h2>
            <span className={`px-2.5 py-0.5 text-xs font-mono font-bold uppercase border ${bgStatus} ${textColor} ${borderColor}`}>
              {isPass ? 'COMPLIANT WITH PCR RULES' : isFail ? 'VIOLATIONS DETECTED' : 'REQUIRES VERIFICATION'}
            </span>
          </div>
          {productName && (
            <p className="text-xs text-[#475569] font-medium mt-1">
              {productName} &bull; <span className="font-mono text-[#0F172A] font-semibold">{category}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right font-mono">
            <span className="text-[10px] uppercase text-[#64748B] block font-semibold">Rule Compliance Rate</span>
            <span className="text-2xl font-bold text-[#0F172A]">
              {summary.compliance_percentage}%
            </span>
          </div>
        </div>
      </div>

      {/* 4-Box Metric Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
        <div className="p-3 bg-[#F8FAFC] border border-[#E2E8F0]">
          <span className="text-[10px] text-[#64748B] uppercase block">Total Evaluated</span>
          <span className="text-xl font-bold text-[#0F172A] mt-0.5 block">{summary.total_rules}</span>
        </div>
        <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0]">
          <span className="text-[10px] text-[#15803D] uppercase block font-semibold">Rules Passed</span>
          <span className="text-xl font-bold text-[#15803D] mt-0.5 block">{summary.passed}</span>
        </div>
        <div className="p-3 bg-[#FEF2F2] border border-[#FECACA]">
          <span className="text-[10px] text-[#B91C1C] uppercase block font-semibold">Rules Failed</span>
          <span className="text-xl font-bold text-[#B91C1C] mt-0.5 block">{summary.failed}</span>
        </div>
        <div className="p-3 bg-[#FFFBEB] border border-[#FDE68A]">
          <span className="text-[10px] text-[#B45309] uppercase block font-semibold">Needs Review</span>
          <span className="text-xl font-bold text-[#B45309] mt-0.5 block">{summary.review}</span>
        </div>
      </div>
    </div>
  );
}

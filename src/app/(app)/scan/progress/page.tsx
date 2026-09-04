'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui';

interface Stage {
  id: string;
  phase: 'EXTRACTION' | 'RULE_ENGINE';
  number: string;
  name: string;
  detail: string;
}

const STAGES: Stage[] = [
  { id: '1', phase: 'EXTRACTION', number: '01', name: 'IMAGE PREPROCESSING', detail: 'Contrast enhancement, perspective de-skewing & noise filtration' },
  { id: '2', phase: 'EXTRACTION', number: '02', name: 'OCR / TEXT EXTRACTION', detail: 'Character segmentation and bounding box coordinate detection' },
  { id: '3', phase: 'EXTRACTION', number: '03', name: 'DECLARATION DETECTION', detail: 'Statutory keyword recognition (MRP, Net Qty, Mfg Date, Customer Care)' },
  { id: '4', phase: 'EXTRACTION', number: '04', name: 'STRUCTURED DATA EXTRACTION', detail: 'Normalizing strings, units (g, kg, ml, l), and numeric quantities' },
  { id: '5', phase: 'EXTRACTION', number: '05', name: 'CONFIDENCE ANALYSIS', detail: 'Evaluating OCR quality against 0.90 trusted threshold' },
  { id: '6', phase: 'EXTRACTION', number: '06', name: 'FONT & READABILITY ANALYSIS', detail: 'Measuring numeral millimeter heights against Rule 9 Table I specifications' },
  { id: '7', phase: 'RULE_ENGINE', number: '07', name: 'RULE ENGINE EVALUATION', detail: 'Dispatching structured data to deterministic PCR-001 through PCR-010 rules' },
  { id: '8', phase: 'RULE_ENGINE', number: '08', name: 'COMPLIANCE DETERMINATION', detail: 'Computing PASS/FAIL/REVIEW verdict and generating evidentiary links' },
];

export default function ScanningProgressPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STAGES.length) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 850);

    return () => clearInterval(interval);
  }, []);

  const isAllDone = currentStep >= STAGES.length;

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <PageHeader
        title="Processing Package Declarations"
        description="Statutory inspection execution pipeline cleanly separating OCR data extraction from deterministic Rule Engine evaluation."
      />

      <div className="bg-white border border-[#CBD5E1] p-6 space-y-6 shadow-xs">
        {/* Clean Separation: Phase A (Extraction) vs Phase B (Rule Engine) */}
        
        {/* EXTRACTION STAGES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 font-mono">
            <span className="text-xs font-bold text-[#0A2540] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-[#0A2540]"></span>
              PHASE A: OPTICAL DATA EXTRACTION (01 - 06)
            </span>
            <span className="text-[11px] font-mono text-[#64748B]">Optical Extraction & Table I Area Measurement</span>
          </div>

          <div className="space-y-2">
            {STAGES.filter((s) => s.phase === 'EXTRACTION').map((stage, idx) => {
              const isCompleted = currentStep > idx;
              const isCurrent = currentStep === idx;

              return (
                <div
                  key={stage.id}
                  className={`p-3 border transition-colors flex items-start justify-between gap-4 font-mono text-xs ${
                    isCompleted
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#0F172A]'
                      : isCurrent
                      ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#0F172A]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[#64748B]">{stage.number}</span>
                    <div>
                      <span className="font-bold block text-[#0A2540]">{stage.name}</span>
                      <span className="text-[11px] text-[#475569] font-sans block">{stage.detail}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-[#15803D] font-bold">✓ COMPLETED</span>
                    ) : isCurrent ? (
                      <span className="text-[#0A2540] font-bold animate-pulse">● EXECUTING</span>
                    ) : (
                      <span className="text-[#94A3B8]">○ QUEUED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transitional Divider */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono text-[#64748B] py-1">
          <span>&darr; Dispatched Extracted Data to Statutory Rule Engine &darr;</span>
        </div>

        {/* RULE ENGINE STAGES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 font-mono">
            <span className="text-xs font-bold text-[#0A2540] uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 bg-[#EA580C]"></span>
              PHASE B: DETERMINISTIC RULE ENGINE (07 - 08)
            </span>
            <span className="text-[11px] text-[#EA580C] font-bold font-mono">GSR 202(E) Legal Source of Truth</span>
          </div>

          <div className="space-y-2">
            {STAGES.filter((s) => s.phase === 'RULE_ENGINE').map((stage, idx) => {
              const actualIdx = 6 + idx;
              const isCompleted = currentStep > actualIdx;
              const isCurrent = currentStep === actualIdx;

              return (
                <div
                  key={stage.id}
                  className={`p-3 border transition-colors flex items-start justify-between gap-4 font-mono text-xs ${
                    isCompleted
                      ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#0F172A]'
                      : isCurrent
                      ? 'bg-[#EFF6FF] border-[#93C5FD] text-[#0F172A]'
                      : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] opacity-75'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-bold text-[#64748B]">{stage.number}</span>
                    <div>
                      <span className="font-bold block text-[#0A2540]">{stage.name}</span>
                      <span className="text-[11px] text-[#475569] font-sans block">{stage.detail}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {isCompleted ? (
                      <span className="text-[#15803D] font-bold">✓ COMPLETED</span>
                    ) : isCurrent ? (
                      <span className="text-[#0A2540] font-bold animate-pulse">● EXECUTING</span>
                    ) : (
                      <span className="text-[#94A3B8]">○ QUEUED</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Completion Actions */}
        <div className="pt-4 border-t border-[#E2E8F0] flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-xs font-mono text-[#64748B]">
            {isAllDone ? 'Extraction & Font Audit completed successfully.' : 'Statutory verification pipeline in progress...'}
          </span>
          <button
            onClick={() => router.push('/scan/1/review')}
            disabled={!isAllDone}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] cursor-pointer disabled:opacity-40"
          >
            Review Extracted Declarations &rarr;
          </button>
        </div>
      </div>
    </div>
  );
}

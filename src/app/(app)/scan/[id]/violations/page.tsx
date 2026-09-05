'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageHeader, SeverityBadge } from '@/components/ui';
import { DEMO_REPORT } from '@/lib/demo/fixtures';
import type { ViolationDetail } from '@/lib/types';

export default function ViolationsPage() {
  const params = useParams();
  const id = (params?.id as string) || '1';

  const [isLoading, setIsLoading] = useState(true);
  const [violations, setViolations] = useState<ViolationDetail[]>([]);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/scan/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error('Scan not found');
        return res.json();
      })
      .then((data) => {
        if (data.complianceResult?.violations) {
          setViolations(data.complianceResult.violations);
        } else {
          setViolations([]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch scan violations:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto py-8">
        <div className="border border-[#CBD5E1] bg-white p-8 text-center space-y-4 shadow-xs">
          <div className="inline-block w-8 h-8 border-3 border-[#0A2540] border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#0A2540] font-mono">
              CHECKING STATUTORY INFRACTIONS
            </h2>
            <p className="text-xs text-[#64748B] font-mono">
              Retrieving non-compliant declarations for notice drafting...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-2">
      <PageHeader
        title={`Statutory Violations (${violations.length})`}
        description="Non-compliant declarations detected by the Legal Metrology Rule Engine requiring immediate enforcement notice under Section 36."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href={`/scan/${id}/results`}
              className="px-3 py-2 text-xs font-mono text-[#475569] hover:text-[#0A2540] border border-[#CBD5E1] bg-white transition-colors"
            >
              &larr; Compliance Results
            </Link>
            <Link
              href={`/scan/${id}/evidence`}
              className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] shadow-xs"
            >
              Inspect Evidence Canvas &rarr;
            </Link>
          </div>
        }
      />

      {/* Philosophy Banner */}
      <div className="p-3.5 bg-[#FEF2F2] border-l-4 border-l-[#B91C1C] border border-[#FECACA] font-mono text-xs text-[#B91C1C] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <span className="font-bold uppercase">
          STATUTORY COMPLIANCE INFRACTION NOTICE:
        </span>
        <span className="text-[#991B1B] text-[11px]">
          Rule Engine determined FAIL based on extracted declarations (deterministic legal verdict).
        </span>
      </div>

      {violations.length === 0 ? (
        <div className="p-12 text-center bg-white border border-[#CBD5E1] space-y-3 shadow-xs">
          <div className="text-3xl text-[#15803D] font-bold">✓</div>
          <h3 className="text-base font-bold text-[#0A2540] font-sans">No Statutory Violations Detected</h3>
          <p className="text-xs text-[#475569] max-w-sm mx-auto font-mono">
            All mandatory declarations satisfy the Legal Metrology (Packaged Commodities) Rules, 2011.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {violations.map((v) => (
            <div
              key={v.rule_code}
              className="bg-white border-2 border-[#B91C1C] p-6 space-y-4 shadow-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2E8F0] pb-3">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-[#B91C1C] text-white font-mono font-bold text-xs uppercase">
                    VIOLATION
                  </span>
                  <span className="font-mono text-xs font-bold text-[#0A2540]">
                    Rule: {v.rule_code} (Section {v.rule_number})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={v.severity} />
                  <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA]">
                    FAIL
                  </span>
                </div>
              </div>

              {/* Data comparison block */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] space-y-1">
                  <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                    Detected Declaration Data:
                  </span>
                  <span className="font-bold text-[#B91C1C] block text-sm">
                    {v.field} = &quot;Not detected on packaging or non-compliant&quot;
                  </span>
                </div>

                <div className="p-3 bg-[#F8FAFC] border border-[#CBD5E1] space-y-1">
                  <span className="text-[10px] text-[#64748B] uppercase block font-bold">
                    Statutory Legal Standard Expected:
                  </span>
                  <span className="font-bold text-[#0A2540] block text-sm">
                    Mandatory statutory declaration under Legal Metrology Rules, 2011
                  </span>
                </div>
              </div>

              {/* Legal explanation */}
              <div className="p-3 bg-[#FEF2F2] border border-[#FECACA] font-sans text-xs text-[#0F172A] leading-relaxed">
                <strong className="text-[#B91C1C] block font-mono text-[11px] mb-1 uppercase">
                  Statutory Determination Reason:
                </strong>
                {v.violation_message} This constitutes an actionable infraction under Section 36 of the Legal Metrology Act, 2009.
              </div>

              {/* Evidentiary Action */}
              <div className="pt-2 flex items-center justify-between font-mono text-xs border-t border-[#E2E8F0]">
                <span className="text-[#64748B]">
                  Evidence: Physical package inspection photographs
                </span>
                <Link
                  href={`/scan/${id}/evidence`}
                  className="px-4 py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-bold text-xs uppercase transition-colors border-t-2 border-t-[#EA580C] shadow-xs"
                >
                  Inspect on Package Image &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import type { FontReadabilityAudit } from '@/lib/types';
import StatusBadge from './status-badge';

interface FontAuditCardProps {
  audits: FontReadabilityAudit[];
}

export default function FontAuditCard({ audits }: FontAuditCardProps) {
  return (
    <div className="bg-white border border-[#CBD5E1] p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
        <div>
          <span className="text-[10px] font-mono uppercase text-[#64748B] tracking-wider block font-bold">
            STATUTORY FONT & READABILITY AUDIT &bull; RULE 9 & SCHEDULE II
          </span>
          <h3 className="text-sm font-bold text-[#0A2540] mt-0.5 font-sans">
            Minimum Numeral Height & Visual Readability Verification
          </h3>
        </div>
        <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#0A2540] bg-[#F1F5F9] border border-[#CBD5E1]">
          Table I Compliant
        </span>
      </div>

      <div className="border border-[#CBD5E1] overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-mono">
          <thead>
            <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#0A2540] uppercase text-[10px]">
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Declaration Target</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Detected Height</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Statutory Requirement</th>
              <th className="p-3 border-r border-[#CBD5E1] font-bold">Legal Standard Reference</th>
              <th className="p-3 text-right font-bold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-[11px] bg-white">
            {audits.map((item) => (
              <tr
                key={item.field}
                className={`hover:bg-[#F8FAFC] transition-colors ${
                  item.status === 'FAIL' ? 'bg-[#FEF2F2]' : 'bg-white'
                }`}
              >
                <td className="p-3 font-bold font-sans text-[#0F172A] border-r border-[#CBD5E1]">
                  {item.label}
                </td>
                <td className="p-3 font-bold text-[#0F172A] border-r border-[#CBD5E1]">
                  <span
                    className={
                      item.status === 'FAIL'
                        ? 'text-[#B91C1C]'
                        : item.status === 'PASS'
                        ? 'text-[#15803D]'
                        : 'text-[#B45309]'
                    }
                  >
                    {item.detected_height_mm !== null && item.detected_height_mm !== undefined
                      ? `${item.detected_height_mm.toFixed(1)} mm`
                      : 'Pending Gauge'}
                  </span>
                </td>
                <td className="p-3 text-[#64748B] border-r border-[#CBD5E1]">
                  Min &ge; {item.required_height_mm.toFixed(1)} mm
                </td>
                <td className="p-3 text-[#64748B] text-[10px] border-r border-[#CBD5E1] max-w-xs truncate">
                  {item.standard_rule}
                </td>
                <td className="p-3 text-right">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#64748B] font-mono">
        *Note: Under Rule 9(1) of the Legal Metrology (Packaged Commodities) Rules, 2011, numeral and letter heights are mandatory according to the net quantity declaration thresholds.*
      </p>
    </div>
  );
}

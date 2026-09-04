import React from 'react';

interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  statusColor?: string;
  icon?: React.ReactNode;
}

export default function MetricCard({
  label,
  value,
  subtext,
  statusColor = 'text-[#0F172A]',
  icon,
}: MetricCardProps) {
  return (
    <div className="p-5 bg-white border border-[#E2E8F0] shadow-xs flex flex-col justify-between space-y-2">
      <div className="flex items-center justify-between text-[#64748B]">
        <span className="text-[10px] font-mono uppercase tracking-wider font-semibold">
          {label}
        </span>
        {icon && <div className="text-[#64748B]">{icon}</div>}
      </div>
      <div>
        <span className={`text-3xl font-bold font-mono tracking-tight ${statusColor}`}>
          {value}
        </span>
        {subtext && (
          <span className="text-[11px] text-[#64748B] block mt-0.5">{subtext}</span>
        )}
      </div>
    </div>
  );
}

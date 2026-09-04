import React from 'react';
import type { Severity } from '@/lib/types';

interface SeverityBadgeProps {
  severity: Severity;
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  const styles: Record<Severity, string> = {
    HIGH: 'text-[#B91C1C] bg-[#FEF2F2] border-[#FECACA]',
    MEDIUM: 'text-[#B45309] bg-[#FFFBEB] border-[#FDE68A]',
    LOW: 'text-[#475569] bg-[#F1F5F9] border-[#CBD5E1]',
  };

  return (
    <span
      className={`inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase border rounded-none tracking-wider ${styles[severity]}`}
    >
      {severity}
    </span>
  );
}

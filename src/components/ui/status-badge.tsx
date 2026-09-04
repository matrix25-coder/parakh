import React from 'react';
import type { RuleStatus, ComplianceStatus } from '@/lib/types';

export type BadgeStatus = RuleStatus | ComplianceStatus;

interface StatusBadgeProps {
  status: BadgeStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const styles: Record<BadgeStatus, string> = {
    PASS: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    COMPLIANT: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    FAIL: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    NON_COMPLIANT: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    REVIEW: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    NEEDS_REVIEW: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    NOT_APPLICABLE: 'bg-[#F1F5F9] text-[#64748B] border-[#E2E8F0]',
  };

  const icons: Record<BadgeStatus, string> = {
    PASS: '✓',
    COMPLIANT: '✓',
    FAIL: '✕',
    NON_COMPLIANT: '✕',
    REVIEW: '⚠',
    NEEDS_REVIEW: '⚠',
    NOT_APPLICABLE: '—',
  };

  const currentStyle = styles[status] || styles.NOT_APPLICABLE;
  const currentIcon = icons[status] || '—';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-bold border rounded-none uppercase tracking-wider ${currentStyle}`}
    >
      <span>{currentIcon}</span>
      <span>{status.replace(/_/g, ' ')}</span>
    </span>
  );
}

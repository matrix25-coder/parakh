import React from 'react';

interface ConfidenceBadgeProps {
  confidence?: number;
  trustedThreshold?: number; // Default 0.90 per backend BaseValidator
}

export default function ConfidenceBadge({
  confidence,
  trustedThreshold = 0.9,
}: ConfidenceBadgeProps) {
  if (confidence == null) {
    return <span className="text-xs font-mono text-[#64748B]">—</span>;
  }

  const pct = Math.round(confidence * 100);
  const isTrusted = confidence >= trustedThreshold;
  const isBorderline = confidence >= 0.6 && confidence < trustedThreshold;

  let textColor = 'text-[#15803D]';
  let barColor = 'bg-[#15803D]';

  if (!isTrusted) {
    if (isBorderline) {
      textColor = 'text-[#B45309]';
      barColor = 'bg-[#D97706]';
    } else {
      textColor = 'text-[#B91C1C]';
      barColor = 'bg-[#B91C1C]';
    }
  }

  return (
    <div className="inline-flex items-center gap-2 font-mono">
      <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-none overflow-hidden relative">
        <div
          className={`h-full ${barColor}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${textColor}`}>{pct}%</span>
    </div>
  );
}

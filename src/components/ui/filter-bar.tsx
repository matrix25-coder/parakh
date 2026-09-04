'use client';

import React from 'react';

export interface FilterOption {
  key: string;
  label: string;
  options: { label: string; value: string }[];
}

interface FilterBarProps {
  filters: FilterOption[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onReset?: () => void;
}

export default function FilterBar({
  filters,
  values,
  onChange,
  onReset,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-[#CBD5E1] shadow-xs">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0A2540] pr-3 border-r border-[#CBD5E1] font-mono text-[10px]">
        <span>Filters</span>
      </div>

      {filters.map((filter) => (
        <div key={filter.key} className="flex items-center gap-1.5 text-xs">
          <label className="text-[#64748B] font-medium font-mono text-[11px]">{filter.label}:</label>
          <select
            value={values[filter.key] || 'ALL'}
            onChange={(e) => onChange(filter.key, e.target.value)}
            className="bg-[#F8FAFC] border border-[#CBD5E1] text-[#0F172A] px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-[#0A2540] cursor-pointer"
          >
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-[#0F172A]">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ))}

      {onReset && (
        <button
          onClick={onReset}
          className="ml-auto text-xs font-mono text-[#64748B] hover:text-[#0A2540] underline cursor-pointer"
        >
          Reset Filters
        </button>
      )}
    </div>
  );
}

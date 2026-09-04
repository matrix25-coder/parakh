'use client';

import React, { useState, useMemo } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  keyExtractor: (item: T) => string | number;
  emptyMessage?: string;
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  onRowClick,
  keyExtractor,
  emptyMessage = 'No inspection records found.',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA === valB) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const res = valA < valB ? -1 : 1;
      return sortDir === 'asc' ? res : -res;
    });
  }, [data, sortKey, sortDir]);

  return (
    <div className="w-full overflow-x-auto border border-[#CBD5E1] bg-white shadow-xs">
      <table className="w-full text-left text-xs border-collapse font-mono">
        <thead>
          <tr className="bg-[#F1F5F9] border-b border-[#CBD5E1] text-[#0A2540] uppercase tracking-wider font-bold text-[10px]">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable && handleSort(col.key)}
                className={`py-3 px-4 border-r border-[#CBD5E1] last:border-r-0 ${
                  col.sortable ? 'cursor-pointer hover:bg-[#E2E8F0] select-none text-[#0A2540]' : ''
                } ${col.className || ''}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span>{col.label}</span>
                  {col.sortable && (
                    <span className="text-[10px] text-[#64748B]">
                      {sortKey === col.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0] bg-white">
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-[#64748B] italic font-mono text-xs"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick && onRowClick(item)}
                className={`hover:bg-[#F8FAFC] transition-colors bg-white ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 border-r border-[#E2E8F0] last:border-r-0 align-top ${
                      col.className || 'text-[#0F172A]'
                    }`}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

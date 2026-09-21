'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader, StatusBadge, DataTable, FilterBar } from '@/components/ui';
import { getApiUrl } from '@/lib/api-config';
import type { ComplianceStatus } from '@/lib/types';

interface InspectionRecord {
  id: number | string;
  scan_id: string;
  product: string;
  category: string;
  date: string;
  status: ComplianceStatus;
  violations: number;
  inspector: string;
}

export default function InspectionsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({
    status: 'ALL',
    category: 'ALL',
  });

  // Load newly scanned products from DB and search history from localStorage
  useEffect(() => {
    fetch(getApiUrl('/api/history'))
      .then((res) => res.json())
      .then((data) => {
        if (data.scans && Array.isArray(data.scans)) {
          setRecords(data.scans);
        }
      })
      .catch((err) => console.warn('Could not fetch DB history:', err));

    if (typeof window !== 'undefined') {
      try {
        const storedSearches = localStorage.getItem('parakh_search_history');
        if (storedSearches) {
          setSearchHistory(JSON.parse(storedSearches));
        }
      } catch (err) {
        console.warn('Storage read note:', err);
      }
    }
  }, []);

  const commitSearchToHistory = (term: string) => {
    const trimmed = term.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (typeof window !== 'undefined') {
      try {
        setSearchHistory((prev) => {
          const updated = [trimmed, ...prev.filter((s) => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
          localStorage.setItem('parakh_search_history', JSON.stringify(updated));
          return updated;
        });
      } catch (err) {
        console.warn('Storage save note:', err);
      }
    }
  };

  const handleSearchSubmit = (term: string) => {
    setSearchTerm(term);
    commitSearchToHistory(term);
  };

  const handleClearHistory = () => {
    setSearchHistory([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('parakh_search_history');
      } catch (err) {
        console.warn('Storage clear note:', err);
      }
    }
  };

  // Auto-commit search term after typing stops (600ms debounce)
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 3) return;
    const timer = setTimeout(() => {
      commitSearchToHistory(searchTerm);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const filterOptions = [
    {
      key: 'status',
      label: 'Verdict',
      options: [
        { label: 'All Verdicts', value: 'ALL' },
        { label: 'Compliant', value: 'COMPLIANT' },
        { label: 'Non-Compliant', value: 'NON_COMPLIANT' },
        { label: 'Needs Review', value: 'NEEDS_REVIEW' },
      ],
    },
    {
      key: 'category',
      label: 'Category',
      options: [
        { label: 'All Categories', value: 'ALL' },
        { label: 'Food', value: 'FOOD' },
        { label: 'Cosmetics', value: 'COSMETICS' },
        { label: 'Electronics', value: 'ELECTRONICS' },
        { label: 'General', value: 'GENERAL' },
      ],
    },
  ];

  const filtered = records.filter((r) => {
    const matchesSearch =
      r.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.scan_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.inspector.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filters.status === 'ALL' || r.status === filters.status;
    const matchesCat = filters.category === 'ALL' || r.category === filters.category;

    return matchesSearch && matchesStatus && matchesCat;
  });

  const columns = [
    {
      key: 'scan_id',
      label: 'Scan ID',
      sortable: true,
      className: 'font-mono font-bold text-[#0A2540]',
    },
    {
      key: 'product',
      label: 'Commodity Name',
      sortable: true,
      render: (item: InspectionRecord) => (
        <div>
          <span className="font-bold text-[#0F172A] block font-sans">{item.product}</span>
          <span className="text-[10px] font-mono text-[#64748B] uppercase">{item.category}</span>
        </div>
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      className: 'font-mono text-[#475569]',
    },
    {
      key: 'status',
      label: 'Compliance Verdict',
      sortable: true,
      render: (item: InspectionRecord) => <StatusBadge status={item.status} />,
    },
    {
      key: 'violations',
      label: 'Infractions',
      sortable: true,
      render: (item: InspectionRecord) => (
        <span className={`font-mono font-bold ${item.violations > 0 ? 'text-[#B91C1C]' : 'text-[#64748B]'}`}>
          {item.violations}
        </span>
      ),
    },
    {
      key: 'inspector',
      label: 'Enforcement Officer',
      className: 'text-[#475569]',
    },
    {
      key: 'actions',
      label: 'Audit Actions',
      render: (item: InspectionRecord) => (
        <div className="flex items-center gap-2 font-mono">
          <Link
            href={`/scan/${item.id}/results`}
            className="px-2.5 py-1 text-xs font-bold text-[#0A2540] hover:bg-[#F1F5F9] border border-[#CBD5E1] transition-colors"
          >
            Review &rarr;
          </Link>
          <Link
            href={`/scan/${item.id}/report`}
            className="px-2.5 py-1 text-xs text-[#475569] hover:text-[#0A2540] border border-[#CBD5E1] bg-white transition-colors"
          >
            Certificate
          </Link>
        </div>
      ),
    },
  ];

  const handlePurgeDummy = async () => {
    if (!confirm('Purge all dummy/mock demonstration scans from the database? Authentic inspections will be preserved.')) return;
    try {
      const res = await fetch(getApiUrl('/api/scan/purge-dummy'), { method: 'POST' });
      const data = await res.json();
      alert(`Cleaned up ${data.deletedCount || 0} dummy scans.`);
      window.location.reload();
    } catch (err) {
      alert('Failed to purge dummy scans.');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full px-2 sm:px-4 py-2">
      <PageHeader
        title="Inspection History Repository"
        description="Statutory record archive of past packaged commodity compliance audits conducted under the Legal Metrology Act, 2009."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePurgeDummy}
              className="px-3 py-2 text-xs font-mono font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors border border-rose-200 flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Purge dummy demonstration test scans"
            >
              <span>🗑️</span>
              <span>Purge Dummy Scans</span>
            </button>
            <Link
              href="/scan"
              className="px-4 py-2 text-xs font-mono font-bold text-white bg-[#0A2540] hover:bg-[#1E3A8A] transition-colors border-t-2 border-t-[#EA580C] flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <span>+ New Inspection</span>
            </Link>
          </div>
        }
      />

      {/* Search & Filter Controls */}
      <div className="space-y-3">
        {/* Search Bar */}
        <div className="flex items-center gap-3 p-3 bg-white border border-[#CBD5E1] shadow-xs">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#64748B]">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Search by commodity name (e.g. Vita Marie Gold, Biscuits, Kurkure), scan ID, or officer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onBlur={() => {
              if (searchTerm.trim()) commitSearchToHistory(searchTerm);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit(searchTerm);
            }}
            className="flex-1 text-xs font-mono bg-transparent focus:outline-none text-[#0F172A] placeholder-[#94A3B8]"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs font-mono text-[#64748B] hover:text-[#0F172A] cursor-pointer px-2 py-1 hover:bg-[#F1F5F9]"
              title="Clear input"
            >
              Clear
            </button>
          )}
          <button
            onClick={() => handleSearchSubmit(searchTerm)}
            className="px-4 py-1.5 bg-[#0A2540] hover:bg-[#1E3A8A] text-white text-xs font-mono font-bold transition-colors cursor-pointer border-t border-t-[#EA580C] shadow-xs"
          >
            Search
          </button>
        </div>

        {/* Search History Chips */}
        {searchHistory.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono bg-white p-3 border border-[#CBD5E1] shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-[#64748B] uppercase font-bold flex items-center gap-1">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#0A2540]">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                Search History:
              </span>
              {searchHistory.map((query) => (
                <button
                  key={query}
                  onClick={() => handleSearchSubmit(query)}
                  className={`px-2.5 py-0.5 text-[11px] border transition-colors cursor-pointer ${
                    searchTerm.toLowerCase() === query.toLowerCase()
                      ? 'bg-[#0A2540] text-white border-[#0A2540] font-bold shadow-xs'
                      : 'bg-[#F8FAFC] text-[#475569] border-[#CBD5E1] hover:border-[#0A2540] hover:text-[#0A2540]'
                  }`}
                >
                  {query}
                </button>
              ))}
            </div>
            <button
              onClick={handleClearHistory}
              className="text-[10px] text-[#64748B] hover:text-[#B91C1C] font-mono cursor-pointer transition-colors"
              title="Clear all saved search history"
            >
              Clear History &times;
            </button>
          </div>
        )}

        <FilterBar
          filters={filterOptions}
          values={filters}
          onChange={(k, v) => setFilters((prev) => ({ ...prev, [k]: v }))}
          onReset={() => setFilters({ status: 'ALL', category: 'ALL' })}
        />
      </div>

      {/* Results Table */}
      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(item) => item.scan_id}
        emptyMessage="No inspection records match your filters."
      />
    </div>
  );
}

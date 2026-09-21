'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PageHeader, MetricCard } from '@/components/ui';
import { getApiUrl } from '@/lib/api-config';
import type { GeospatialInspectionPoint, RecidivistBrandEntry } from '@/lib/db/unified-db';

export default function AnalyticsGISPage() {
  const [points, setPoints] = useState<GeospatialInspectionPoint[]>([]);
  const [brands, setBrands] = useState<RecidivistBrandEntry[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'NON_COMPLIANT' | 'USP' | 'FONT' | 'GS1'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<GeospatialInspectionPoint | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Fetch data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [geoRes, brandRes] = await Promise.all([
          fetch(getApiUrl('/api/analytics/geospatial')).then((r) => r.json()),
          fetch(getApiUrl('/api/analytics/recidivism')).then((r) => r.json()),
        ]);

        let combinedPoints: GeospatialInspectionPoint[] = Array.isArray(geoRes?.points) ? geoRes.points : [];

        // Also check client-side cached scan to ensure freshly completed scans appear immediately
        if (typeof window !== 'undefined') {
          try {
            const rawLatest = sessionStorage.getItem('parakh_latest_scan') || localStorage.getItem('parakh_latest_scan');
            if (rawLatest) {
              const parsed = JSON.parse(rawLatest);
              if (parsed && parsed.id && parsed.latitude && parsed.longitude) {
                const exists = combinedPoints.some((p) => p.id === parsed.id);
                if (!exists) {
                  combinedPoints.unshift({
                    id: parsed.id,
                    productName: parsed.product_name || parsed.extractedData?.productName || 'Inspected Commodity',
                    brandName: parsed.extractedData?.brand || 'Commercial Brand',
                    establishmentName: parsed.establishment_name || 'Active Inspection Site',
                    establishmentAddress: parsed.establishment_address || `GPS: ${parsed.latitude.toFixed(5)}°N, ${parsed.longitude.toFixed(5)}°E`,
                    latitude: parsed.latitude,
                    longitude: parsed.longitude,
                    status: parsed.overall_status || 'NEEDS_REVIEW',
                    violationsCount: parsed.violations_count || 0,
                    violations: parsed.complianceResult?.violations || [],
                    verificationCode: `PRK-EVI-${parsed.id.slice(0, 8).toUpperCase()}`,
                    createdAt: parsed.created_at || new Date().toISOString(),
                  });
                }
              }
            }
          } catch {}
        }

        setPoints(combinedPoints);
        if (combinedPoints.length > 0) {
          setSelectedPoint(combinedPoints[0]);
        }
        if (brandRes?.brands) {
          setBrands(brandRes.brands);
        }
      } catch (err) {
        console.warn('Analytics loading notice:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

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

  const handleCenterOnPoint = (pt: GeospatialInspectionPoint) => {
    if (mapInstanceRef.current && pt) {
      mapInstanceRef.current.setView([pt.latitude, pt.longitude], 15, { animate: true });
    }
  };

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    let isSubscribed = true;

    async function initLeaflet() {
      const L = await import('leaflet');
      // Import Leaflet styles dynamically if not present
      if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      if (!isSubscribed) return;

      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Default center: Pan-India National Overview
        const map = L.map(mapContainerRef.current).setView([22.9734, 78.6569], 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors | PARAKH GIS',
        }).addTo(map);

        mapInstanceRef.current = map;
      }

      const map = mapInstanceRef.current;
      if (!map) return;

      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Filter points
      const filtered = points.filter((p) => {
        if (selectedFilter === 'ALL') return true;
        if (selectedFilter === 'NON_COMPLIANT') return p.status === 'NON_COMPLIANT';
        if (selectedFilter === 'USP') return p.violations.some((v) => v.rule_code === 'PCR-013');
        if (selectedFilter === 'FONT') return p.violations.some((v) => v.rule_code === 'PCR-003' || v.rule_code === 'PCR-004');
        if (selectedFilter === 'GS1') return p.violations.some((v) => v.rule_code === 'PCR-011');
        return true;
      });

      filtered.forEach((pt) => {
        const color = pt.status === 'COMPLIANT' ? '#10B981' : pt.status === 'NON_COMPLIANT' ? '#EF4444' : '#F59E0B';
        const marker = L.circleMarker([pt.latitude, pt.longitude], {
          radius: pt.status === 'NON_COMPLIANT' ? 10 : 8,
          fillColor: color,
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: monospace; font-size: 11px; max-width: 220px;">
            <strong style="color: #0A2540; font-size: 12px;">${pt.establishmentName}</strong><br/>
            <span style="color: #64748B;">${pt.establishmentAddress}</span><br/>
            <span style="color: #64748B; font-size: 10px;">Coords: ${pt.latitude.toFixed(5)}°N, ${pt.longitude.toFixed(5)}°E</span>
            <hr style="margin: 4px 0; border: 0; border-top: 1px solid #CBD5E1;" />
            <strong>Product:</strong> ${pt.productName}<br/>
            <strong>Brand:</strong> ${pt.brandName}<br/>
            <strong>Status:</strong> <span style="color: ${color}; font-weight: bold;">${pt.status}</span><br/>
            <strong>Violations:</strong> ${pt.violationsCount}<br/>
            <small style="color: #64748B;">Code: ${pt.verificationCode || 'VERIFIED'}</small>
          </div>
        `);

        marker.on('click', () => {
          setSelectedPoint(pt);
        });

        markersRef.current.push(marker);
      });

      // Automatically frame and fit map bounds to show ALL places where scans were done!
      if (markersRef.current.length > 0) {
        if (markersRef.current.length === 1) {
          map.setView([filtered[0].latitude, filtered[0].longitude], 12);
        } else {
          const group = L.featureGroup(markersRef.current);
          map.fitBounds(group.getBounds().pad(0.3), {
            maxZoom: 15,
            animate: true,
          });
        }
      }
    }

    initLeaflet();

    return () => {
      isSubscribed = false;
    };
  }, [points, selectedFilter]);

  const totalPoints = points.length;
  const nonCompliantPoints = points.filter((p) => p.status === 'NON_COMPLIANT').length;
  const escalatedBrands = brands.filter((b) => b.riskTier === 'ESCALATED_SECTION_36_2').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-2">
      <PageHeader
        title="Geospatial Enforcement & Brand Recidivism Intelligence"
        description="GIS monitoring command center tracking retail violation density clusters, tamper-evident field records, and multi-store repeat corporate offenders under Section 36(2)."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePurgeDummy}
              className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-rose-700 hover:text-rose-800 font-mono text-xs font-bold uppercase tracking-wider transition-colors border border-rose-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Remove dummy demonstration scans from the database"
            >
              <span>🗑️</span>
              <span>Purge Dummy Scans</span>
            </button>
            <Link
              href="/scan"
              className="px-4 py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-mono font-bold text-xs uppercase tracking-wider transition-colors border-t-2 border-t-[#EA580C] flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>+ New Inspection</span>
            </Link>
          </div>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="GEO-MAPPED RETAIL SITES"
          value={totalPoints}
          subtext="GPS verified field inspections"
          statusColor="text-[#0A2540]"
        />
        <MetricCard
          label="HOTSPOT VIOLATIONS"
          value={nonCompliantPoints}
          subtext="Establishments with active infractions"
          statusColor={nonCompliantPoints > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}
        />
        <MetricCard
          label="SECTION 36(2) ESCALATIONS"
          value={escalatedBrands}
          subtext="Brands with multi-store repeat offenses"
          statusColor={escalatedBrands > 0 ? 'text-[#B91C1C]' : 'text-[#15803D]'}
        />
        <MetricCard
          label="RECIDIVIST CORPORATE INDEX"
          value={brands.length}
          subtext="Brands currently on state watchlist"
          statusColor="text-[#B45309]"
        />
      </div>


      {/* GIS Map & Selected Center Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Container */}
        <div className="lg:col-span-2 bg-white border border-[#CBD5E1] p-4 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#0A2540]">
                Live Geographic Compliance Heatmap (GPS Field Locations)
              </h3>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1 font-mono text-[11px]">
              {(['ALL', 'NON_COMPLIANT', 'USP', 'FONT', 'GS1'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`px-2.5 py-1 border transition-colors ${
                    selectedFilter === f
                      ? 'bg-[#0A2540] text-white border-[#0A2540]'
                      : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  {f === 'ALL' ? 'All Sites' : f === 'NON_COMPLIANT' ? 'Violations' : f}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={mapContainerRef}
            className="w-full h-[450px] border border-slate-300 rounded-xs bg-slate-100 z-10"
          />

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Compliant
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Violation Found
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Needs Review
              </span>
            </div>
            <span>Coordinates Synchronized via NTP</span>
          </div>
        </div>

        {/* Selected Point Details */}
        <div className="bg-white border border-[#CBD5E1] p-5 shadow-xs space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <span className="font-mono text-[10px] text-[#EA580C] uppercase font-bold tracking-widest block">
              Inspection Dossier Detail
            </span>
            <h3 className="font-mono font-bold text-sm text-[#0A2540] mt-0.5">
              {selectedPoint ? selectedPoint.establishmentName : 'Select a Marker on Map'}
            </h3>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              {selectedPoint ? selectedPoint.establishmentAddress : 'Click any circle on the GIS map to inspect details.'}
            </p>
          </div>

          {selectedPoint && (
            <div className="space-y-3 font-mono text-xs">
              <div className="bg-slate-50 p-2.5 border border-slate-200 space-y-1">
                <div className="text-slate-500 text-[10px] uppercase">Inspected Commodity</div>
                <div className="font-bold text-[#0A2540] text-sm">{selectedPoint.productName}</div>
                <div className="text-slate-600">Brand: <strong>{selectedPoint.brandName}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-50 p-2 border border-slate-200">
                  <div className="text-slate-500 text-[10px] uppercase">Compliance Status</div>
                  <div className={`font-bold mt-0.5 ${
                    selectedPoint.status === 'COMPLIANT' ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {selectedPoint.status}
                  </div>
                </div>

                <div className="bg-slate-50 p-2 border border-slate-200">
                  <div className="text-slate-500 text-[10px] uppercase">Violations Count</div>
                  <div className="font-bold text-slate-900 mt-0.5">{selectedPoint.violationsCount}</div>
                </div>
              </div>

              {selectedPoint.violations.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 p-2.5 space-y-1">
                  <div className="text-rose-800 text-[10px] uppercase font-bold">Detected Legal Infringements</div>
                  {selectedPoint.violations.map((v, i) => (
                    <div key={i} className="text-rose-900 text-[11px]">
                      • <strong>{v.rule_code}:</strong> {v.title}
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 space-y-1 text-[11px] text-slate-500">
                <div>Forensic Code: <strong className="text-slate-700">{selectedPoint.verificationCode}</strong></div>
                <div>Capture Location: {selectedPoint.latitude.toFixed(4)}°N, {selectedPoint.longitude.toFixed(4)}°E</div>
                <div>Timestamp: {new Date(selectedPoint.createdAt).toLocaleDateString('en-IN')}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => handleCenterOnPoint(selectedPoint)}
                  className="py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1 cursor-pointer border border-slate-600"
                  title="Zoom directly to this marker on the map"
                >
                  <span>📍</span>
                  <span>Center Map</span>
                </button>
                <Link
                  href={`/scan/${selectedPoint.id}/results`}
                  className="py-2 bg-[#EA580C] hover:bg-orange-600 text-white font-bold text-xs uppercase tracking-wider transition-colors text-center shadow-xs"
                >
                  Inspect &rarr;
                </Link>
              </div>

              <Link
                href={`/scan/${selectedPoint.id}/report`}
                className="w-full block text-center py-2 bg-[#0A2540] hover:bg-[#1E3A8A] text-white font-bold text-xs uppercase tracking-wider transition-colors"
              >
                View Statutory Report &rarr;
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recidivist Brand Leaderboard (Section 36(2) Enforcement) */}
      <div className="bg-white border border-[#CBD5E1] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg">⚖️</span>
              <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-[#0A2540]">
                Recidivist Brand & Corporate Offender Index (Section 36(2) Escalation)
              </h3>
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              Automated multi-store recurrence tracker. Infractions across 2 or more retail locations trigger statutory escalation alerts for court prosecution.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-1 border border-slate-300">
            {brands.length} Monitored Corporate Entities
          </span>
        </div>

        <div className="border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono border-collapse">
            <thead className="bg-[#F1F5F9] border-b border-slate-200 text-[#0A2540] uppercase text-[10px]">
              <tr>
                <th className="p-3 border-r border-slate-200 font-bold">Brand / Corporate Entity</th>
                <th className="p-3 border-r border-slate-200 font-bold">Total Infractions</th>
                <th className="p-3 border-r border-slate-200 font-bold">Distinct Retail Outlets</th>
                <th className="p-3 border-r border-slate-200 font-bold">Risk Tier</th>
                <th className="p-3 border-r border-slate-200 font-bold">Recurring Rules</th>
                <th className="p-3 font-bold">Recommended Statutory Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-[11px]">
              {brands.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    Zero repeat offenders currently recorded in database.
                  </td>
                </tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.brandName} className={b.riskTier === 'ESCALATED_SECTION_36_2' ? 'bg-rose-50/60' : undefined}>
                    <td className="p-3 font-bold text-[#0A2540] border-r border-slate-200">
                      {b.brandName}
                      <div className="text-[10px] text-slate-500 font-normal">{b.manufacturerName}</div>
                    </td>
                    <td className="p-3 font-bold text-slate-900 border-r border-slate-200">
                      {b.totalViolations} Violations
                    </td>
                    <td className="p-3 text-slate-700 border-r border-slate-200">
                      {b.distinctStores} Stores
                    </td>
                    <td className="p-3 border-r border-slate-200">
                      <span className={`px-2 py-0.5 text-[10px] font-bold border rounded-xs ${
                        b.riskTier === 'ESCALATED_SECTION_36_2'
                          ? 'bg-rose-100 text-rose-800 border-rose-300'
                          : b.riskTier === 'WARNING'
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {b.riskTier.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 border-r border-slate-200">
                      {b.commonInfringements.join(', ') || 'General Declarations'}
                    </td>
                    <td className="p-3">
                      {b.riskTier === 'ESCALATED_SECTION_36_2' ? (
                        <span className="font-bold text-rose-700 flex items-center gap-1">
                          <span>🚨</span> Section 36(2) Enhanced Compounding (₹50,000 / Prosecution)
                        </span>
                      ) : b.riskTier === 'WARNING' ? (
                        <span className="text-amber-700">Formal Warning & Mandatory Resurvey</span>
                      ) : (
                        <span className="text-slate-600">Standard Compounding (Rule 32)</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

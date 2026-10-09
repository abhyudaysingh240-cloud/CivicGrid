import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CitizenReport } from '../../types';
import { apiRequest } from '../../api/client';
import { MapPin, RefreshCw, AlertTriangle, Zap, Droplets, Trash2, Construction, HelpCircle } from 'lucide-react';

/**
 * CivicMapView — Session D3
 * Renders a real Leaflet-based GIS map of all visible CitizenReports using
 * OpenStreetMap tiles (no API key required). Reports without coordinates are
 * shown in a side-list. Clicking a pin highlights the report in the list.
 */

declare const L: any; // Leaflet loaded dynamically

const CATEGORY_COLORS: Record<string, string> = {
  pothole:     '#f59e0b',
  streetlight: '#fbbf24',
  garbage:     '#22c55e',
  water:       '#38bdf8',
  electrical:  '#ef4444',
  other:       '#94a3b8',
};

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:   '#60a5fa',
  VERIFIED:    '#a78bfa',
  IN_PROGRESS: '#f97316',
  RESOLVED:    '#10b981',
  REJECTED:    '#6b7280',
};

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  pothole:     Construction,
  streetlight: Zap,
  garbage:     Trash2,
  water:       Droplets,
  electrical:  AlertTriangle,
  other:       HelpCircle,
};

// Default map center (Mumbai) — if reports have real coords they override this
const DEFAULT_CENTER: [number, number] = [19.076, 72.877];
const DEFAULT_ZOOM = 11;

interface CivicMapViewProps {
  /** Pre-loaded reports from parent. Falls back to fetching if empty. */
  initialReports?: CitizenReport[];
}

export const CivicMapView: React.FC<CivicMapViewProps> = ({ initialReports }) => {
  const mapRef = useRef<any>(null);
  const mapElRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<any[]>([]);
  const [reports, setReports] = useState<CitizenReport[]>(initialReports || []);
  const [loading, setLoading] = useState(!initialReports?.length);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [leafletReady, setLeafletReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  /* ── Load Leaflet dynamically (avoids SSR issues and keeps bundle lean) ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).L) { setLeafletReady(true); return; }

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletReady(true);
    script.onerror = () => setMapError('Failed to load map library (no internet?).');
    document.head.appendChild(script);

    return () => {
      // Don't unload Leaflet — it's stateless enough to reuse
    };
  }, []);

  /* ── Fetch reports if not provided ── */
  const loadReports = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest<CitizenReport[]>('/civic/reports');
      setReports(data);
    } catch {
      // silently handle — map shows empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialReports?.length) loadReports();
  }, [initialReports, loadReports]);

  /* ── Initialize Leaflet map when ready ── */
  useEffect(() => {
    if (!leafletReady || !mapElRef.current) return;
    const Lf = (window as any).L;

    if (mapRef.current) return; // already initialised

    try {
      mapRef.current = Lf.map(mapElRef.current, {
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      Lf.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    } catch (e) {
      setMapError('Map initialisation error.');
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [leafletReady]);

  /* ── Render markers whenever reports or map changes ── */
  useEffect(() => {
    if (!mapRef.current || !leafletReady) return;
    const Lf = (window as any).L;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const geoReports = reports.filter(
      (r) => r.x_coord && r.y_coord && (r.x_coord !== 0 || r.y_coord !== 0)
    );

    if (!geoReports.length) return;

    const bounds: [number, number][] = [];

    geoReports.forEach((rep) => {
      const catColor = CATEGORY_COLORS[rep.category] || '#94a3b8';
      const statusColor = STATUS_COLORS[rep.status] || '#60a5fa';
      const lat = rep.x_coord;
      const lng = rep.y_coord;

      const svgIcon = Lf.divIcon({
        html: `
          <div style="
            width:28px;height:28px;
            border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            background:${catColor};
            border:2px solid ${statusColor};
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
          "></div>
        `,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -30],
      });

      const marker = Lf.marker([lat, lng], { icon: svgIcon })
        .addTo(mapRef.current!)
        .bindPopup(
          `<div style="font-family:monospace;font-size:12px;min-width:180px">
            <b style="color:${catColor}">#${rep.id} — ${rep.category?.toUpperCase()}</b><br/>
            <span style="color:#64748b">${rep.status}</span> | Severity ${rep.severity}/5<br/>
            <span style="color:#334155">${rep.description.slice(0, 80)}${rep.description.length > 80 ? '…' : ''}</span>
          </div>`,
          { maxWidth: 240 }
        )
        .on('click', () => setSelectedId(rep.id));

      markersRef.current.push(marker);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [reports, leafletReady]);

  /* ── Highlight selected marker ── */
  useEffect(() => {
    if (!mapRef.current || !leafletReady || selectedId == null) return;
    const idx = reports.findIndex((r) => r.id === selectedId);
    if (idx !== -1 && markersRef.current[idx]) {
      const m = markersRef.current[idx];
      m.openPopup();
      mapRef.current.panTo(m.getLatLng(), { animate: true, duration: 0.5 });
    }
  }, [selectedId, reports, leafletReady]);

  const geoCount = reports.filter((r) => r.x_coord !== 0 || r.y_coord !== 0).length;
  const noGeoCount = reports.length - geoCount;

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[var(--coral-strong)]/20 text-[var(--coral-strong)]">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Incident Map</h2>
            <p className="text-xs text-[var(--text-muted)]">
              {geoCount} mapped · {noGeoCount} without location
            </p>
          </div>
        </div>
        <button
          onClick={loadReports}
          disabled={loading}
          className="btn btn-ghost text-sm gap-2"
          aria-label="Refresh map"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: color }} />
            <span className="capitalize">{cat}</span>
          </div>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-[var(--stone-border)] shadow-lg">
        {mapError ? (
          <div className="flex flex-col items-center justify-center h-72 bg-[var(--stone-light)] text-[var(--text-muted)] gap-3 p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
            <p className="font-semibold">{mapError}</p>
            <p className="text-sm">Check your internet connection or use the list view below.</p>
          </div>
        ) : (
          <>
            {!leafletReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--stone-light)]">
                <div className="animate-spin rounded-full border-2 border-[var(--coral-strong)] border-t-transparent w-8 h-8" />
              </div>
            )}
            <div ref={mapElRef} style={{ height: 400, width: '100%' }} />
          </>
        )}
      </div>

      {/* Side-list for unmapped reports */}
      {reports.filter((r) => r.x_coord === 0 && r.y_coord === 0).length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2 uppercase tracking-wide">
            Reports without location
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {reports
              .filter((r) => r.x_coord === 0 && r.y_coord === 0)
              .map((rep) => {
                const Icon = CATEGORY_ICONS[rep.category] || HelpCircle;
                return (
                  <div
                    key={rep.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-[var(--stone-border)] bg-[var(--stone-light)] text-sm"
                  >
                    <div
                      className="p-1.5 rounded-lg shrink-0"
                      style={{ background: `${CATEGORY_COLORS[rep.category] || '#94a3b8'}22` }}
                    >
                      <Icon className="w-4 h-4" style={{ color: CATEGORY_COLORS[rep.category] }} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--espresso)]">#{rep.id}</span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-bold"
                          style={{
                            background: `${STATUS_COLORS[rep.status] || '#60a5fa'}22`,
                            color: STATUS_COLORS[rep.status] || '#60a5fa',
                          }}
                        >
                          {rep.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-primary)] line-clamp-1 mt-0.5">
                        {rep.description}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

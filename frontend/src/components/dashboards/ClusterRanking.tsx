/**
 * ClusterRanking.tsx
 * ──────────────────
 * Admin-only read-only component: "Problem Hotspots (Ranked)".
 * Reads the shared report store via useReports(), clusters with clusterEngine,
 * and displays ranked hotspot cards.
 *
 * Zero writes to the store. Wrapped in an error boundary so any crash shows
 * "Clustering unavailable" instead of breaking the admin page.
 *
 * TO REMOVE THE FEATURE:
 *   Delete this file, delete clusterEngine.ts, delete cluster-ranking.css,
 *   remove the import and <ClusterRanking /> line from AdminDashboard.tsx.
 */

import React, { useState, useMemo, Component } from 'react';
import { useReports } from '../../hooks/useReports';
import {
  computeClusters,
  CLUSTER_RADIUS_M,
  type Cluster,
  type ClusterResult,
} from '../../utils/clusterEngine';
import '../../styles/cluster-ranking.css';

// ── Error Boundary ─────────────────────────────────────────────────────────

interface EBState { hasError: boolean; }
class ClusterErrorBoundary extends Component<React.PropsWithChildren, EBState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: Error) {
    console.warn('[ClusterRanking] Error caught by boundary:', err.message);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="cr-error" role="alert">
          ⚠ Clustering unavailable — check console for details.
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Status colour helpers ──────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED:   'background:rgba(245,158,11,0.18);color:#fcd34d;border:1px solid rgba(245,158,11,0.35)',
  VERIFIED:    'background:rgba(56,189,248,0.15);color:#7dd3fc;border:1px solid rgba(56,189,248,0.3)',
  IN_PROGRESS: 'background:rgba(56,189,248,0.2);color:#38bdf8;border:1px solid rgba(56,189,248,0.4)',
  ASSIGNED:    'background:rgba(167,139,250,0.18);color:#c4b5fd;border:1px solid rgba(167,139,250,0.35)',
  RESOLVED:    'background:rgba(52,211,153,0.15);color:#6ee7b7;border:1px solid rgba(52,211,153,0.3)',
  REJECTED:    'background:rgba(239,68,68,0.12);color:#fca5a5;border:1px solid rgba(239,68,68,0.3)',
};

function StatusChip({ status, count }: { status: string; count: number }) {
  const style = STATUS_COLORS[status] || 'background:#1e293b;color:#94a3b8;border:1px solid #334155';
  return (
    <span className="cr-mix-chip" style={{ cssText: style } as React.CSSProperties}>
      {status}: {count}
    </span>
  );
}

// ── Radius options ─────────────────────────────────────────────────────────
const RADIUS_OPTIONS = [
  { label: '100 m', value: 100 },
  { label: '150 m', value: 150 },
  { label: '300 m', value: 300 },
  { label: '500 m', value: 500 },
];

// ── Single cluster card ────────────────────────────────────────────────────

function ClusterCard({ cluster, rank }: { cluster: Cluster; rank: number }) {
  const [expanded, setExpanded] = useState(false);

  const fmt = (iso: string) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setExpanded(v => !v);
    }
  };

  return (
    <div className="cr-card" aria-label={`Cluster rank ${rank}: ${cluster.problemKey}`}>
      {/* ── Header (click to expand) ── */}
      <button
        className="cr-card-header"
        onClick={() => setExpanded(v => !v)}
        onKeyDown={handleKeyDown}
        aria-expanded={expanded}
        aria-controls={`cr-expanded-${cluster.id}`}
      >
        <span className="cr-rank">#{rank}</span>

        <div className="cr-header-main">
          <div className="cr-problem-type">{cluster.problemKey}</div>
          <div className="cr-address" title={cluster.topAddress}>{cluster.topAddress}</div>
        </div>

        <span className={`cr-badge cr-badge--${cluster.priorityBadge}`}>
          {cluster.priorityBadge}
        </span>

        <span
          className={`cr-chevron ${expanded ? 'cr-chevron--open' : ''}`}
          aria-hidden="true"
        >▼</span>
      </button>

      {/* ── Key stats row ── */}
      <div className="cr-stats" role="list" aria-label="Cluster statistics">
        {[
          { value: cluster.count,                      label: 'Reports'    },
          { value: cluster.uniqueReporters,            label: 'Reporters'  },
          { value: cluster.avgSeverity.toFixed(1),     label: 'Avg Sev'   },
          { value: cluster.maxSeverity,                label: 'Max Sev'   },
        ].map(({ value, label }) => (
          <div key={label} className="cr-stat" role="listitem">
            <span className="cr-stat-value">{value}</span>
            <span className="cr-stat-label">{label}</span>
          </div>
        ))}
        <div className="cr-stat">
          <span className="cr-stat-value" style={{ fontSize: '0.65rem' }}>
            {cluster.centroidLat.toFixed(3)},
          </span>
          <span className="cr-stat-value" style={{ fontSize: '0.65rem' }}>
            {cluster.centroidLng.toFixed(3)}
          </span>
          <span className="cr-stat-label">Centre</span>
        </div>
      </div>

      {/* ── Status mix ── */}
      {Object.keys(cluster.statusMix).length > 0 && (
        <div className="cr-mix" aria-label="Status breakdown">
          {Object.entries(cluster.statusMix).map(([s, c]) => (
            <StatusChip key={s} status={s} count={c} />
          ))}
        </div>
      )}

      {/* ── Footer: timestamps + map link ── */}
      <div className="cr-footer">
        <div className="cr-timestamps">
          <span>First report: {fmt(cluster.firstReport)}</span>
          <span>Latest report: {fmt(cluster.latestReport)}</span>
        </div>
        <a
          href={cluster.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="cr-map-link"
          title={`Open cluster centre in Google Maps (${cluster.centroidLat.toFixed(5)}, ${cluster.centroidLng.toFixed(5)})`}
          aria-label={`Open ${cluster.problemKey} hotspot in Google Maps`}
        >
          📍 Open in Maps ↗
        </a>
      </div>

      {/* ── Expandable drill-down ── */}
      {expanded && (
        <div
          id={`cr-expanded-${cluster.id}`}
          className="cr-expanded"
          aria-label="Reports in this cluster"
        >
          <div className="cr-expanded-title">Reports in this cluster ({cluster.count})</div>
          {cluster.reports.map(r => (
            <div key={r.id} className="cr-report-row">
              <span className="cr-report-id">#{r.id}</span>
              <StatusChip status={r.status} count={1} />
              <span style={{ color: 'var(--text-dark-muted)', fontSize: '0.6rem' }}>
                Severity: {r.severity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inner component (wrapped by error boundary) ────────────────────────────

function ClusterRankingInner() {
  const { reports } = useReports();
  const [radiusM, setRadiusM] = useState<number>(CLUSTER_RADIUS_M);
  const [includeResolved, setIncludeResolved] = useState(false);

  const result: ClusterResult = useMemo(
    () => computeClusters(reports, radiusM, includeResolved),
    [reports, radiusM, includeResolved]
  );

  return (
    <div
      className="cr-section bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-5 shadow-xl"
      aria-labelledby="cr-section-title"
    >
      {/* Section header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border-dark)]">
        <div>
          <h3
            id="cr-section-title"
            className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]"
          >
            🔥 Problem Hotspots (Ranked)
          </h3>
          <p className="text-[11px] text-[var(--text-dark-muted)] mt-0.5">
            Citizen reports clustered by location & problem type · ranked by frequency
          </p>
        </div>

        {/* Controls */}
        <div className="cr-controls">
          <select
            value={radiusM}
            onChange={e => setRadiusM(Number(e.target.value))}
            aria-label="Cluster grouping radius"
            id="cr-radius-select"
          >
            {RADIUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <label className="cr-toggle" htmlFor="cr-include-resolved">
            <input
              id="cr-include-resolved"
              type="checkbox"
              checked={includeResolved}
              onChange={e => setIncludeResolved(e.target.checked)}
            />
            Include resolved
          </label>
        </div>
      </div>

      {/* Skip banner */}
      {result.skipped > 0 && (
        <div className="cr-skip-banner" role="status" aria-live="polite">
          ℹ {result.skipped} report{result.skipped !== 1 ? 's' : ''} skipped (no GPS coordinates)
          · {result.total} eligible report{result.total !== 1 ? 's' : ''} considered
        </div>
      )}

      {/* Cluster grid */}
      <div className="cr-grid mt-4" aria-label="Ranked problem hotspot clusters">
        {result.clusters.length === 0 ? (
          <div className="cr-empty" role="status">
            {reports.length === 0
              ? 'No citizen reports yet — clusters will appear once reports are submitted.'
              : includeResolved
              ? 'No clusters found. Try increasing the radius.'
              : 'No active clusters (all reports resolved). Enable "Include resolved" to see historical hotspots.'}
          </div>
        ) : (
          result.clusters.map((cluster, i) => (
            <ClusterCard key={cluster.id} cluster={cluster} rank={i + 1} />
          ))
        )}
      </div>

      {/* Summary footer */}
      {result.clusters.length > 0 && (
        <div
          className="mt-4 pt-3 border-t border-[var(--border-dark)] text-[10px] font-mono text-[var(--text-dark-muted)] flex flex-wrap gap-4"
          role="contentinfo"
          aria-label="Cluster summary"
        >
          <span>{result.clusters.length} cluster{result.clusters.length !== 1 ? 's' : ''} found</span>
          <span>{result.total} eligible report{result.total !== 1 ? 's' : ''}</span>
          {result.skipped > 0 && <span>{result.skipped} skipped (no coords)</span>}
          <span>Radius: {radiusM} m</span>
          <span>Resolved: {includeResolved ? 'included' : 'excluded'}</span>
        </div>
      )}
    </div>
  );
}

// ── Public export (with error boundary) ───────────────────────────────────

export const ClusterRanking: React.FC = () => (
  <ClusterErrorBoundary>
    <ClusterRankingInner />
  </ClusterErrorBoundary>
);

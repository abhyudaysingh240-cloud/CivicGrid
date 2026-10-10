/**
 * CivicGrid — Problem Hotspot Clustering Engine
 * ──────────────────────────────────────────────
 * Pure, side-effect-free module. Reads reports, computes clusters, returns
 * ranked results. NEVER writes to or mutates the stored reports.
 *
 * Algorithm (3-4 sentences):
 *   1. Each report is assigned a "problem key" = its category (lowercased). If
 *      the category is absent or "unclassified", keyword matching on the
 *      description maps it to a canonical group.
 *   2. Within each problem group the algorithm walks through reports in
 *      insertion order; a report joins an existing cluster if the Haversine
 *      distance from the report's coords to ANY cluster member is ≤ CLUSTER_RADIUS_M
 *      (single-linkage DBSCAN-style).
 *   3. Clusters are ranked by report count, then avg severity (desc), then most
 *      recent report (desc), then oldest unresolved report (asc).
 *   4. Reports missing lat/lng are skipped and counted separately so nothing
 *      silently disappears.
 *
 * Tuneable constants (all at the top of this file):
 *   CLUSTER_RADIUS_M      — default grouping radius in metres (150)
 *   PRIORITY_HIGH_COUNT   — min report count for HIGH priority badge (5)
 *   PRIORITY_HIGH_SEV     — min avg severity for HIGH priority badge (4)
 *   PRIORITY_MED_COUNT    — min report count for MEDIUM priority badge (3)
 *   KEYWORD_MAP           — category keyword → canonical group name
 */

// ── Tuneable constants ──────────────────────────────────────────────────────
export const CLUSTER_RADIUS_M      = 150;  // metres
export const PRIORITY_HIGH_COUNT   = 5;
export const PRIORITY_HIGH_SEV     = 4;
export const PRIORITY_MED_COUNT    = 3;

/** Maps description keywords → canonical problem group names.
 *  Add or edit entries here to cover new report types. */
export const KEYWORD_MAP: Record<string, string> = {
  streetlight: 'Street Lighting',
  light:       'Street Lighting',
  lamp:        'Street Lighting',
  pothole:     'Road & Pothole',
  road:        'Road & Pothole',
  footpath:    'Road & Pothole',
  pavement:    'Road & Pothole',
  water:       'Water Supply',
  leak:        'Water Supply',
  pipeline:    'Water Supply',
  sewage:      'Sewage & Drainage',
  drain:       'Sewage & Drainage',
  flood:       'Sewage & Drainage',
  garbage:     'Waste & Sanitation',
  waste:       'Waste & Sanitation',
  trash:       'Waste & Sanitation',
  transformer: 'Electrical',
  electrical:  'Electrical',
  power:       'Electrical',
  outage:      'Electrical',
  spark:       'Electrical',
  substation:  'Electrical',
  feeder:      'Electrical',
  cable:       'Electrical',
  voltage:     'Electrical',
};

// ── Internal types ──────────────────────────────────────────────────────────
export interface ClusterReport {
  id: string | number;
  status: string;
  severity: number;
  created_at: string;
  reporterId?: string | number;
  locationLabel?: string;
  area?: string;
  latitude?: number | null;
  longitude?: number | null;
  x_coord?: number | null;
  y_coord?: number | null;
  description?: string;
  category?: string;
}

export interface Cluster {
  id: string;            // synthetic ID for React keys
  problemKey: string;    // canonical problem group
  reports: ClusterReport[];
  centroidLat: number;
  centroidLng: number;
  topAddress: string;
  count: number;
  uniqueReporters: number;
  avgSeverity: number;
  maxSeverity: number;
  statusMix: Record<string, number>;
  firstReport: string;
  latestReport: string;
  priorityBadge: 'HIGH' | 'MEDIUM' | 'LOW';
  mapsUrl: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getProblemKey(report: ClusterReport): string {
  const cat = (report.category || '').trim().toLowerCase();
  if (cat && cat !== 'unclassified' && cat !== 'other' && cat !== '') {
    // Capitalise first char for display
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  }
  // Keyword fallback on description
  const desc = (report.description || '').toLowerCase();
  for (const [kw, group] of Object.entries(KEYWORD_MAP)) {
    if (desc.includes(kw)) return group;
  }
  return 'Unclassified';
}

function getLat(r: ClusterReport): number | null {
  return r.latitude ?? r.x_coord ?? null;
}

function getLng(r: ClusterReport): number | null {
  return r.longitude ?? r.y_coord ?? null;
}

function getTopAddress(reports: ClusterReport[]): string {
  const freq: Record<string, number> = {};
  for (const r of reports) {
    const addr = r.locationLabel || r.area || '';
    if (addr) freq[addr] = (freq[addr] || 0) + 1;
  }
  let top = '';
  let topCount = 0;
  for (const [addr, cnt] of Object.entries(freq)) {
    if (cnt > topCount) { top = addr; topCount = cnt; }
  }
  return top || 'Roorkee, Uttarakhand';
}

function computePriority(count: number, avgSev: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (count >= PRIORITY_HIGH_COUNT || avgSev >= PRIORITY_HIGH_SEV) return 'HIGH';
  if (count >= PRIORITY_MED_COUNT) return 'MEDIUM';
  return 'LOW';
}

// ── Main export ─────────────────────────────────────────────────────────────

export interface ClusterResult {
  clusters: Cluster[];
  skipped: number;   // reports without lat/lng
  total: number;     // total reports considered
}

/**
 * Compute ranked hotspot clusters from an array of reports.
 * @param reports       - Raw report objects from useReports()
 * @param radiusM       - Grouping radius in metres (default CLUSTER_RADIUS_M)
 * @param includeResolved - Whether RESOLVED reports count toward clusters
 */
export function computeClusters(
  reports: ClusterReport[],
  radiusM: number = CLUSTER_RADIUS_M,
  includeResolved: boolean = false
): ClusterResult {
  const eligible = includeResolved
    ? reports
    : reports.filter(r => r.status !== 'RESOLVED' && r.status !== 'REJECTED');

  let skipped = 0;

  // 1. Separate into geo-tagged vs skipped
  const withCoords: Array<ClusterReport & { _lat: number; _lng: number }> = [];
  for (const r of eligible) {
    const lat = getLat(r);
    const lng = getLng(r);
    if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) {
      skipped++;
    } else {
      withCoords.push({ ...r, _lat: lat, _lng: lng });
    }
  }

  // 2. Group by problem key
  const byKey: Record<string, typeof withCoords> = {};
  for (const r of withCoords) {
    const key = getProblemKey(r);
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(r);
  }

  // 3. Single-linkage clustering within each key group
  const rawClusters: Array<typeof withCoords> = [];

  for (const [, group] of Object.entries(byKey)) {
    // Each element starts as its own cluster
    const localClusters: Array<typeof withCoords> = [];

    for (const report of group) {
      let merged = false;
      for (const cluster of localClusters) {
        // Single linkage: check distance to any existing member
        for (const member of cluster) {
          if (haversineM(report._lat, report._lng, member._lat, member._lng) <= radiusM) {
            cluster.push(report);
            merged = true;
            break;
          }
        }
        if (merged) break;
      }
      if (!merged) localClusters.push([report]);
    }

    rawClusters.push(...localClusters);
  }

  // 4. Build Cluster objects
  const clusters: Cluster[] = rawClusters.map((members, idx) => {
    const lats = members.map(m => m._lat);
    const lngs = members.map(m => m._lng);
    const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    const severities = members.map(m => Number(m.severity) || 1);
    const avgSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;
    const maxSeverity = Math.max(...severities);

    const uniqueReporters = new Set(members.map(m => String(m.reporterId ?? 'anon'))).size;

    const statusMix: Record<string, number> = {};
    for (const m of members) {
      const s = m.status || 'UNKNOWN';
      statusMix[s] = (statusMix[s] || 0) + 1;
    }

    const dates = members.map(m => m.created_at || '').filter(Boolean);
    dates.sort();
    const firstReport = dates[0] || '';
    const latestReport = dates[dates.length - 1] || '';

    const problemKey = getProblemKey(members[0]);

    return {
      id: `cluster-${idx}`,
      problemKey,
      reports: members,
      centroidLat,
      centroidLng,
      topAddress: getTopAddress(members),
      count: members.length,
      uniqueReporters,
      avgSeverity,
      maxSeverity,
      statusMix,
      firstReport,
      latestReport,
      priorityBadge: computePriority(members.length, avgSeverity),
      mapsUrl: `https://www.google.com/maps?q=${centroidLat.toFixed(5)},${centroidLng.toFixed(5)}`,
    };
  });

  // 5. Rank: count desc → avg severity desc → latest report desc → oldest report asc
  clusters.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    if (b.avgSeverity !== a.avgSeverity) return b.avgSeverity - a.avgSeverity;
    const latestCmp = new Date(b.latestReport).getTime() - new Date(a.latestReport).getTime();
    if (latestCmp !== 0) return latestCmp;
    return new Date(a.firstReport).getTime() - new Date(b.firstReport).getTime();
  });

  return { clusters, skipped, total: eligible.length };
}

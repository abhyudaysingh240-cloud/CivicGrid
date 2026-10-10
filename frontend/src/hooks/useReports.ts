/**
 * CivicGrid — Production Data Bus
 * Single source of truth: localStorage key `civicgrid_production_store_v1`
 * All dashboards (Citizen, Worker, Admin, Officer) read/write through this module.
 */

import { useState, useEffect } from 'react';

// ── Storage keys ─────────────────────────────────────────────────────────────
const STORAGE_KEY = 'civicgrid_production_store_v1';
const BUS_EVENT   = 'civicgrid_live_data_sync';

// Auth registry: persists registered users locally (offline-first)
const AUTH_KEY    = 'civicgrid_auth_registry_v1';
const SESSION_KEY = 'civicgrid_active_session_v1';

// ── Seed reports ──────────────────────────────────────────────────────────────
export const PRODUCTION_SEED_REPORTS: any[] = [
  {
    id: 'REP-ROORKEE-201',
    description: 'High thermal load & transformer humming near Vardhmanpuram / COER University North Gate feeder pillar.',
    category: 'electrical',
    severity: 5,
    asset_id: 'ASSET_LOAD_UNIVERSITY',
    asset_name: 'COER University Campus Power Sub-Station',
    area: 'Vardhmanpuram / COER Area',
    locationLabel: 'COER University Campus, Vardhmanpuram, Roorkee',
    x_coord: 29.8543,
    y_coord: 77.8880,
    latitude: 29.8543,
    longitude: 77.8880,
    submittedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    status: 'IN_PROGRESS',
    username: 'citizen1',
    reporterId: 5,
    assignedTo: 'Ramesh Sharma (worker1)',
    assignedWorkerEmail: 'worker@civicgrid.internal',
    assignedWorkerId: 3,
    workerRole: 'Senior Grid Technician - Roorkee Unit',
    priority_level: 'CRITICAL',
    priority_score: 94,
    classification_source: 'AI_VERIFIED_CITIZEN',
    classification_confidence: 0.98,
  },
  {
    id: 'REP-ROORKEE-202',
    description: 'Substation telemetry fluctuation on 220kV PTCUL primary incoming feeder lines during peak evening ramp.',
    category: 'electrical',
    severity: 4,
    asset_id: 'ASSET_SUB_NORTH',
    asset_name: '220kV PTCUL Primary Substation Roorkee',
    area: 'Roorkee PTCUL Sector',
    locationLabel: '220kV PTCUL Substation Yard, Roorkee',
    x_coord: 29.8700,
    y_coord: 77.8920,
    latitude: 29.8700,
    longitude: 77.8920,
    submittedAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    status: 'ASSIGNED',
    username: 'citizen2',
    reporterId: 999,
    assignedTo: 'Amit Kumar (worker2)',
    assignedWorkerEmail: 'worker2@civicgrid.internal',
    assignedWorkerId: 4,
    workerRole: 'High-Voltage Switchgear Specialist',
    priority_level: 'HIGH',
    priority_score: 82,
    classification_source: 'SCADA_LINKED_CITIZEN',
    classification_confidence: 0.95,
  },
  {
    id: 'REP-ROORKEE-203',
    description: 'Cable joint vibration and voltage drop noticed along Vardhmanpuram Commercial Sector feeder line.',
    category: 'electrical',
    severity: 3,
    asset_id: 'ASSET_DP_N1',
    asset_name: 'Vardhmanpuram Feeder Pillar 11kV',
    area: 'Vardhmanpuram / COER Area',
    locationLabel: 'Vardhmanpuram Market Feeder, Roorkee',
    x_coord: 29.8510,
    y_coord: 77.8840,
    latitude: 29.8510,
    longitude: 77.8840,
    submittedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    status: 'SUBMITTED',
    username: 'citizen1',
    reporterId: 5,
    assignedTo: null,
    assignedWorkerEmail: null,
    assignedWorkerId: null,
    priority_level: 'MEDIUM',
    priority_score: 58,
    classification_source: 'USER_SUBMITTED',
    classification_confidence: 0.91,
  },
  {
    id: 'REP-ROORKEE-204',
    description: 'Civil Hospital Roorkee trauma wing secondary backup distribution point inspection requested.',
    category: 'electrical',
    severity: 4,
    asset_id: 'ASSET_DP_N2',
    asset_name: 'Roorkee Cantt / Civil Lines Transformer Vault',
    area: 'Roorkee Cantt / Civil Lines',
    locationLabel: 'Civil Hospital Perimeter, Roorkee',
    x_coord: 29.8640,
    y_coord: 77.8960,
    latitude: 29.8640,
    longitude: 77.8960,
    submittedAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    status: 'IN_PROGRESS',
    username: 'citizen2',
    reporterId: 999,
    assignedTo: 'Ramesh Sharma (worker1)',
    assignedWorkerEmail: 'worker@civicgrid.internal',
    assignedWorkerId: 3,
    workerRole: 'Senior Grid Technician - Roorkee Unit',
    priority_level: 'HIGH',
    priority_score: 88,
    classification_source: 'EMERGENCY_DISPATCH',
    classification_confidence: 0.99,
  },
];

// ── Core production data bus ──────────────────────────────────────────────────

export const getLiveReports = (): any[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTION_SEED_REPORTS));
      return PRODUCTION_SEED_REPORTS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(PRODUCTION_SEED_REPORTS));
      return PRODUCTION_SEED_REPORTS;
    }

    // Backward-compatible migration: ensure reporterId and coordinates exist on all reports
    let needsUpdate = false;
    const migrated = parsed.map((r: any) => {
      let repId = r.reporterId;
      if (!repId) {
        needsUpdate = true;
        if (r.username === 'citizen1') repId = 5;
        else if (r.username === 'citizen2') repId = 999;
        else repId = 'DEMO_SEED';
      }
      const x = r.x_coord !== undefined ? r.x_coord : (r.latitude !== undefined ? r.latitude : null);
      const y = r.y_coord !== undefined ? r.y_coord : (r.longitude !== undefined ? r.longitude : null);
      if (r.reporterId !== repId || r.x_coord !== x || r.y_coord !== y) {
        needsUpdate = true;
      }
      return {
        ...r,
        reporterId: repId,
        x_coord: x,
        y_coord: y,
        latitude: x,
        longitude: y,
      };
    });

    if (needsUpdate) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return PRODUCTION_SEED_REPORTS;
  }
};

export const commitReports = (updated: any[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event(BUS_EVENT));
};

// Legacy aliases (backward-compat with any existing imports)
export const getGlobalReports = getLiveReports;
export const saveGlobalReports = commitReports;

// ── Auth registry (offline-first, no backend required) ───────────────────────

export interface LocalUser {
  id: number;
  username: string;
  email: string;
  password: string;
  role: 'CITIZEN' | 'FIELD_WORKER' | 'ADMIN' | 'DEPARTMENT_OFFICER';
  is_active: boolean;
  created_at: string;
}

const SEED_USERS: LocalUser[] = [
  { id: 1, username: 'admin',    email: 'admin@civicgrid.internal',   password: 'admin123',   role: 'ADMIN',               is_active: true, created_at: new Date().toISOString() },
  { id: 2, username: 'officer1', email: 'officer@civicgrid.internal',  password: 'officer123', role: 'DEPARTMENT_OFFICER',  is_active: true, created_at: new Date().toISOString() },
  { id: 3, username: 'worker1',  email: 'worker@civicgrid.internal',   password: 'worker123',  role: 'FIELD_WORKER',        is_active: true, created_at: new Date().toISOString() },
  { id: 4, username: 'worker2',  email: 'worker2@civicgrid.internal',  password: 'worker123',  role: 'FIELD_WORKER',        is_active: true, created_at: new Date().toISOString() },
  { id: 5, username: 'citizen1', email: 'citizen1@example.com',        password: 'citizen123', role: 'CITIZEN',             is_active: true, created_at: new Date().toISOString() },
];

const getAuthRegistry = (): LocalUser[] => {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(SEED_USERS));
      return SEED_USERS;
    }
    const parsed: LocalUser[] = JSON.parse(raw);
    // Always ensure seed users are present (merge without duplicates)
    const emailSet = new Set(parsed.map(u => u.email));
    const merged = [...parsed];
    for (const su of SEED_USERS) {
      if (!emailSet.has(su.email)) merged.push(su);
    }
    return merged;
  } catch {
    return SEED_USERS;
  }
};

const saveAuthRegistry = (users: LocalUser[]) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(users));
};

/** Register a new user. Throws string error message on failure. */
export const localRegister = (
  username: string,
  email: string,
  password: string,
  role: LocalUser['role']
): LocalUser => {
  const registry = getAuthRegistry();
  if (registry.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.');
  }
  if (registry.find(u => u.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Username already taken. Please choose another.');
  }
  const newUser: LocalUser = {
    id: Date.now(),
    username,
    email,
    password,
    role,
    is_active: true,
    created_at: new Date().toISOString(),
  };
  saveAuthRegistry([...registry, newUser]);
  return newUser;
};

/** Login. Throws string error message on failure. */
export const localLogin = (usernameOrEmail: string, password: string): LocalUser => {
  const registry = getAuthRegistry();
  const user = registry.find(
    u =>
      (u.email.toLowerCase() === usernameOrEmail.toLowerCase() ||
        u.username.toLowerCase() === usernameOrEmail.toLowerCase()) &&
      u.password === password
  );
  if (!user) throw new Error('Invalid username/email or password.');
  if (!user.is_active) throw new Error('Account is inactive. Contact support.');
  return user;
};

/** Persist active session to localStorage. */
export const persistSession = (user: LocalUser) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

/** Restore active session from localStorage. */
export const restoreSession = (): LocalUser | null => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Clear active session (logout). */
export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

/** Get all registered users (admin view). */
export const getAllUsers = (): LocalUser[] => getAuthRegistry();

/** Get only field workers. */
export const getWorkers = (): LocalUser[] =>
  getAuthRegistry().filter(u => u.role === 'FIELD_WORKER');

// ── Node sector matching helpers ──────────────────────────────────────────────

export const isReportInNodeSector = (report: any, nodeCode: string, nodeName: string = ''): boolean => {
  if (!report) return false;
  const text = `${report.description || ''} ${report.category || ''} ${report.asset_id || ''} ${report.asset_name || ''} ${report.locationLabel || ''} ${report.area || ''}`.toLowerCase();
  const code = (nodeCode || '').toUpperCase();
  const name = (nodeName || '').toLowerCase();

  if (code === 'LOAD_UNIVERSITY' || code === 'DP_N1' || name.includes('coer') || name.includes('vardhmanpuram')) {
    return text.includes('coer') || text.includes('vardhmanpuram') || text.includes('university') || text.includes('campus') || text.includes('load_university') || text.includes('dp_n1') || text.includes('highland');
  }
  if (code === 'SUB_NORTH' || name.includes('ptcul') || (name.includes('roorkee') && name.includes('substation'))) {
    return text.includes('ptcul') || text.includes('sub_north') || (text.includes('roorkee') && text.includes('substation')) || text.includes('master substation');
  }
  if (code === 'SUB_SOUTH' || code === 'BUS_S1' || name.includes('piran') || name.includes('kaliyar')) {
    return text.includes('piran') || text.includes('kaliyar') || text.includes('sub_south') || text.includes('imlikhera');
  }
  if (code === 'SUB_EAST' || code === 'DP_E1' || name.includes('bhagwanpur')) {
    return text.includes('bhagwanpur') || text.includes('sub_east') || text.includes('tech zone');
  }
  if (code === 'LOAD_HOSPITAL' || name.includes('hospital')) {
    return text.includes('hospital') || text.includes('trauma') || text.includes('load_hospital') || text.includes('medical');
  }
  if (code === 'LOAD_WATER_TREATMENT' || name.includes('ganga') || name.includes('pumping')) {
    return text.includes('ganga') || text.includes('canal') || text.includes('pumping') || text.includes('water') || text.includes('load_water');
  }
  if (code === 'LOAD_TRANSIT_SUB' || name.includes('railway') || name.includes('transit')) {
    return text.includes('railway') || text.includes('transit') || text.includes('station') || text.includes('train');
  }
  if (code === 'LOAD_NORTH_COMM_1' || name.includes('commercial')) {
    return text.includes('commercial') || text.includes('vardhmanpuram commercial') || text.includes('plaza') || text.includes('market');
  }
  if (code === 'LOAD_TECH_CAMPUS' || name.includes('iit') || name.includes('research')) {
    return text.includes('iit') || text.includes('research') || text.includes('tech campus') || text.includes('iit roorkee');
  }
  if (code === 'DP_N2' || name.includes('cantt') || name.includes('civil lines')) {
    return text.includes('cantt') || text.includes('civil lines') || text.includes('dp_n2');
  }
  if (code === 'DP_S1' || code === 'LOAD_SOUTH_IND_1' || name.includes('industrial')) {
    return text.includes('industrial') || text.includes('dp_s1') || text.includes('factory');
  }
  return false;
};

export const getNodeSectorReports = (reports: any[], nodeCode: string, nodeName: string = ''): any[] =>
  reports.filter(r => isReportInNodeSector(r, nodeCode, nodeName));

export const hasCriticalComplaintInSector = (reports: any[], nodeCode: string, nodeName: string = ''): boolean => {
  const matched = getNodeSectorReports(reports, nodeCode, nodeName);
  return matched.some(
    r =>
      (Number(r.severity) >= 4 || r.priority_level === 'CRITICAL' || r.priority_level === 'HIGH') &&
      r.status !== 'RESOLVED' &&
      r.status !== 'REJECTED'
  );
};

// ── Report CRUD ───────────────────────────────────────────────────────────────

export const createReport = (newReport: {
  description: string;
  category?: string;
  severity?: number;
  asset_id?: string;
  asset_name?: string;
  locationLabel?: string;
  area?: string;
  x_coord?: number | null;
  y_coord?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  image_filename?: string;
  username?: string;
  reporterId?: string | number;
}) => {
  const activeSession = restoreSession();
  const sessionUserId = activeSession?.id;
  const reporterId = sessionUserId ?? newReport.reporterId ?? 'ANONYMOUS_CITIZEN';
  const reporterUsername = activeSession?.username || newReport.username || 'Citizen';

  const reports = getLiveReports();
  const severity = Number(newReport.severity || 2);
  const priority_level = severity >= 5 ? 'CRITICAL' : severity >= 4 ? 'HIGH' : severity >= 3 ? 'MEDIUM' : 'LOW';
  const priority_score = severity === 5 ? 95 : severity === 4 ? 80 : severity === 3 ? 55 : 30;

  const lat = newReport.latitude !== undefined ? newReport.latitude : (newReport.x_coord !== undefined ? newReport.x_coord : null);
  const lng = newReport.longitude !== undefined ? newReport.longitude : (newReport.y_coord !== undefined ? newReport.y_coord : null);
  const locLabel = newReport.locationLabel || (lat && lng ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}` : (newReport.area || 'Roorkee Infrastructure Zone'));

  const reportWithMetadata = {
    ...newReport,
    id: `REP-${Date.now()}`,
    submittedAt: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    status: 'SUBMITTED',
    reporterId,
    username: reporterUsername,
    x_coord: lat,
    y_coord: lng,
    latitude: lat,
    longitude: lng,
    locationLabel: locLabel,
    area: newReport.area || locLabel,
    assignedTo: null,
    assignedWorkerEmail: null,
    assignedWorkerId: null,
    priority_level,
    priority_score,
    classification_source: 'USER_SUBMITTED',
    classification_confidence: 1.0,
  };
  reports.unshift(reportWithMetadata);
  commitReports(reports);
  return reportWithMetadata;
};

/** Get reports strictly filtered by citizen ID (data layer isolation) */
export const getReportsForCitizen = (citizenId?: string | number): any[] => {
  const all = getLiveReports();
  if (!citizenId) return [];
  return all.filter((r: any) => String(r.reporterId) === String(citizenId));
};

export const assignWorkerToReport = (reportId: string | number, worker: any) => {
  const current = getLiveReports();
  const updated = current.map((r: any) =>
    r.id === reportId
      ? {
          ...r,
          status: 'ASSIGNED',
          assignedTo: worker.username || worker.name || worker.email,
          assignedWorkerEmail: worker.email,
          assignedWorkerId: worker.id,
          workerRole: worker.role || 'Senior Grid Field Technician',
          updated_at: new Date().toISOString(),
        }
      : r
  );
  commitReports(updated);
};

export const updateReportStatus = (reportId: string | number, newStatus: string) => {
  const current = getLiveReports();
  const updated = current.map((r: any) =>
    r.id === reportId
      ? { ...r, status: newStatus, updated_at: new Date().toISOString() }
      : r
  );
  commitReports(updated);
};

// ── React hook: reactive subscription to the global production store ──────────

export const useReports = () => {
  const [reports, setReports] = useState<any[]>(getLiveReports());

  useEffect(() => {
    const handleSync = () => setReports(getLiveReports());
    window.addEventListener(BUS_EVENT, handleSync);
    // storage event fires in *other* tabs — enables cross-tab real-time sync
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener(BUS_EVENT, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  return { reports, setReports };
};

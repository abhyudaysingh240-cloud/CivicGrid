import React, { useState, useEffect, useCallback } from 'react';
import {
  GridTopologyData,
  GridNode,
  GridEdge,
  Scenario,
  User,
  Role,
  InfrastructureAsset,
} from './types';
import { apiRequest } from './api/client';
import { AppShell } from './components/AppShell';
import { GridHealthBar } from './components/GridHealthBar';
import { TopologyCanvas } from './components/TopologyCanvas';
import { ScenarioControlPanel } from './components/ScenarioControlPanel';
import { AssetDrawer } from './components/AssetDrawer';
import { WhyModal, WhyModalType } from './components/WhyModal';
import { LoginModal } from './components/LoginModal';

// Role Dashboards
import { CitizenPortal } from './components/dashboards/CitizenPortal';
import { OfficerDashboard } from './components/dashboards/OfficerDashboard';
import { WorkerDashboard } from './components/dashboards/WorkerDashboard';
import { AdminDashboard } from './components/dashboards/AdminDashboard';

import { Bell, RefreshCw } from 'lucide-react';

import { runLocalScenarioSimulation } from './utils/localScenarioSimulator';
import { restoreSession, clearSession, persistSession, LocalUser } from './hooks/useReports';

/** Map a LocalUser role to a strict canonical Role for the app */
const canonicalRole = (role: string): Role => {
  if (role === 'ADMIN') return 'ADMIN';
  if (role === 'DEPARTMENT_OFFICER') return 'DEPARTMENT_OFFICER';
  if (role === 'FIELD_WORKER') return 'FIELD_WORKER';
  return 'CITIZEN';
};

const DEFAULT_SCENARIOS: Scenario[] = [
  {
    code: 'A',
    name: 'Baseline Healthy Grid - Roorkee Substation Operating Nominal',
    description: '220kV PTCUL Roorkee Substation operating nominal. All radial feeders energized, all tie switches open.',
    expected_outcome: 'NORMAL state, 0 faults, 100% restoration, 0 MW unserved across Roorkee & COER campus.'
  },
  {
    code: 'B',
    name: 'Line Fault: Piran Kaliyar → COER Feeder Isolated (Auto-Rerouting Active)',
    description: 'Trip line LINE_BUS_N1_DP_N1 isolating Vardhmanpuram & COER University Campus feeder. Auto-healed via tie TIE_N1_S1 from 220/33kV Piran Kaliyar Substation.',
    expected_outcome: 'RESTORED state, 100% restoration, 4.9 MW restored via tie switch to COER Campus & Vardhmanpuram.'
  },
  {
    code: 'C',
    name: 'Capacity Overload: Industrial Area & Ganga Pumping Station',
    description: 'Trip line LINE_BUS_N2_DP_N2 feeding 7.2 MW Civil Hospital trauma and commercial loads. Available tie switch TIE_N2_S2_BOTTLENECK thermal limit is 2.5 MW, triggering automated load prioritization.',
    expected_outcome: 'RECONFIGURATION_FAILED, Honest unserved load accounting, partial restoration prioritizing Civil Hospital & Emergency Life-Support.'
  },
  {
    code: 'D',
    name: 'Multi-Incident Emergency: Roorkee North Sector Outage',
    description: 'Simultaneous severe storm event trips line LINE_SUB_N_BUS_N1 at 220kV PTCUL Substation and generates clustered municipal infrastructure damage reports in North Sector / Civil Lines.',
    expected_outcome: 'ISLANDED / Restored via South tie + Elevated civic emergency priority dispatched to field staff.'
  },
  {
    code: 'E',
    name: 'Cascading Line Trip After Reconfiguration: Bhagwanpur Interconnect',
    description: 'After restoring through tie TIE_N1_S1, downstream trunk line LINE_SUB_S_BUS_S1 trips under combined load, triggering secondary emergency isolation across Bhagwanpur Interconnect.',
    expected_outcome: 'Secondary island detection, cascading alert triggered, operator intervention required.'
  }
];

export const App: React.FC = () => {
  // Restore session from localStorage on first mount
  const restoredSession = restoreSession();
  const restoredRole: Role = restoredSession ? canonicalRole(restoredSession.role) : 'CITIZEN';

  const [currentUser, setCurrentUser] = useState<User | null>(
    restoredSession
      ? { id: restoredSession.id, username: restoredSession.username, email: restoredSession.email, role: restoredRole, is_active: restoredSession.is_active, created_at: restoredSession.created_at }
      : null
  );
  const [activeRole, setActiveRole] = useState<Role>(restoredRole);
  const [topology, setTopology] = useState<GridTopologyData | null>(() => runLocalScenarioSimulation('A', null).topology);
  const [scenarios, setScenarios] = useState<Scenario[]>(DEFAULT_SCENARIOS);
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Detail Drawer state
  const [selectedNode, setSelectedNode] = useState<GridNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GridEdge | null>(null);

  const handleSelectNode = (n: GridNode) => { setSelectedNode(n); setSelectedEdge(null); };
  const handleSelectEdge = (e: GridEdge) => { setSelectedEdge(e); setSelectedNode(null); };
  const handleCloseDrawer = () => { setSelectedNode(null); setSelectedEdge(null); };
  // Why Modal state
  const [whyType, setWhyType] = useState<WhyModalType>(null);
  const [whyData, setWhyData] = useState<any>(null);

  // Events Feed
  const [events, setEvents] = useState<any[]>([
    {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      event_type: 'INITIAL_ONLINE',
      severity: 'INFO',
      description: 'Roorkee Smart Grid SCADA Twin initialized. All substations operating nominal.',
    }
  ]);

  // 1. Fetch Topology & Baseline Data (Authorized operator roles only)
  const isGridOperator = activeRole === 'ADMIN' || activeRole === 'DEPARTMENT_OFFICER';

  const refreshTopology = useCallback(async () => {
    if (!isGridOperator) return;
    try {
      const top = await apiRequest<GridTopologyData>('/grid/topology');
      if (top && top.nodes && top.nodes.length > 0) {
        setTopology(top);
      }
    } catch (err) {
      console.warn('Topology fetch error (using resilient twin state):', err);
    }
  }, [isGridOperator]);

  const refreshEvents = useCallback(async () => {
    if (!isGridOperator) return;
    try {
      const evts = await apiRequest<any[]>('/grid/events?limit=20');
      if (Array.isArray(evts) && evts.length > 0) {
        setEvents(evts);
      }
    } catch (err) {
      // ignore
    }
  }, [isGridOperator]);

  // 2. Initial Setup — verify server session; local session already restored above
  useEffect(() => {
    // Silently attempt server-side session validation (non-blocking)
    apiRequest<User>('/auth/me')
      .then((u) => {
        setCurrentUser(u);
        setActiveRole(canonicalRole(u.role));
      })
      .catch(() => {
        // No server session — local session (already restored) remains in effect
      });

    apiRequest<InfrastructureAsset[]>('/civic/assets')
      .then(setAssets)
      .catch(() => []);
  }, []);

  // Fetch grid data and scenarios whenever an operator role is active
  useEffect(() => {
    if (isGridOperator) {
      refreshTopology();
      refreshEvents();
      apiRequest<Scenario[]>('/scenarios')
        .then((sc) => {
          if (Array.isArray(sc) && sc.length > 0) {
            setScenarios(sc);
          }
        })
        .catch(() => {
          setScenarios(DEFAULT_SCENARIOS);
        });
    }
  }, [isGridOperator, refreshTopology, refreshEvents]);

  // 3. Server-Sent Events (SSE) with Fallback Polling (Operators only)
  useEffect(() => {
    if (!isGridOperator) return;

    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    try {
      eventSource = new EventSource('/api/v1/grid/stream');
      eventSource.addEventListener('grid_event', () => {
        refreshTopology();
        refreshEvents();
      });
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        pollInterval = setInterval(() => {
          refreshTopology();
          refreshEvents();
        }, 3000);
      };
    } catch {
      pollInterval = setInterval(() => {
        refreshTopology();
        refreshEvents();
      }, 3000);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isGridOperator, refreshTopology, refreshEvents]);

  // Actions
  const handleRunScenario = async (code: string) => {
    setLoading(true);
    try {
      await apiRequest(`/scenarios/${code}/run`, { method: 'POST' });
      await refreshTopology();
      await refreshEvents();
    } catch (err: any) {
      console.warn(`Backend scenario API returned error for Scenario ${code}. Applying local simulation fallback:`, err);
      // LOCAL FRONTEND SIMULATION FALLBACK (Guarantees zero 500 crashes and immediate response)
      const { topology: simTopology, event: simEvent } = runLocalScenarioSimulation(code, topology);
      setTopology(simTopology);
      setEvents((prev) => [simEvent, ...prev.slice(0, 19)]);
    } finally {
      setLoading(false);
    }
  };

  const handleResetGrid = async () => {
    setLoading(true);
    try {
      await apiRequest('/grid/reset', { method: 'POST' });
      await refreshTopology();
      await refreshEvents();
    } catch (err: any) {
      console.warn('Backend grid reset returned error. Applying local simulation reset:', err);
      const { topology: simTopology, event: simEvent } = runLocalScenarioSimulation('A', topology);
      setTopology(simTopology);
      setEvents((prev) => [simEvent, ...prev.slice(0, 19)]);
    } finally {
      setLoading(false);
    }
  };

  const handleInjectFault = async (edgeCode: string) => {
    setLoading(true);
    try {
      await apiRequest('/grid/fault', {
        method: 'POST',
        body: JSON.stringify({ edge_code: edgeCode }),
      });
      await refreshTopology();
      await refreshEvents();
    } catch (err: any) {
      console.warn(`Backend fault injection returned error for ${edgeCode}. Applying local simulation fault:`, err);
      const code = edgeCode.includes('N1') ? 'B' : edgeCode.includes('N2') ? 'C' : 'D';
      const { topology: simTopology, event: simEvent } = runLocalScenarioSimulation(code, topology);
      setTopology(simTopology);
      setEvents((prev) => [simEvent, ...prev.slice(0, 19)]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    // Clear local session regardless of server result
    clearSession();
    setCurrentUser(null);
    setActiveRole('CITIZEN');
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      // offline — local session already cleared
    }
  };

  const handleSwitchRole = (role: Role) => {
    // Only allow switching to roles permitted by the user's registered role
    const userRole = currentUser?.role;
    if (!userRole) return;
    if (userRole === 'CITIZEN' && role !== 'CITIZEN') return;
    if (userRole === 'FIELD_WORKER' && role !== 'FIELD_WORKER') return;
    setActiveRole(role);
    if (role === 'ADMIN' || role === 'DEPARTMENT_OFFICER') {
      refreshTopology();
      refreshEvents();
    }
  };

  // Why Panel triggers
  const openWhyRestoration = async () => {
    try {
      const data = await apiRequest('/grid/why-restoration');
      setWhyType('RESTORATION');
      setWhyData(data);
    } catch (err: any) {
      alert(`Could not fetch restoration explanation: ${err.message}`);
    }
  };

  const openWhyRisk = async (assetId: number) => {
    try {
      const data = await apiRequest(`/civic/why-risk/${assetId}`);
      setWhyType('RISK');
      setWhyData(data);
    } catch (err: any) {
      alert(`Could not fetch risk explanation: ${err.message}`);
    }
  };

  const openWhyPriority = async (reportId: number) => {
    try {
      const data = await apiRequest(`/civic/why-priority/${reportId}`);
      setWhyType('PRIORITY');
      setWhyData(data);
    } catch (err: any) {
      alert(`Could not fetch priority explanation: ${err.message}`);
    }
  };

  const openWhyClustering = async (clusterId: number) => {
    try {
      const data = await apiRequest(`/civic/why-clustering/${clusterId}`);
      setWhyType('CLUSTERING');
      setWhyData(data);
    } catch (err: any) {
      alert(`Could not fetch clustering explanation: ${err.message}`);
    }
  };

  const activeFaultsCount = topology?.edges.filter((e) => e.status === 'FAULTED').length || 0;

  return (
    <>
      <AppShell
        currentUser={currentUser}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        onLogout={handleLogout}
        onOpenLogin={() => setLoginModalOpen(true)}
        onSwitchRole={handleSwitchRole}
      >
        <div className="space-y-6">
          {/* Real-Time Grid Health Meter — strictly for Grid Operator / Admin roles */}
          {topology && isGridOperator && (
            <GridHealthBar
              state={topology.state}
              islands={topology.islands}
              activeFaultsCount={activeFaultsCount}
              onOpenWhyRestoration={openWhyRestoration}
            />
          )}

          {/* View Switcher based on Active Operational Role */}
          {activeRole === 'ADMIN' && (
            <div className="space-y-6">
              {/* Scenario Suite & Fault Trigger Toolbar */}
              {topology && (
                <ScenarioControlPanel
                  scenarios={scenarios}
                  edges={topology.edges}
                  onRunScenario={handleRunScenario}
                  onResetGrid={handleResetGrid}
                  onInjectFault={handleInjectFault}
                  loading={loading}
                />
              )}

              {/* Interactive React Flow Topology View */}
              {topology && (
                <TopologyCanvas
                  nodes={topology.nodes}
                  edges={topology.edges}
                  islands={topology.islands}
                  onSelectNode={handleSelectNode}
                  onSelectEdge={handleSelectEdge}
                />
              )}

              {/* Admin Logs and User Controls */}
              <AdminDashboard />
            </div>
          )}

          {activeRole === 'DEPARTMENT_OFFICER' && (
            <div className="space-y-6">
              {topology && (
                <TopologyCanvas
                  nodes={topology.nodes}
                  edges={topology.edges}
                  islands={topology.islands}
                  onSelectNode={handleSelectNode}
                  onSelectEdge={handleSelectEdge}
                />
              )}
              <OfficerDashboard
                onOpenWhyClustering={openWhyClustering}
                onOpenWhyPriority={openWhyPriority}
                onOpenWhyRisk={openWhyRisk}
              />
            </div>
          )}

          {activeRole === 'FIELD_WORKER' && (
            <div className="space-y-6">
              <WorkerDashboard currentUser={currentUser} />
            </div>
          )}

          {activeRole === 'CITIZEN' && (
            <CitizenPortal assets={assets} currentUser={currentUser} onReportCreated={() => {}} />
          )}

          {/* Live Grid Event Log Stream — strictly visible to Grid Operators */}
          {isGridOperator && (
            <div className="bg-[var(--surface-dark-1)] border border-[var(--border-dark)] rounded-2xl p-4 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-[var(--coral-strong)]/20 text-[var(--coral-light)]">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--text-dark-primary)]">
                    REAL-TIME AUDITED TELEMETRY & EVENT STREAM
                  </span>
                </div>
                <button
                  onClick={refreshEvents}
                  className="text-[var(--text-dark-muted)] hover:text-[var(--text-dark-primary)] transition-all"
                  aria-label="Refresh grid events"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {events.slice(0, 8).map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-[var(--surface-dark-2)] border border-[var(--border-dark)]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          evt.severity === 'CRITICAL'
                            ? 'bg-red-500 animate-ping'
                            : evt.severity === 'WARNING'
                            ? 'bg-amber-400'
                            : 'bg-emerald-400'
                        }`}
                      />
                      <span className="text-[var(--text-dark-primary)]">{evt.description}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-dark-muted)] shrink-0 ml-3">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </AppShell>

      {/* Asset Inspection Drawer */}
      <AssetDrawer
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onClose={handleCloseDrawer}
        onInjectFaultOnLine={handleInjectFault}
        onOpenWhyRisk={openWhyRisk}
        canInjectFault={activeRole === 'ADMIN' || activeRole === 'DEPARTMENT_OFFICER'}
      />

      {/* Why Explanation Modal */}
      <WhyModal type={whyType} data={whyData} onClose={() => setWhyType(null)} />

      {/* Login Modal */}
      {loginModalOpen && (
        <LoginModal
          onSuccess={(u) => {
            // Enforce strict role binding from registration
            const strictRole = canonicalRole(u.role);
            setCurrentUser({ ...u, role: strictRole });
            setActiveRole(strictRole);
            setLoginModalOpen(false);
            // Trigger grid data load for operator roles
            if (strictRole === 'ADMIN' || strictRole === 'DEPARTMENT_OFFICER') {
              refreshTopology();
              refreshEvents();
            }
          }}
          onClose={() => setLoginModalOpen(false)}
        />
      )}
    </>
  );
};
export default App;

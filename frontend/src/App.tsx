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

import { Activity, ShieldAlert, Layers, Bell, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<Role>('CITIZEN');
  const [topology, setTopology] = useState<GridTopologyData | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
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
  const [events, setEvents] = useState<any[]>([]);

  // 1. Fetch Topology & Baseline Data (Authorized operator roles only)
  const isGridOperator = activeRole === 'ADMIN' || activeRole === 'DEPARTMENT_OFFICER';

  const refreshTopology = useCallback(async () => {
    if (!isGridOperator) return;
    try {
      const top = await apiRequest<GridTopologyData>('/grid/topology');
      setTopology(top);
    } catch (err) {
      console.error('Topology fetch error:', err);
    }
  }, [isGridOperator]);

  const refreshEvents = useCallback(async () => {
    if (!isGridOperator) return;
    try {
      const evts = await apiRequest<any[]>('/grid/events?limit=20');
      setEvents(evts);
    } catch (err) {
      // ignore
    }
  }, [isGridOperator]);

  // 2. Initial Setup
  useEffect(() => {
    // Check active session against server truth
    apiRequest<User>('/auth/me')
      .then((u) => {
        setCurrentUser(u);
        setActiveRole(u.role);
      })
      .catch(() => {
        setCurrentUser(null);
        setActiveRole('CITIZEN');
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
        .then(setScenarios)
        .catch(() => []);
    } else {
      setTopology(null);
      setEvents([]);
      setScenarios([]);
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
      alert(`Scenario execution error: ${err.message}`);
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
      alert(`Grid reset error: ${err.message}`);
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
      alert(`Fault injection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await apiRequest('/auth/logout', { method: 'POST' });
    } catch {
      //
    }
    setCurrentUser(null);
    setActiveRole('CITIZEN');
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
              <WorkerDashboard />
            </div>
          )}

          {activeRole === 'CITIZEN' && (
            <CitizenPortal assets={assets} onReportCreated={() => {}} />
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
            setCurrentUser(u);
            setActiveRole(u.role);
            setLoginModalOpen(false);
          }}
          onClose={() => setLoginModalOpen(false)}
        />
      )}
    </>
  );
};
export default App;

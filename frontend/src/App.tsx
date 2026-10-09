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
import { Navbar } from './components/Navbar';
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
  const [activeRole, setActiveRole] = useState<Role>('ADMIN');
  const [topology, setTopology] = useState<GridTopologyData | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  // Detail Drawer state
  const [selectedNode, setSelectedNode] = useState<GridNode | null>(null);

  // Why Modal state
  const [whyType, setWhyType] = useState<WhyModalType>(null);
  const [whyData, setWhyData] = useState<any>(null);

  // Events Feed
  const [events, setEvents] = useState<any[]>([]);

  // 1. Fetch Topology & Baseline Data
  const refreshTopology = useCallback(async () => {
    try {
      const top = await apiRequest<GridTopologyData>('/grid/topology');
      setTopology(top);
    } catch (err) {
      console.error('Topology fetch error:', err);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const evts = await apiRequest<any[]>('/grid/events?limit=20');
      setEvents(evts);
    } catch (err) {
      // ignore
    }
  }, []);

  // 2. Initial Setup
  useEffect(() => {
    // Check active session
    apiRequest<User>('/auth/me')
      .then((u) => {
        setCurrentUser(u);
        setActiveRole(u.role);
      })
      .catch(() => {
        // Fallback default admin view for prototype review
        setActiveRole('ADMIN');
      });

    refreshTopology();
    refreshEvents();

    apiRequest<Scenario[]>('/scenarios')
      .then(setScenarios)
      .catch(() => []);

    apiRequest<InfrastructureAsset[]>('/civic/assets')
      .then(setAssets)
      .catch(() => []);
  }, [refreshTopology, refreshEvents]);

  // 3. Server-Sent Events (SSE) with Fallback Polling
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;

    try {
      eventSource = new EventSource('/api/v1/grid/stream');
      eventSource.addEventListener('grid_event', (e) => {
        refreshTopology();
        refreshEvents();
      });
      eventSource.onerror = () => {
        if (eventSource) eventSource.close();
        // Fallback polling every 3 seconds if SSE connection drops
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
  }, [refreshTopology, refreshEvents]);

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
    <div className="min-h-screen bg-charcoal-950 flex flex-col selection:bg-electric-500 selection:text-white">
      {/* Navigation */}
      <Navbar
        currentUser={currentUser}
        activeRole={activeRole}
        onChangeRole={setActiveRole}
        onLogout={handleLogout}
        onOpenLogin={() => setLoginModalOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Real-Time Grid Health Meter */}
        {topology && (
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
                onSelectNode={setSelectedNode}
                onSelectEdge={(e) => {}}
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
                onSelectNode={setSelectedNode}
                onSelectEdge={(e) => {}}
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
            {topology && (
              <TopologyCanvas
                nodes={topology.nodes}
                edges={topology.edges}
                islands={topology.islands}
                onSelectNode={setSelectedNode}
                onSelectEdge={(e) => {}}
              />
            )}
            <WorkerDashboard />
          </div>
        )}

        {activeRole === 'CITIZEN' && (
          <CitizenPortal assets={assets} onReportCreated={refreshTopology} />
        )}

        {/* Live Grid Event Log Stream */}
        <div className="bg-charcoal-900 border border-charcoal-700/80 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-electric-500/15 text-electric-400">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
                REAL-TIME AUDITED TELEMETRY & EVENT STREAM
              </span>
            </div>
            <button
              onClick={refreshEvents}
              className="text-slate-400 hover:text-slate-200 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {events.slice(0, 8).map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between text-xs font-mono p-2 rounded-lg bg-charcoal-950/70 border border-charcoal-800"
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
                  <span className="text-slate-300">{evt.description}</span>
                </div>
                <span className="text-[10px] text-slate-500 shrink-0 ml-3">
                  {new Date(evt.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Asset Inspection Drawer */}
      <AssetDrawer
        selectedNode={selectedNode}
        onClose={() => setSelectedNode(null)}
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
    </div>
  );
};
export default App;

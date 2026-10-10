import React, { useMemo, useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  BackgroundVariant,
  NodeMouseHandler,
  EdgeMouseHandler,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { SubstationNode } from './nodes/SubstationNode';
import { BusNode } from './nodes/BusNode';
import { DistributionPointNode } from './nodes/DistributionPointNode';
import { LoadNode } from './nodes/LoadNode';
import { GridNode, GridEdge, GridIsland } from '../types';
import { Filter, Layers, Thermometer, AlertTriangle, Maximize2, ChevronDown, ChevronUp } from 'lucide-react';
import { useReports, getNodeSectorReports, hasCriticalComplaintInSector } from '../hooks/useReports';
import { NODE_METADATA_OVERRIDES } from '../data/gridNodes';
import { computeSpreadLayout } from '../utils/spreadLayout';

interface TopologyCanvasProps {
  nodes: GridNode[];
  edges: GridEdge[];
  islands: GridIsland[];
  onSelectNode: (node: GridNode) => void;
  onSelectEdge: (edge: GridEdge) => void;
}

const nodeTypes = {
  substation: SubstationNode,
  bus: BusNode,
  dp: DistributionPointNode,
  load: LoadNode,
};

/** Returns stroke color based on thermal utilization %. */
function thermalColor(utilPct: number): string {
  if (utilPct >= 90) return '#ef4444'; // Critical red  ≥90%
  if (utilPct >= 70) return '#f97316'; // Orange        70-90%
  if (utilPct >= 50) return '#f59e0b'; // Amber         50-70%
  if (utilPct >= 25) return '#38bdf8'; // Electric blue 25-50%
  return '#6366f1';                    // Indigo        <25%  (light load)
}

export const TopologyCanvas: React.FC<TopologyCanvasProps> = ({
  nodes,
  edges,
  islands,
  onSelectNode,
  onSelectEdge,
}) => {
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [filterFaultsOnly, setFilterFaultsOnly] = useState(false);
  const [filterTieOnly, setFilterTieOnly] = useState(false);
  // Legend starts collapsed so it never overlaps the graph
  const [showThermalLegend, setShowThermalLegend] = useState(false);

  // React Flow instance ref — used for programmatic fitView
  const rfRef = useRef<ReactFlowInstance | null>(null);

  // Subscribe to live citizen reports
  const { reports } = useReports();

  // Build a set: node_code → island_id (for coloring isolated nodes)
  const islandedNodes = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    islands.forEach((isl) => {
      isl.nodes.forEach((nc) => m.set(nc, isl.island_id));
    });
    return m;
  }, [islands]);

  // Assign a stable hue to each unique island_id (for boundary color)
  const islandColors = useMemo<Map<string, string>>(() => {
    const m = new Map<string, string>();
    const hues = [270, 45, 175, 320, 15, 200, 140];
    const seen: string[] = [];
    islands.forEach((isl) => {
      if (!m.has(isl.island_id)) {
        const hue = hues[seen.length % hues.length];
        m.set(isl.island_id, `hsl(${hue}, 80%, 55%)`);
        seen.push(isl.island_id);
      }
    });
    return m;
  }, [islands]);

  // ── Spread layout: compute once per nodes array, not on every render ──────
  const spreadPositions = useMemo(() => {
    const rawPoints = nodes.map(n => ({ id: n.node_code, x: n.x, y: n.y }));
    return computeSpreadLayout(rawPoints);
  }, [nodes]);

  // Map backend nodes to React Flow nodes with spread positions
  const flowNodes: Node[] = useMemo(() => {
    return nodes
      .filter((n) => {
        if (filterCriticalOnly && n.criticality < 4) return false;
        if (filterFaultsOnly && n.status !== 'ISOLATED' && n.status !== 'FAULTED') return false;
        return true;
      })
      .map((n) => {
        let type = 'load';
        if (n.node_type === 'SUBSTATION') type = 'substation';
        else if (n.node_type === 'BUS') type = 'bus';
        else if (n.node_type === 'DISTRIBUTION_POINT') type = 'dp';

        const islandId = islandedNodes.get(n.node_code);
        const islandColor = islandId ? islandColors.get(islandId) : undefined;

        // Dynamic Citizen Complaint Binding
        const sectorReports = getNodeSectorReports(reports, n.node_code, n.name);
        const hasCritical = hasCriticalComplaintInSector(reports, n.node_code, n.name);
        const maxSeverity = sectorReports.reduce(
          (max, r) => Math.max(max, Number(r.severity || 1)),
          1
        );

        // Apply Roorkee / COER localized metadata overrides
        const meta = NODE_METADATA_OVERRIDES[n.node_code];
        const displayLabel = meta?.label || n.name;
        const displayCode = meta?.displayCode || n.node_code;
        const displayTag = meta?.tag;
        const displayDescription = meta?.description;

        // Use spread position (falls back to original if not found)
        const pos = spreadPositions.get(n.node_code) ?? { x: n.x, y: n.y };

        return {
          id: n.node_code,
          type,
          position: pos,
          style: islandId
            ? {
                boxShadow: `0 0 0 3px ${islandColor}, 0 0 18px 4px ${islandColor}55`,
                borderRadius: 8,
              }
            : undefined,
          data: {
            label: displayLabel,
            node_code: n.node_code,
            display_code: displayCode,
            tag: displayTag,
            description: displayDescription,
            nominal_voltage_kv: n.nominal_voltage_kv,
            load_mw: n.load_mw,
            criticality: n.criticality,
            status: n.status,
            is_energized: n.is_energized,
            max_capacity_mw: n.max_capacity_mw,
            current_supply_mw: n.current_supply_mw,
            islandColor,
            hasCriticalComplaint: hasCritical,
            complaintCount: sectorReports.length,
            maxSeverity,
            onSelect: () =>
              onSelectNode({
                ...n,
                name: displayLabel,
              }),
          },
        };
      });
  }, [nodes, filterCriticalOnly, filterFaultsOnly, onSelectNode, islandedNodes, islandColors, reports, spreadPositions]);

  // Map backend edges to React Flow edges
  const flowEdges: Edge[] = useMemo(() => {
    return edges
      .filter((e) => {
        if (filterTieOnly && !e.is_tie_switch) return false;
        if (filterFaultsOnly && e.status !== 'FAULTED') return false;
        return true;
      })
      .map((e) => {
        const isFaulted = e.status === 'FAULTED';
        const isTie = e.is_tie_switch;
        const isTieClosed = isTie && e.status === 'OPERATIONAL';
        const isTieOpen = isTie && e.status === 'OPEN';

        // Thermal utilization %
        const utilPct = e.max_capacity_mw > 0
          ? Math.min((e.current_load_mw / e.max_capacity_mw) * 100, 100)
          : 0;

        let strokeColor = thermalColor(utilPct);
        let customClass = '';
        let label = `${utilPct.toFixed(0)}% (${e.current_load_mw.toFixed(1)} MW)`;

        if (isFaulted) {
          strokeColor = '#ef4444';
          customClass = 'edge-pulsing-fault';
          label = '⚡ FAULT / TRIPPED';
        } else if (isTieClosed) {
          strokeColor = '#10b981';
          customClass = 'edge-restored-tie';
          label = `🔌 TIE RESTORED (${e.current_load_mw.toFixed(1)} MW)`;
        } else if (isTieOpen) {
          strokeColor = '#f59e0b';
          customClass = 'edge-open-tie';
          label = '⏵ TIE [OPEN]';
        }

        const strokeWidth = isFaulted ? 4 : isTieClosed ? 3 : utilPct >= 70 ? 3 : 2;

        return {
          id: e.edge_code,
          source: e.src_code || '',
          target: e.dst_code || '',
          animated: isTieClosed || (utilPct >= 90 && !isFaulted),
          className: customClass,
          style: { stroke: strokeColor, strokeWidth },
          label,
          labelStyle: {
            fill: isFaulted ? '#f87171' : isTieClosed ? '#34d399' : utilPct >= 70 ? '#fbbf24' : '#94a3b8',
            fontWeight: 600,
            fontSize: 10,
            fontFamily: 'monospace',
          },
          labelBgStyle: {
            fill: '#0f172a',
            fillOpacity: 0.85,
            stroke: strokeColor,
            strokeWidth: 1,
            rx: 4,
            ry: 4,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: strokeColor,
            width: 12,
            height: 12,
          },
          // Store utilPct for tooltip / edge click
          data: { edge: e, utilPct },
        };
      });
  }, [edges, filterTieOnly, filterFaultsOnly]);

  const handleEdgeClick: EdgeMouseHandler = useCallback(
    (_evt, flowEdge) => {
      const original = edges.find((e) => e.edge_code === flowEdge.id);
      if (original) onSelectEdge(original);
    },
    [edges, onSelectEdge]
  );

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_evt, flowNode) => {
      const original = nodes.find((n) => n.node_code === flowNode.id);
      if (original) onSelectNode(original);
    },
    [nodes, onSelectNode]
  );

  const handleFitView = useCallback(() => {
    rfRef.current?.fitView({ padding: 0.15, duration: 400 });
  }, []);

  return (
    // Increased height: clamp(560px, 75vh, 900px)
    <div
      className="relative w-full bg-charcoal-900 rounded-2xl border border-charcoal-700/80 overflow-hidden shadow-2xl"
      style={{ height: 'clamp(560px, 75vh, 900px)' }}
    >
      {/* Island Boundary Badges */}
      {islands.length > 0 && (
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-none">
          {islands.map((isl) => (
            <div
              key={isl.island_id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold backdrop-blur-md border shadow-lg"
              style={{
                background: `${islandColors.get(isl.island_id)}22`,
                borderColor: islandColors.get(isl.island_id),
                color: islandColors.get(isl.island_id),
              }}
            >
              <AlertTriangle className="w-3 h-3" />
              ISLAND {isl.island_id.toUpperCase()} — {isl.node_count} nodes,{' '}
              {isl.lost_load_mw.toFixed(1)} MW lost
            </div>
          ))}
        </div>
      )}

      {/* Topology Filter Header Overlay */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-charcoal-950/90 backdrop-blur-md p-2 rounded-xl border border-charcoal-700/60 shadow-xl">
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs font-mono text-slate-400 border-r border-charcoal-700">
          <Layers className="w-3.5 h-3.5 text-electric-400" />
          <span>FILTERS</span>
        </div>

        <button
          onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            filterCriticalOnly
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Critical Only (★4-5)
        </button>

        <button
          onClick={() => setFilterFaultsOnly(!filterFaultsOnly)}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            filterFaultsOnly
              ? 'bg-red-500/20 text-red-300 border border-red-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Faulted / Isolated Only
        </button>

        <button
          onClick={() => setFilterTieOnly(!filterTieOnly)}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            filterTieOnly
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          Tie Switches Only
        </button>

        {/* Thermal legend toggle — collapsed by default */}
        <button
          onClick={() => setShowThermalLegend(!showThermalLegend)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
            showThermalLegend
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
          aria-expanded={showThermalLegend}
          aria-label="Toggle thermal legend"
        >
          <Thermometer className="w-3 h-3" />
          Thermal
          {showThermalLegend ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {/* Fit-view button */}
        <button
          onClick={handleFitView}
          title="Fit view to all nodes"
          aria-label="Fit view to all nodes"
          className="px-2.5 py-1 text-xs rounded-lg font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all flex items-center gap-1"
        >
          <Maximize2 className="w-3 h-3" />
          Fit
        </button>
      </div>

      {/* Thermal Load Legend — docked bottom-left, collapsible, never overlaps nodes */}
      {showThermalLegend && (
        <div className="absolute bottom-10 left-3 z-20 flex flex-col gap-1.5 bg-charcoal-950/95 backdrop-blur-md px-3 py-2.5 rounded-xl border border-charcoal-700/60 shadow-xl pointer-events-none">
          <div className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">
            Thermal Utilization
          </div>
          {[
            { color: '#6366f1', label: '< 25% — Light' },
            { color: '#38bdf8', label: '25–50% — Normal' },
            { color: '#f59e0b', label: '50–70% — Moderate' },
            { color: '#f97316', label: '70–90% — High' },
            { color: '#ef4444', label: '≥ 90% — Critical' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
              <div className="w-5 h-1.5 rounded-full" style={{ background: color }} />
              <span>{label}</span>
            </div>
          ))}
          <div className="border-t border-charcoal-700 mt-1 pt-1 flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <div className="w-5 h-1.5 bg-red-500 animate-pulse rounded-full" />
            <span>Faulted Trip</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <div className="w-5 h-0.5 border-t border-dashed border-amber-400" />
            <span>Tie Switch (Open)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
            <div className="w-5 h-1.5 bg-emerald-400 rounded-full" />
            <span>Restored Tie (Closed)</span>
          </div>
        </div>
      )}

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onInit={(instance) => { rfRef.current = instance; }}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={2.5}
        attributionPosition="bottom-right"
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#334155" />
        <Controls className="!bg-charcoal-800 !border-charcoal-700" />
        <MiniMap
          nodeColor={(n) => {
            if (n.type === 'substation') return '#38bdf8';
            if (n.type === 'bus') return '#94a3b8';
            if (n.type === 'dp') return '#f59e0b';
            return '#10b981';
          }}
          maskColor="rgba(7, 10, 17, 0.75)"
          className="!bg-charcoal-900 !border-charcoal-700 !rounded-xl"
          style={{ bottom: 8, right: 8 }}
        />
      </ReactFlow>
    </div>
  );
};

import React, { useMemo, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  MarkerType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { SubstationNode } from './nodes/SubstationNode';
import { BusNode } from './nodes/BusNode';
import { DistributionPointNode } from './nodes/DistributionPointNode';
import { LoadNode } from './nodes/LoadNode';
import { GridNode, GridEdge, GridIsland } from '../types';
import { Filter, Eye, Layers } from 'lucide-react';

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

  // Map backend nodes to React Flow nodes
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

        return {
          id: n.node_code,
          type,
          position: { x: n.x, y: n.y },
          data: {
            label: n.name,
            node_code: n.node_code,
            nominal_voltage_kv: n.nominal_voltage_kv,
            load_mw: n.load_mw,
            criticality: n.criticality,
            status: n.status,
            is_energized: n.is_energized,
            max_capacity_mw: n.max_capacity_mw,
            current_supply_mw: n.current_supply_mw,
            onSelect: () => onSelectNode(n),
          },
        };
      });
  }, [nodes, filterCriticalOnly, filterFaultsOnly, onSelectNode]);

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

        let strokeColor = '#38bdf8'; // Electric blue default
        let customClass = '';
        let label = `${e.current_load_mw.toFixed(1)} MW`;

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

        return {
          id: e.edge_code,
          source: e.src_code || '',
          target: e.dst_code || '',
          animated: isTieClosed,
          className: customClass,
          style: { stroke: strokeColor, strokeWidth: isFaulted || isTieClosed ? 3 : 2 },
          label,
          labelStyle: {
            fill: isFaulted ? '#f87171' : isTieClosed ? '#34d399' : '#94a3b8',
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
        };
      });
  }, [edges, filterTieOnly, filterFaultsOnly]);

  return (
    <div className="relative w-full h-[640px] bg-charcoal-900 rounded-2xl border border-charcoal-700/80 overflow-hidden shadow-2xl">
      {/* Topology Filter & Legend Header Overlay */}
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
      </div>

      {/* Interactive Legend Overlay */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-3 bg-charcoal-950/90 backdrop-blur-md px-3 py-2 rounded-xl border border-charcoal-700/60 shadow-xl text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-electric-400" />
          <span>Energized Line</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-red-500 animate-pulse" />
          <span>Faulted Trip</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t border-dashed border-amber-400" />
          <span>Tie Switch (Open)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-emerald-400" />
          <span>Restored Tie (Closed)</span>
        </div>
      </div>

      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2.0}
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
        />
      </ReactFlow>
    </div>
  );
};

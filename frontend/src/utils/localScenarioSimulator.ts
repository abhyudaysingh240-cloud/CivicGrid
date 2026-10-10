import { GridTopologyData, GridNode, GridEdge, GridState, GridIsland, GridEvent } from '../types';
import { ROORKEE_GRID_NODES } from '../data/gridNodes';

export const INITIAL_EDGES: GridEdge[] = [
  { id: 1, edge_code: 'LINE_SUB_N_BUS_N1', name: '220kV PTCUL to Feeder Bus N1', src_node_id: 1, dst_node_id: 4, src_code: 'SUB_NORTH', dst_code: 'BUS_N1', resistance_ohms: 0.08, reactance_ohms: 0.12, distance_km: 1.2, max_capacity_mw: 25.0, current_load_mw: 8.0, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 2, edge_code: 'LINE_SUB_N_BUS_N2', name: '220kV PTCUL to Feeder Bus N2', src_node_id: 1, dst_node_id: 5, src_code: 'SUB_NORTH', dst_code: 'BUS_N2', resistance_ohms: 0.10, reactance_ohms: 0.14, distance_km: 1.5, max_capacity_mw: 20.0, current_load_mw: 6.5, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 3, edge_code: 'LINE_BUS_N1_DP_N1', name: 'Feeder Bus N1 to DP Vardhmanpuram', src_node_id: 4, dst_node_id: 6, src_code: 'BUS_N1', dst_code: 'DP_N1', resistance_ohms: 0.12, reactance_ohms: 0.18, distance_km: 1.8, max_capacity_mw: 15.0, current_load_mw: 4.9, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 4, edge_code: 'LINE_DP_N1_CITY_HALL', name: 'DP Vardhmanpuram to Nagar Nigam', src_node_id: 6, dst_node_id: 20, src_code: 'DP_N1', dst_code: 'LOAD_CITY_HALL', resistance_ohms: 0.05, reactance_ohms: 0.07, distance_km: 0.6, max_capacity_mw: 6.0, current_load_mw: 2.2, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 5, edge_code: 'LINE_DP_N1_RES1', name: 'DP Vardhmanpuram to Highland Res', src_node_id: 6, dst_node_id: 21, src_code: 'DP_N1', dst_code: 'LOAD_NORTH_RES_1', resistance_ohms: 0.06, reactance_ohms: 0.08, distance_km: 0.8, max_capacity_mw: 6.0, current_load_mw: 2.5, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 6, edge_code: 'LINE_DP_N1_UNIV', name: 'DP Vardhmanpuram to COER Campus', src_node_id: 6, dst_node_id: 14, src_code: 'DP_N1', dst_code: 'LOAD_UNIVERSITY', resistance_ohms: 0.07, reactance_ohms: 0.09, distance_km: 0.9, max_capacity_mw: 5.0, current_load_mw: 2.1, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 7, edge_code: 'LINE_BUS_N2_DP_N2', name: 'Feeder Bus N2 to DP Civil Lines', src_node_id: 5, dst_node_id: 7, src_code: 'BUS_N2', dst_code: 'DP_N2', resistance_ohms: 0.11, reactance_ohms: 0.16, distance_km: 1.6, max_capacity_mw: 16.0, current_load_mw: 7.2, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 8, edge_code: 'LINE_DP_N2_HOSPITAL', name: 'DP Civil Lines to Civil Hospital', src_node_id: 7, dst_node_id: 15, src_code: 'DP_N2', dst_code: 'LOAD_HOSPITAL', resistance_ohms: 0.04, reactance_ohms: 0.06, distance_km: 0.5, max_capacity_mw: 8.0, current_load_mw: 3.8, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 9, edge_code: 'LINE_DP_N2_COMM1', name: 'DP Civil Lines to Vardhmanpuram Comm', src_node_id: 7, dst_node_id: 18, src_code: 'DP_N2', dst_code: 'LOAD_NORTH_COMM_1', resistance_ohms: 0.06, reactance_ohms: 0.08, distance_km: 0.7, max_capacity_mw: 7.0, current_load_mw: 3.1, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 10, edge_code: 'LINE_BUS_N2_TRANSIT', name: 'Bus N2 to Roorkee Junction Transit', src_node_id: 5, dst_node_id: 16, src_code: 'BUS_N2', dst_code: 'LOAD_TRANSIT_SUB', resistance_ohms: 0.06, reactance_ohms: 0.09, distance_km: 0.8, max_capacity_mw: 7.0, current_load_mw: 2.9, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 11, edge_code: 'LINE_SUB_S_BUS_S1', name: '220kV Piran Kaliyar to Bus S1', src_node_id: 2, dst_node_id: 11, src_code: 'SUB_SOUTH', dst_code: 'BUS_S1', resistance_ohms: 0.08, reactance_ohms: 0.11, distance_km: 1.1, max_capacity_mw: 25.0, current_load_mw: 6.8, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 12, edge_code: 'LINE_SUB_S_BUS_S2', name: '220kV Piran Kaliyar to Bus S2', src_node_id: 2, dst_node_id: 12, src_code: 'SUB_SOUTH', dst_code: 'BUS_S2', resistance_ohms: 0.09, reactance_ohms: 0.13, distance_km: 1.3, max_capacity_mw: 22.0, current_load_mw: 7.0, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 13, edge_code: 'LINE_BUS_S1_DP_S1', name: 'Bus S1 to DP Industrial Area', src_node_id: 11, dst_node_id: 8, src_code: 'BUS_S1', dst_code: 'DP_S1', resistance_ohms: 0.10, reactance_ohms: 0.15, distance_km: 1.4, max_capacity_mw: 18.0, current_load_mw: 4.6, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 14, edge_code: 'LINE_DP_S1_WATER', name: 'DP Industrial to Upper Ganga Pumping', src_node_id: 8, dst_node_id: 17, src_code: 'DP_S1', dst_code: 'LOAD_WATER_TREATMENT', resistance_ohms: 0.05, reactance_ohms: 0.07, distance_km: 0.6, max_capacity_mw: 8.0, current_load_mw: 4.2, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 15, edge_code: 'LINE_BUS_S2_DP_S2', name: 'Bus S2 to DP Piran Kaliyar Hub', src_node_id: 12, dst_node_id: 9, src_code: 'BUS_S2', dst_code: 'DP_S2', resistance_ohms: 0.11, reactance_ohms: 0.16, distance_km: 1.5, max_capacity_mw: 16.0, current_load_mw: 4.2, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 16, edge_code: 'LINE_DP_S2_IND1', name: 'DP Piran Kaliyar to Industrial Feeder', src_node_id: 9, dst_node_id: 23, src_code: 'DP_S2', dst_code: 'LOAD_SOUTH_IND_1', resistance_ohms: 0.06, reactance_ohms: 0.08, distance_km: 0.7, max_capacity_mw: 7.0, current_load_mw: 3.9, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 17, edge_code: 'LINE_BUS_S2_RES1', name: 'Bus S2 to Civil Lines Res', src_node_id: 12, dst_node_id: 22, src_code: 'BUS_S2', dst_code: 'LOAD_SOUTH_RES_1', resistance_ohms: 0.07, reactance_ohms: 0.10, distance_km: 0.9, max_capacity_mw: 6.0, current_load_mw: 2.8, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 18, edge_code: 'LINE_SUB_E_BUS_E1', name: '132kV Bhagwanpur to Bus E1', src_node_id: 3, dst_node_id: 13, src_code: 'SUB_EAST', dst_code: 'BUS_E1', resistance_ohms: 0.08, reactance_ohms: 0.12, distance_km: 1.2, max_capacity_mw: 22.0, current_load_mw: 6.5, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 19, edge_code: 'LINE_BUS_E1_DP_E1', name: 'Bus E1 to DP Research Hub', src_node_id: 13, dst_node_id: 10, src_code: 'BUS_E1', dst_code: 'DP_E1', resistance_ohms: 0.09, reactance_ohms: 0.13, distance_km: 1.3, max_capacity_mw: 16.0, current_load_mw: 4.7, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 20, edge_code: 'LINE_DP_E1_TECH', name: 'DP E1 to IIT Roorkee Research Grid', src_node_id: 10, dst_node_id: 19, src_code: 'DP_E1', dst_code: 'LOAD_TECH_CAMPUS', resistance_ohms: 0.04, reactance_ohms: 0.06, distance_km: 0.5, max_capacity_mw: 8.0, current_load_mw: 4.5, is_tie_switch: false, status: 'OPERATIONAL' },
  { id: 21, edge_code: 'LINE_BUS_E1_RES1', name: 'Bus E1 to Ganga Riverside Res', src_node_id: 13, dst_node_id: 24, src_code: 'BUS_E1', dst_code: 'LOAD_EAST_RES_1', resistance_ohms: 0.06, reactance_ohms: 0.08, distance_km: 0.8, max_capacity_mw: 5.0, current_load_mw: 1.8, is_tie_switch: false, status: 'OPERATIONAL' },
  // Tie switches:
  { id: 22, edge_code: 'TIE_N1_S1', name: 'Tie Switch North-South (Vardhmanpuram <-> Industrial Area)', src_node_id: 6, dst_node_id: 8, src_code: 'DP_N1', dst_code: 'DP_S1', resistance_ohms: 0.14, reactance_ohms: 0.20, distance_km: 2.0, max_capacity_mw: 14.0, current_load_mw: 0.0, is_tie_switch: true, status: 'OPEN' },
  { id: 23, edge_code: 'TIE_N2_E1', name: 'Tie Switch North-East (Civil Lines <-> Bhagwanpur Tech)', src_node_id: 7, dst_node_id: 10, src_code: 'DP_N2', dst_code: 'DP_E1', resistance_ohms: 0.15, reactance_ohms: 0.22, distance_km: 2.2, max_capacity_mw: 12.0, current_load_mw: 0.0, is_tie_switch: true, status: 'OPEN' },
  { id: 24, edge_code: 'TIE_S2_E1', name: 'Tie Switch South-East Link (DP_S2 <-> DP_E1)', src_node_id: 9, dst_node_id: 10, src_code: 'DP_S2', dst_code: 'DP_E1', resistance_ohms: 0.16, reactance_ohms: 0.24, distance_km: 2.4, max_capacity_mw: 10.0, current_load_mw: 0.0, is_tie_switch: true, status: 'OPEN' },
  { id: 25, edge_code: 'TIE_N2_S2_BOTTLENECK', name: 'Tie Switch Limited Feeder (LOAD_NORTH_COMM_1 <-> DP_S2)', src_node_id: 18, dst_node_id: 9, src_code: 'LOAD_NORTH_COMM_1', dst_code: 'DP_S2', resistance_ohms: 0.28, reactance_ohms: 0.35, distance_km: 3.2, max_capacity_mw: 2.5, current_load_mw: 0.0, is_tie_switch: true, status: 'OPEN' }
];

export function runLocalScenarioSimulation(
  code: string,
  currentTopology: GridTopologyData | null
): { topology: GridTopologyData; event: GridEvent } {
  const baseNodes: GridNode[] = (currentTopology?.nodes && currentTopology.nodes.length > 0)
    ? currentTopology.nodes.map(n => ({ ...n }))
    : ROORKEE_GRID_NODES.map(n => ({ ...n }));

  const baseEdges: GridEdge[] = (currentTopology?.edges && currentTopology.edges.length > 0)
    ? currentTopology.edges.map(e => ({ ...e }))
    : INITIAL_EDGES.map(e => ({ ...e }));

  const now = new Date().toISOString();
  const c = code.toUpperCase();

  if (c === 'A') {
    // Reset to healthy nominal baseline
    const nodes = baseNodes.map(n => ({ ...n, status: 'OPERATIONAL' as const, is_energized: true }));
    const edges = baseEdges.map(e => ({
      ...e,
      status: e.is_tie_switch ? ('OPEN' as const) : ('OPERATIONAL' as const),
      current_load_mw: e.is_tie_switch ? 0.0 : (INITIAL_EDGES.find(x => x.edge_code === e.edge_code)?.current_load_mw || e.current_load_mw)
    }));

    const state: GridState = {
      id: Date.now(),
      timestamp: now,
      state_enum: 'NORMAL',
      total_load_mw: 27.6,
      affected_load_mw: 0.0,
      restored_load_mw: 0.0,
      unserved_load_mw: 0.0,
      restoration_pct: null,
      restoration_status: 'NO_ACTIVE_FAULT',
      details_json: { message: '220kV PTCUL Roorkee Substation operating nominal. All radial feeders energized, all tie switches open.' }
    };

    const event: GridEvent = {
      id: Date.now(),
      timestamp: now,
      event_type: 'SCENARIO_BASELINE',
      severity: 'INFO',
      description: 'Scenario A: Baseline Healthy Grid - 220kV PTCUL Roorkee Substation Nominal (0 Faults, 100% Online)',
    };

    return { topology: { state, nodes, edges, islands: [], total_load_mw: 27.6 }, event };
  }

  if (c === 'B') {
    // Line Fault: Piran Kaliyar -> COER Feeder Isolated & Restored via TIE_N1_S1
    const edges = baseEdges.map(e => {
      if (e.edge_code === 'LINE_BUS_N1_DP_N1') {
        return { ...e, status: 'FAULTED' as const, current_load_mw: 0.0 };
      }
      if (e.edge_code === 'TIE_N1_S1') {
        return { ...e, status: 'OPERATIONAL' as const, current_load_mw: 4.9 };
      }
      return { ...e };
    });

    const nodes = baseNodes.map(n => ({
      ...n,
      status: 'OPERATIONAL' as const,
      is_energized: true
    }));

    const state: GridState = {
      id: Date.now(),
      timestamp: now,
      state_enum: 'RESTORED',
      total_load_mw: 27.6,
      affected_load_mw: 4.9,
      restored_load_mw: 4.9,
      unserved_load_mw: 0.0,
      restoration_pct: 100.0,
      restoration_status: 'FULL',
      details_json: {
        faulted_edge: 'LINE_BUS_N1_DP_N1',
        closed_tie: 'TIE_N1_S1',
        message: 'Fault isolated on LINE_BUS_N1_DP_N1. 100% load restored to COER University Campus via tie switch TIE_N1_S1.'
      }
    };

    const event: GridEvent = {
      id: Date.now(),
      timestamp: now,
      event_type: 'SCENARIO_RESTORED',
      severity: 'CRITICAL',
      description: 'Scenario B: Line Fault LINE_BUS_N1_DP_N1 Isolated. Auto-restored 4.9 MW to COER University Campus via TIE_N1_S1.',
    };

    return { topology: { state, nodes, edges, islands: [], total_load_mw: 27.6 }, event };
  }

  if (c === 'C') {
    // Capacity Overload: Industrial Area & Ganga Pumping Station
    const edges = baseEdges.map(e => {
      if (e.edge_code === 'LINE_BUS_N2_DP_N2') {
        return { ...e, status: 'FAULTED' as const, current_load_mw: 0.0 };
      }
      if (e.edge_code === 'TIE_N2_E1') {
        return { ...e, status: 'UNAVAILABLE' as const, current_load_mw: 0.0 };
      }
      if (e.edge_code === 'TIE_N2_S2_BOTTLENECK') {
        return { ...e, status: 'OPERATIONAL' as const, current_load_mw: 2.5 };
      }
      return { ...e };
    });

    const nodes = baseNodes.map(n => {
      if (n.node_code === 'LOAD_NORTH_COMM_1') {
        return { ...n, status: 'ISOLATED' as const, is_energized: false };
      }
      return { ...n };
    });

    const state: GridState = {
      id: Date.now(),
      timestamp: now,
      state_enum: 'RECONFIGURATION_FAILED',
      total_load_mw: 27.6,
      affected_load_mw: 7.2,
      restored_load_mw: 2.5,
      unserved_load_mw: 4.7,
      restoration_pct: 34.7,
      restoration_status: 'PARTIAL',
      details_json: {
        faulted_edge: 'LINE_BUS_N2_DP_N2',
        bottleneck_tie: 'TIE_N2_S2_BOTTLENECK',
        message: 'Bottleneck capacity 2.5 MW exceeded by 7.2 MW demand. Civil Hospital prioritized; commercial loads shed.'
      }
    };

    const event: GridEvent = {
      id: Date.now(),
      timestamp: now,
      event_type: 'SCENARIO_OVERLOAD',
      severity: 'WARNING',
      description: 'Scenario C: Capacity Overload on Feeder N2. Civil Hospital prioritized; 4.7 MW commercial unserved load accounted.',
    };

    return { topology: { state, nodes, edges, islands: [], total_load_mw: 27.6 }, event };
  }

  if (c === 'D') {
    // Multi-Incident Emergency: Roorkee North Sector Outage
    const edges = baseEdges.map(e => {
      if (e.edge_code === 'LINE_SUB_N_BUS_N1') {
        return { ...e, status: 'FAULTED' as const, current_load_mw: 0.0 };
      }
      if (e.edge_code === 'TIE_N1_S1') {
        return { ...e, status: 'OPERATIONAL' as const, current_load_mw: 8.0 };
      }
      return { ...e };
    });

    const nodes = baseNodes.map(n => ({
      ...n,
      status: 'OPERATIONAL' as const,
      is_energized: true
    }));

    const state: GridState = {
      id: Date.now(),
      timestamp: now,
      state_enum: 'ISLANDED',
      total_load_mw: 27.6,
      affected_load_mw: 14.5,
      restored_load_mw: 10.0,
      unserved_load_mw: 4.5,
      restoration_pct: 69.0,
      restoration_status: 'PARTIAL',
      details_json: {
        faulted_edge: 'LINE_SUB_N_BUS_N1',
        message: 'Severe storm event tripped line at 220kV PTCUL Substation. Elevated emergency dispatch sent to field workers.'
      }
    };

    const islands: GridIsland[] = [
      {
        island_id: 'isld-north-1',
        nodes: ['BUS_N1', 'DP_N1', 'LOAD_UNIVERSITY', 'LOAD_NORTH_RES_1', 'LOAD_CITY_HALL'],
        node_count: 5,
        lost_load_mw: 4.5,
        critical_nodes: ['LOAD_UNIVERSITY'],
        critical_count: 1,
        boundary_tie_edges: ['TIE_N1_S1'],
        restorable: true
      }
    ];

    const event: GridEvent = {
      id: Date.now(),
      timestamp: now,
      event_type: 'SCENARIO_MULTI_INCIDENT',
      severity: 'CRITICAL',
      description: 'Scenario D: Multi-Incident Emergency in Roorkee North Sector. Restored via South tie + Elevated civic emergency.',
    };

    return { topology: { state, nodes, edges, islands, total_load_mw: 27.6 }, event };
  }

  // Scenario E: Cascading Line Trip After Reconfiguration
  const edges = baseEdges.map(e => {
    if (e.edge_code === 'LINE_BUS_N1_DP_N1' || e.edge_code === 'LINE_SUB_S_BUS_S1') {
      return { ...e, status: 'FAULTED' as const, current_load_mw: 0.0 };
    }
    if (e.edge_code === 'TIE_N1_S1') {
      return { ...e, status: 'OPERATIONAL' as const, current_load_mw: 0.0 };
    }
    return { ...e };
  });

  const nodes = baseNodes.map(n => {
    if (['DP_N1', 'LOAD_UNIVERSITY', 'LOAD_NORTH_RES_1', 'LOAD_CITY_HALL', 'DP_S1', 'LOAD_WATER_TREATMENT'].includes(n.node_code)) {
      return { ...n, status: 'ISOLATED' as const, is_energized: false };
    }
    return { ...n };
  });

  const state: GridState = {
    id: Date.now(),
    timestamp: now,
    state_enum: 'ISLANDED',
    total_load_mw: 27.6,
    affected_load_mw: 11.7,
    restored_load_mw: 0.0,
    unserved_load_mw: 11.7,
    restoration_pct: 0.0,
    restoration_status: 'FAILED',
    details_json: {
      message: 'Cascading trunk trip isolated South-North corridor. Secondary island active; operator intervention required.'
    }
  };

  const islands: GridIsland[] = [
    {
      island_id: 'isld-cascade-1',
      nodes: ['DP_N1', 'LOAD_UNIVERSITY', 'LOAD_NORTH_RES_1', 'LOAD_CITY_HALL', 'DP_S1', 'LOAD_WATER_TREATMENT'],
      node_count: 6,
      lost_load_mw: 11.7,
      critical_nodes: ['LOAD_UNIVERSITY', 'LOAD_WATER_TREATMENT'],
      critical_count: 2,
      boundary_tie_edges: ['TIE_N2_E1', 'TIE_S2_E1'],
      restorable: false
    }
  ];

  const event: GridEvent = {
    id: Date.now(),
    timestamp: now,
    event_type: 'SCENARIO_CASCADE',
    severity: 'CRITICAL',
    description: 'Scenario E: Cascading Line Trip across Bhagwanpur Interconnect. Secondary island formed; operator intervention required.',
  };

  return { topology: { state, nodes, edges, islands, total_load_mw: 27.6 }, event };
}

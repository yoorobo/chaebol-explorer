import type { ShareNode, ShareEdge } from "./types";

export interface CycleResult {
  cycleId: string;
  nodeIds: string[];
  edgeIds: string[];
  cycle_strength: number;
  min_edge_percentage: number;
}

// ShareEdge uses `weight` for ownership/voting percentage (not votingRights)
function getVotingRights(edge: ShareEdge): number {
  const value = Number(edge.weight);
  return Number.isFinite(value) ? value : 0;
}

function getEdgeSource(edge: ShareEdge): string {
  return edge.source;
}

function getEdgeTarget(edge: ShareEdge): string {
  return edge.target;
}

/**
 * Manual test case:
 * A -> B (40), B -> C (30), C -> A (20)
 * Expected:
 * cycle_strength = (40 + 30 + 20) / 3 = 30
 * min_edge_percentage = 20
 */
export function detectCycles(
  nodes: ShareNode[],
  edges: ShareEdge[]
): CycleResult[] {
  type AdjEntry = { target: string; edgeId: string; weight: number };
  const adj = new Map<string, AdjEntry[]>();

  nodes.forEach((n) => adj.set(n.id, []));

  edges.forEach((edge, index) => {
    const src = getEdgeSource(edge);
    const tgt = getEdgeTarget(edge);
    const eid = `${src}->${tgt}:${index}`;
    const w = getVotingRights(edge);
    if (!adj.has(src)) adj.set(src, []);
    adj.get(src)!.push({ target: tgt, edgeId: eid, weight: w });
  });

  const globalVisited = new Set<string>();
  const cycles: CycleResult[] = [];
  const seenCycleKeys = new Set<string>();

  type PathEntry = { nodeId: string; edgeId: string; weight: number };

  // pathEntries[i].edgeId = edge used to arrive at pathEntries[i].nodeId
  // pathEntries[0].edgeId is empty (start node has no incoming edge)
  function dfs(
    current: string,
    pathEntries: PathEntry[],
    inStack: Set<string>
  ): void {
    for (const { target, edgeId, weight } of adj.get(current) ?? []) {
      if (inStack.has(target)) {
        const cycleStartIdx = pathEntries.findIndex((e) => e.nodeId === target);
        if (cycleStartIdx === -1) continue;

        const cycleNodeIds = pathEntries.slice(cycleStartIdx).map((e) => e.nodeId);
        // Edges within the cycle: entries after start carry the arriving edges, plus back-edge
        const internalEdges = pathEntries.slice(cycleStartIdx + 1);
        const cycleEdgeIds = [...internalEdges.map((e) => e.edgeId), edgeId];
        const cycleWeights = [...internalEdges.map((e) => e.weight), weight];

        const canonicalKey = [...cycleNodeIds].sort().join("|");
        if (!seenCycleKeys.has(canonicalKey)) {
          seenCycleKeys.add(canonicalKey);
          const totalWeight = cycleWeights.reduce((a, b) => a + b, 0);
          cycles.push({
            cycleId: `cycle-${cycles.length + 1}`,
            nodeIds: cycleNodeIds,
            edgeIds: cycleEdgeIds,
            cycle_strength: cycleEdgeIds.length > 0 ? totalWeight / cycleEdgeIds.length : 0,
            min_edge_percentage: cycleWeights.length > 0 ? Math.min(...cycleWeights) : 0,
          });
        }
        continue;
      }

      if (!globalVisited.has(target)) {
        inStack.add(target);
        pathEntries.push({ nodeId: target, edgeId, weight });
        dfs(target, pathEntries, inStack);
        pathEntries.pop();
        inStack.delete(target);
      }
    }

    globalVisited.add(current);
  }

  for (const nodeId of adj.keys()) {
    if (!globalVisited.has(nodeId)) {
      const inStack = new Set<string>([nodeId]);
      dfs(nodeId, [{ nodeId, edgeId: "", weight: 0 }], inStack);
      globalVisited.add(nodeId);
    }
  }

  return cycles;
}

export function annotateCycleEdges<T extends ShareEdge>(
  edges: T[],
  cycles: CycleResult[]
): Array<T & { isCycle: boolean; cycleIds: string[] }> {
  const edgeCycleMap = new Map<string, string[]>();

  cycles.forEach((cycle) => {
    cycle.edgeIds.forEach((eid) => {
      const existing = edgeCycleMap.get(eid) ?? [];
      existing.push(cycle.cycleId);
      edgeCycleMap.set(eid, existing);
    });
  });

  return edges.map((edge, index) => {
    const eid = `${getEdgeSource(edge)}->${getEdgeTarget(edge)}:${index}`;
    const detectedCycleIds = edgeCycleMap.get(eid);

    // Also treat edges explicitly tagged 'circular_loop' in the source data as cycle edges
    const isTaggedCircular = edge.type === "circular_loop";

    if ((detectedCycleIds && detectedCycleIds.length > 0) || isTaggedCircular) {
      return { ...edge, isCycle: true, cycleIds: detectedCycleIds ?? [] };
    }
    return { ...edge, isCycle: false, cycleIds: [] };
  });
}

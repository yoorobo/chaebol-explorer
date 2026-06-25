import type { ShareNode, ShareEdge } from "./types";
import { annotateCycleEdges, detectCycles, type CycleResult } from "./cycleDetector";

export interface G6GraphNode {
  id: string;
  data: {
    original: ShareNode;
    label: string;
    name_ko: string;
    name_en?: string;
    ticker?: string;
    corp_code?: string;
    nodeType?: string;
    asOfDate?: string;
    sourceType?: string;
  };
}

export interface G6GraphEdge {
  id: string;
  source: string;
  target: string;
  data: {
    original: ShareEdge;
    votingRights: number;
    isCycle: boolean;
    cycleIds: string[];
    asOfDate?: string;
    sourceType?: string;
  };
}

export interface G6GraphData {
  nodes: G6GraphNode[];
  edges: G6GraphEdge[];
  cycles: CycleResult[];
}

// ShareEdge uses `weight` for ownership percentage (no dedicated votingRights field)
function getVotingRights(edge: ShareEdge): number {
  const value = Number(edge.weight);
  return Number.isFinite(value) ? value : 0;
}

export function adaptShareGraphToG6(
  nodes: ShareNode[],
  edges: ShareEdge[]
): G6GraphData {
  const cycles = detectCycles(nodes, edges);
  const annotatedEdges = annotateCycleEdges(edges, cycles);

  const g6Nodes: G6GraphNode[] = nodes.map((node) => ({
    id: node.id,
    data: {
      original: node,
      // name_ko/name_en/corp_code not in ShareNode — using label as fallback
      label: node.label ?? node.id,
      name_ko: node.label ?? node.id,
      name_en: undefined,
      ticker: node.ticker,
      corp_code: undefined,
      nodeType: node.type,
      asOfDate: "2026-05-23",
      sourceType: "static",
    },
  }));

  const g6Edges: G6GraphEdge[] = annotatedEdges.map((edge, index) => ({
    id: `${edge.source}->${edge.target}:${index}`,
    source: edge.source,
    target: edge.target,
    data: {
      original: edge,
      votingRights: getVotingRights(edge),
      isCycle: edge.isCycle,
      cycleIds: edge.cycleIds,
      asOfDate: "2026-05-23",
      sourceType: "static",
    },
  }));

  return { nodes: g6Nodes, edges: g6Edges, cycles };
}

export function adaptToG6(staticData: {
  nodes: ShareNode[];
  edges: ShareEdge[];
}): G6GraphData {
  return adaptShareGraphToG6(staticData.nodes, staticData.edges);
}

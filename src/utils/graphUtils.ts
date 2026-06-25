import type { ShareNode, ShareEdge, WedgeData, WedgePath, SankeyData } from "./types";

export function detectCircularLoops(edges: ShareEdge[]): Set<string> {
  const circularEdgeIds = new Set<string>();
  edges.forEach((e) => {
    if (e.type === "circular_loop") {
      circularEdgeIds.add(`${e.source}-${e.target}`);
    }
  });
  return circularEdgeIds;
}

export function formatAsset(asset: number): string {
  if (asset === 0) return "-";
  const trillion = asset / 1_000_000_000_000;
  if (trillion >= 1) return `${trillion.toFixed(0)}조 원`;
  const billion = asset / 100_000_000;
  return `${billion.toFixed(0)}억 원`;
}

export function getNodeRadius(asset: number): number {
  if (asset === 0) return 52;
  const base = Math.log10(asset / 1_000_000_000_000 + 1) * 52 + 40;
  return Math.min(Math.max(base, 40), 100);
}

export function computeWedge(
  targetId: string,
  nodes: ShareNode[],
  edges: ShareEdge[]
): WedgeData {
  const paths: WedgePath[] = [];
  let directOwnership = 0;
  let totalVotingPower = 0;

  edges.forEach((e) => {
    if (e.target === targetId) {
      const sourceNode = nodes.find((n) => n.id === e.source);
      if (!sourceNode) return;

      if (e.source === "owner") {
        directOwnership += e.weight;
        totalVotingPower += e.weight;
        paths.push({
          id: `path-${e.source}-${targetId}`,
          label: "총수 직접 지분",
          value: e.weight,
          type: "direct",
        });
      } else if (e.type === "foundation_ownership") {
        totalVotingPower += e.weight;
        paths.push({
          id: `path-${e.source}-${targetId}`,
          label: `${sourceNode.label} (공익재단)`,
          value: e.weight,
          type: "foundation",
        });
      } else {
        totalVotingPower += e.weight;
        paths.push({
          id: `path-${e.source}-${targetId}`,
          label: `${sourceNode.label} 보유 지분`,
          value: e.weight,
          type: "indirect",
        });
      }
    }
  });

  const indirectOwnership = totalVotingPower - directOwnership;

  return {
    targetId,
    directOwnership,
    indirectOwnership,
    totalVotingPower,
    paths,
  };
}

export function buildSankeyData(
  targetId: string,
  nodes: ShareNode[],
  edges: ShareEdge[]
): SankeyData {
  const relevantEdges = edges.filter(
    (e) => e.target === targetId && e.source !== targetId
  );

  const nodeIds = new Set<string>();
  nodeIds.add("owner");
  relevantEdges.forEach((e) => {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  });

  const nodeList = Array.from(nodeIds);
  const nodeMap = new Map<string, number>();
  nodeList.forEach((id, i) => nodeMap.set(id, i));

  const sankeyNodes = nodeList.map((id) => {
    const node = nodes.find((n) => n.id === id);
    return { name: node ? node.label : id };
  });

  const links = relevantEdges.map((e) => ({
    source: nodeMap.get(e.source)!,
    target: nodeMap.get(e.target)!,
    value: e.weight,
  }));

  // Add intermediate flows from owner through holding companies
  edges.forEach((e) => {
    if (
      e.source === "owner" &&
      e.target !== targetId &&
      nodeIds.has(e.target)
    ) {
      const srcIdx = nodeMap.get("owner")!;
      const tgtIdx = nodeMap.get(e.target);
      if (tgtIdx !== undefined) {
        // avoid duplicates
        const exists = links.find(
          (l) => l.source === srcIdx && l.target === tgtIdx
        );
        if (!exists) {
          links.push({ source: srcIdx, target: tgtIdx, value: e.weight });
        }
      }
    }
  });

  return { nodes: sankeyNodes, links };
}

export interface VotingRightsEdge {
  sourceId: string;
  targetId: string;
  votingRights: number;
  isCycle?: boolean;
  cycleIds?: string[];
}

export interface VotingRightsPreviewOptions {
  threshold?: number;
  maxDepth?: number;
  applyLegalCaps?: boolean;
}

export interface VotingRightsPath {
  nodeIds: string[];
  edgeIds: string[];
  weakestLink: number;
}

export interface VotingRightsPreviewResult {
  controllerId: string;
  targetId: string;
  votingRights: number;
  paths: VotingRightsPath[];
  cappedAtOne: boolean;
  warnings: string[];
}

function normalizeOwnership(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

export function normalizeThreshold(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

export function computeVotingRightsPreview(input: {
  controllerId: string;
  targetId: string;
  edges: VotingRightsEdge[];
  options?: VotingRightsPreviewOptions;
}): VotingRightsPreviewResult {
  const { controllerId, targetId, edges } = input;
  const threshold = normalizeThreshold(input.options?.threshold ?? 0);
  const maxDepth = input.options?.maxDepth ?? 6;
  const applyLegalCaps = input.options?.applyLegalCaps ?? false;
  const warnings: string[] = [];

  if (applyLegalCaps) {
    warnings.push(
      "Legal caps are not automatically applied in M2 preview because formation timing and agenda data are unavailable."
    );
  }

  const filteredEdges = edges
    .map((edge, idx) => ({
      ...edge,
      _edgeId: `${edge.sourceId}->${edge.targetId}:${idx}`,
      _vr: normalizeOwnership(edge.votingRights),
    }))
    .filter((edge) => edge._vr >= threshold);

  const adjacency = new Map<string, typeof filteredEdges>();
  for (const edge of filteredEdges) {
    if (edge.isCycle) {
      warnings.push(
        "Cycle edges are included in M2 preview; circular voting restrictions are not auto-deducted."
      );
      break;
    }
  }

  for (const edge of filteredEdges) {
    const arr = adjacency.get(edge.sourceId) ?? [];
    arr.push(edge);
    adjacency.set(edge.sourceId, arr);
  }

  const paths: VotingRightsPath[] = [];
  const seenPathKeys = new Set<string>();

  function dfs(
    current: string,
    nodePath: string[],
    edgePath: string[],
    weakestLink: number,
    depth: number
  ): void {
    if (depth > maxDepth) return;
    if (current === targetId) {
      const key = edgePath.join("|");
      if (!seenPathKeys.has(key)) {
        seenPathKeys.add(key);
        paths.push({
          nodeIds: [...nodePath],
          edgeIds: [...edgePath],
          weakestLink,
        });
      }
      return;
    }

    const candidates = adjacency.get(current) ?? [];
    for (const edge of candidates) {
      if (nodePath.includes(edge.targetId)) continue;
      const nextWeakest = Math.min(weakestLink, edge._vr);
      dfs(
        edge.targetId,
        [...nodePath, edge.targetId],
        [...edgePath, edge._edgeId],
        nextWeakest,
        depth + 1
      );
    }
  }

  dfs(controllerId, [controllerId], [], 1, 0);

  const aggregate = paths.reduce((sum, p) => sum + p.weakestLink, 0);
  const cappedAtOne = aggregate > 1;

  return {
    controllerId,
    targetId,
    votingRights: Math.min(1, aggregate),
    paths,
    cappedAtOne,
    warnings,
  };
}

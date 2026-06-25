import type { VotingRightsInput, VotingRightsResult } from "./types";

function norm(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return v > 1 ? v / 100 : v;
}

export function computeVotingRights(input: VotingRightsInput): VotingRightsResult {
  const threshold = norm(input.threshold ?? 0);
  const maxDepth = input.maxDepth ?? 6;
  const warnings: string[] = [];

  if (input.applyCircularRestriction) {
    warnings.push("Circular restriction is disabled by default in M3 without formation timing evidence.");
  }

  const edges = input.edges
    .map((e) => ({ ...e, _vr: norm(e.votingRights) }))
    .filter((e) => e._vr >= threshold);

  if (edges.some((e) => e.isCycle)) {
    warnings.push("Cycle edges are included. This model is not legal advice.");
  }

  const bySource = new Map<string, typeof edges>();
  for (const e of edges) {
    const arr = bySource.get(e.sourceId) ?? [];
    arr.push(e);
    bySource.set(e.sourceId, arr);
  }

  const paths: VotingRightsResult["paths"] = [];

  function dfs(current: string, nodePath: string[], edgePath: string[], weakest: number, depth: number): void {
    if (depth > maxDepth) return;
    if (current === input.targetId) {
      paths.push({ nodeIds: [...nodePath], edgeIds: [...edgePath], weakestLink: weakest });
      return;
    }
    const next = bySource.get(current) ?? [];
    for (const e of next) {
      if (nodePath.includes(e.targetId)) continue;
      dfs(e.targetId, [...nodePath, e.targetId], [...edgePath, e.edgeId], Math.min(weakest, e._vr), depth + 1);
    }
  }

  dfs(input.controllerId, [input.controllerId], [], 1, 0);

  const total = paths.reduce((sum, p) => sum + p.weakestLink, 0);
  return { votingRights: Math.min(1, total), paths, warnings };
}

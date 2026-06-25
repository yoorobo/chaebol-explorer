export interface OwnershipMatrixEdge {
  sourceId: string;
  targetId: string;
  cashFlowRights: number;
}

export interface OwnershipMatrixResult {
  ok: true;
  nodeIds: string[];
  matrix: number[][];
  integratedCfr: Record<string, Record<string, number>>;
  unit: "ratio";
  runtimeMs: number;
}

export interface OwnershipMatrixError {
  ok: false;
  error: "TOO_MANY_NODES" | "SINGULAR_MATRIX" | "INVALID_INPUT";
  message: string;
  runtimeMs?: number;
}

export type OwnershipMatrixPreviewResult =
  | OwnershipMatrixResult
  | OwnershipMatrixError;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function normalizeOwnership(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

function makeIdentity(size: number): number[][] {
  return Array.from({ length: size }, (_, i) =>
    Array.from({ length: size }, (_, j) => (i === j ? 1 : 0))
  );
}

function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const m = b[0]?.length ?? 0;
  const inner = b.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < inner; k += 1) {
      if (a[i][k] === 0) continue;
      for (let j = 0; j < m; j += 1) {
        out[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return out;
}

function invertMatrix(input: number[][]): number[][] | null {
  const n = input.length;
  const a = input.map((row) => [...row]);
  const inv = makeIdentity(n);
  const eps = 1e-12;

  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) {
      if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    }
    if (Math.abs(a[pivot][col]) < eps) return null;
    if (pivot !== col) {
      [a[col], a[pivot]] = [a[pivot], a[col]];
      [inv[col], inv[pivot]] = [inv[pivot], inv[col]];
    }

    const div = a[col][col];
    for (let j = 0; j < n; j += 1) {
      a[col][j] /= div;
      inv[col][j] /= div;
    }

    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = a[r][col];
      if (Math.abs(factor) < eps) continue;
      for (let j = 0; j < n; j += 1) {
        a[r][j] -= factor * a[col][j];
        inv[r][j] -= factor * inv[col][j];
      }
    }
  }

  return inv;
}

export function computeIntegratedCfrPreview(input: {
  nodeIds: string[];
  edges: OwnershipMatrixEdge[];
  maxNodes?: number;
}): OwnershipMatrixPreviewResult {
  const startedAt = nowMs();
  const { nodeIds, edges } = input;
  const maxNodes = input.maxNodes ?? 50;

  if (!Array.isArray(nodeIds) || nodeIds.length === 0 || !Array.isArray(edges)) {
    return {
      ok: false,
      error: "INVALID_INPUT",
      message: "nodeIds and edges are required.",
      runtimeMs: nowMs() - startedAt,
    };
  }
  if (nodeIds.length > maxNodes) {
    return {
      ok: false,
      error: "TOO_MANY_NODES",
      message: `Matrix preview supports up to ${maxNodes} nodes.`,
      runtimeMs: nowMs() - startedAt,
    };
  }

  const n = nodeIds.length;
  const idToIndex = new Map<string, number>();
  nodeIds.forEach((id, idx) => idToIndex.set(id, idx));

  const a = Array.from({ length: n }, () => Array(n).fill(0));

  for (const edge of edges) {
    const s = idToIndex.get(edge.sourceId);
    const t = idToIndex.get(edge.targetId);
    if (s === undefined || t === undefined) continue;
    const normalized = normalizeOwnership(edge.cashFlowRights);
    if (normalized < 0) {
      return {
        ok: false,
        error: "INVALID_INPUT",
        message: "cashFlowRights cannot be negative.",
        runtimeMs: nowMs() - startedAt,
      };
    }
    a[s][t] += normalized;
  }

  const iMinusA = makeIdentity(n).map((row, r) =>
    row.map((v, c) => v - a[r][c])
  );
  const inv = invertMatrix(iMinusA);
  if (!inv) {
    return {
      ok: false,
      error: "SINGULAR_MATRIX",
      message: "Failed to invert (I - A). Matrix is singular.",
      runtimeMs: nowMs() - startedAt,
    };
  }

  const y = multiplyMatrices(a, inv);
  const integratedCfr: Record<string, Record<string, number>> = {};
  for (let r = 0; r < n; r += 1) {
    const rowObj: Record<string, number> = {};
    for (let c = 0; c < n; c += 1) rowObj[nodeIds[c]] = y[r][c];
    integratedCfr[nodeIds[r]] = rowObj;
  }

  return {
    ok: true,
    nodeIds: [...nodeIds],
    matrix: y,
    integratedCfr,
    unit: "ratio",
    runtimeMs: nowMs() - startedAt,
  };
}

export function runOwnershipMatrixPreviewSelfTest(): boolean {
  const result = computeIntegratedCfrPreview({
    nodeIds: ["A", "B", "C"],
    edges: [
      { sourceId: "A", targetId: "B", cashFlowRights: 0.4 },
      { sourceId: "B", targetId: "C", cashFlowRights: 0.3 },
    ],
  });
  if (!result.ok) return false;
  return Math.abs(result.integratedCfr.A.C - 0.12) < 1e-9;
}

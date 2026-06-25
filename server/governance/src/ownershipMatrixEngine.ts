import type { IntegratedCfrResult, OwnershipMatrixInput } from "./types";

function norm(v: number): number {
  if (!Number.isFinite(v)) return NaN;
  return v > 1 ? v / 100 : v;
}

function identity(n: number): number[][] {
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );
}

function mul(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  const m = b[0]?.length ?? 0;
  const kMax = b.length;
  const out = Array.from({ length: n }, () => Array(m).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let k = 0; k < kMax; k += 1) {
      if (a[i][k] === 0) continue;
      for (let j = 0; j < m; j += 1) out[i][j] += a[i][k] * b[k][j];
    }
  }
  return out;
}

function invert(aIn: number[][]): number[][] | null {
  const n = aIn.length;
  const a = aIn.map((r) => [...r]);
  const inv = identity(n);
  const eps = 1e-12;

  for (let c = 0; c < n; c += 1) {
    let p = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
    if (Math.abs(a[p][c]) < eps) return null;
    if (p !== c) {
      [a[c], a[p]] = [a[p], a[c]];
      [inv[c], inv[p]] = [inv[p], inv[c]];
    }
    const d = a[c][c];
    for (let j = 0; j < n; j += 1) {
      a[c][j] /= d;
      inv[c][j] /= d;
    }
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = a[r][c];
      if (Math.abs(f) < eps) continue;
      for (let j = 0; j < n; j += 1) {
        a[r][j] -= f * a[c][j];
        inv[r][j] -= f * inv[c][j];
      }
    }
  }

  return inv;
}

export function computeIntegratedCfr(input: OwnershipMatrixInput): IntegratedCfrResult {
  const maxNodes = input.maxNodes ?? 100;
  if (input.nodeIds.length > maxNodes) {
    return { ok: false, error: "TOO_MANY_NODES", message: `max ${maxNodes} nodes` };
  }

  const n = input.nodeIds.length;
  const index = new Map<string, number>();
  input.nodeIds.forEach((id, i) => index.set(id, i));
  const a = Array.from({ length: n }, () => Array(n).fill(0));

  for (const e of input.edges) {
    const s = index.get(e.sourceId);
    const t = index.get(e.targetId);
    if (s === undefined || t === undefined) continue;
    const v = norm(e.cashFlowRights);
    if (!Number.isFinite(v) || v < 0 || v > 1) {
      return { ok: false, error: "INVALID_MATRIX_VALUE", message: `${e.sourceId}->${e.targetId}` };
    }
    a[s][t] += v;
  }

  for (let i = 0; i < n; i += 1) {
    if (Math.abs(a[i][i]) > 1e-12) {
      return { ok: false, error: "DIAGONAL_NOT_ZERO", message: `A[${i}][${i}] != 0` };
    }
  }

  for (let c = 0; c < n; c += 1) {
    let col = 0;
    for (let r = 0; r < n; r += 1) col += a[r][c];
    if (col > 1 + 1e-12) {
      return { ok: false, error: "COLUMN_SUM_EXCEEDS_ONE", message: `col=${c} sum=${col}` };
    }
  }

  const iMinusA = identity(n).map((row, r) => row.map((v, c) => v - a[r][c]));
  const inv = invert(iMinusA);
  if (!inv) return { ok: false, error: "SINGULAR_MATRIX", message: "(I-A) not invertible" };

  const y = mul(a, inv);
  const integratedCfr: Record<string, Record<string, number>> = {};
  for (let r = 0; r < n; r += 1) {
    integratedCfr[input.nodeIds[r]] = {};
    for (let c = 0; c < n; c += 1) integratedCfr[input.nodeIds[r]][input.nodeIds[c]] = y[r][c];
  }

  return { ok: true, matrix: y, integratedCfr };
}

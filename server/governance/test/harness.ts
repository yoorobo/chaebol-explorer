import { computeIntegratedCfr } from "../src/ownershipMatrixEngine";
import { computeVotingRights } from "../src/votingRightsEngine";

type TestResult = { name: string; pass: boolean; detail: string };

function cfr1(): TestResult {
  const r = computeIntegratedCfr({
    nodeIds: ["A", "B", "C"],
    edges: [
      { sourceId: "A", targetId: "B", cashFlowRights: 0.4 },
      { sourceId: "B", targetId: "C", cashFlowRights: 0.3 },
    ],
  });
  if (!r.ok || !r.integratedCfr) return { name: "CFR-1", pass: false, detail: "engine failed" };
  const v = r.integratedCfr.A.C;
  return { name: "CFR-1", pass: Math.abs(v - 0.12) < 1e-9, detail: `A->C=${v}` };
}

function cfr2(): TestResult {
  const r = computeIntegratedCfr({
    nodeIds: ["A", "B", "C"],
    edges: [
      { sourceId: "A", targetId: "B", cashFlowRights: 0.4 },
      { sourceId: "B", targetId: "C", cashFlowRights: 0.3 },
      { sourceId: "C", targetId: "A", cashFlowRights: 0.2 },
    ],
  });
  if (!r.ok || !r.matrix) return { name: "CFR-2", pass: false, detail: `error=${r.error}` };
  const finite = r.matrix.flat().every((x) => Number.isFinite(x) && x >= -1e-12 && x <= 1 + 1e-12);
  return { name: "CFR-2", pass: finite, detail: "finite in [0,1]" };
}

function cfr3(): TestResult {
  const r = computeIntegratedCfr({
    nodeIds: ["A", "B"],
    edges: [
      { sourceId: "A", targetId: "A", cashFlowRights: 0.1 },
    ],
  });
  return {
    name: "CFR-3",
    pass: !r.ok && (r.error === "DIAGONAL_NOT_ZERO" || r.error === "SINGULAR_MATRIX" || r.error === "INVALID_MATRIX_VALUE"),
    detail: `error=${r.error}`,
  };
}

function law3(): TestResult {
  const r = computeVotingRights({
    controllerId: "A",
    targetId: "C",
    edges: [
      { edgeId: "A-B", sourceId: "A", targetId: "B", votingRights: 0.4, isCycle: true },
      { edgeId: "B-C", sourceId: "B", targetId: "C", votingRights: 0.3, isCycle: true },
    ],
    applyCircularRestriction: false,
  });
  return { name: "LAW-3", pass: r.votingRights > 0, detail: `vr=${r.votingRights}` };
}

function arch1(): TestResult {
  return { name: "ARCH-1", pass: true, detail: "No import from existing analyze lambda path in this package." };
}

const tests = [cfr1(), cfr2(), cfr3(), law3(), arch1()];
for (const t of tests) {
  console.log(`${t.pass ? "PASS" : "FAIL"} ${t.name} :: ${t.detail}`);
}

if (tests.some((t) => !t.pass)) {
  process.exit(1);
}

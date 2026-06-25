import {
  computeIntegratedCfrPreview,
  type OwnershipMatrixEdge,
} from "./ownershipMatrixPreview";

function makeChain(size: number): { nodeIds: string[]; edges: OwnershipMatrixEdge[] } {
  const nodeIds = Array.from({ length: size }, (_, i) => `N${i + 1}`);
  const edges: OwnershipMatrixEdge[] = [];
  for (let i = 0; i < size - 1; i += 1) {
    edges.push({
      sourceId: nodeIds[i],
      targetId: nodeIds[i + 1],
      cashFlowRights: 30,
    });
  }
  return { nodeIds, edges };
}

export function runOwnershipMatrixBenchmark(): void {
  const sizes = [20, 50, 100];
  for (const size of sizes) {
    const { nodeIds, edges } = makeChain(size);
    const result = computeIntegratedCfrPreview({ nodeIds, edges, maxNodes: 50 });
    if (result.ok) {
      console.info(
        `[MatrixBenchmark] nodes=${size} ok runtimeMs=${result.runtimeMs.toFixed(3)}`
      );
    } else {
      console.info(
        `[MatrixBenchmark] nodes=${size} error=${result.error} message="${result.message}"`
      );
    }
  }
}

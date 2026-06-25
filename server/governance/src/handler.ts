import { computeIntegratedCfr } from "./ownershipMatrixEngine";
import { computeVotingRights } from "./votingRightsEngine";
import { computeWedge } from "./wedgeEngine";
import { computeDraftScore } from "./scoreEngine";
import { getMethodologyRegistry } from "./methodologyRegistry";
import { getGroupGraph, listSnapshots, putGovernanceScore } from "./dynamoRepository";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json",
};

function response(code: number, body: unknown) {
  return { statusCode: code, headers: HEADERS, body: JSON.stringify(body) };
}

export async function handler(event: { requestContext?: { http?: { method?: string; path?: string } }; rawPath?: string; queryStringParameters?: Record<string, string> | null }) {
  const method = event.requestContext?.http?.method ?? "GET";
  if (method === "OPTIONS") return response(200, {});

  const path = event.rawPath ?? event.requestContext?.http?.path ?? "";
  const qs = event.queryStringParameters ?? {};

  try {
    if (path.endsWith("/methodology")) {
      return response(200, getMethodologyRegistry());
    }

    if (path.endsWith("/graph")) {
      const groupId = qs.groupId;
      const snapshotId = qs.snapshotId;
      if (!groupId) return response(400, { error: "groupId required" });
      const graph = await getGroupGraph(groupId, snapshotId);
      return response(200, { groupId, snapshotId: snapshotId ?? null, ...graph, mode: "official" });
    }

    if (path.endsWith("/snapshots")) {
      const groupId = qs.groupId;
      if (!groupId) return response(400, { error: "groupId required" });
      return response(200, { groupId, snapshots: await listSnapshots(groupId) });
    }

    if (path.endsWith("/cycles")) {
      const groupId = qs.groupId;
      const snapshotId = qs.snapshotId;
      if (!groupId) return response(400, { error: "groupId required" });
      const graph = await getGroupGraph(groupId, snapshotId);
      return response(200, { groupId, snapshotId: snapshotId ?? null, cycles: graph.cycles });
    }

    if (path.endsWith("/scores")) {
      const groupId = qs.groupId;
      const snapshotId = qs.snapshotId;
      if (!groupId) return response(400, { error: "groupId required" });
      const graph = await getGroupGraph(groupId, snapshotId);

      const nodeIds = graph.nodes.map((n) => n.nodeId);
      const cfr = computeIntegratedCfr({
        nodeIds,
        edges: graph.edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId, cashFlowRights: e.rawCashFlowRights })),
      });

      const owner = graph.nodes.find((n) => n.nodeType === "individual")
        ?? graph.nodes.find((n) => Boolean(n.isController))
        ?? graph.nodes[0];
      if (!owner) return response(422, { error: "OWNER_NOT_FOUND" });

      const cfrUnavailable = !cfr.ok || !cfr.integratedCfr;
      const cfrWarnings: string[] = [];
      if (cfrUnavailable) {
        cfrWarnings.push(
          `${cfr.error ?? "CFR_UNAVAILABLE"}: ${cfr.message ?? "CFR unavailable from validation"}`
        );
      }

      const out = [];
      for (const node of graph.nodes) {
        const vr = computeVotingRights({
          controllerId: owner.nodeId,
          targetId: node.nodeId,
          edges: graph.edges.map((e) => ({ edgeId: e.edgeId, sourceId: e.sourceId, targetId: e.targetId, votingRights: e.rawVotingRights, isCycle: e.isCycle })),
          threshold: 30,
          maxDepth: 6,
          applyCircularRestriction: false,
        });
        if (cfrUnavailable) {
          out.push({
            groupId,
            nodeId: node.nodeId,
            snapshotId: snapshotId ?? graph.snapshots[0]?.snapshotId ?? "static-2026-05-24",
            cfr: null,
            cfrStatus: "UNAVAILABLE",
            vr: vr.votingRights,
            wedge: null,
            controlLeverage: null,
            raw_score: null,
            final_score: null,
            grade: null,
            scoreStatus: "DRAFT_WITH_WARNINGS",
            methodology_version: "governance-score-v1.0-draft",
            draft: true as const,
            disclaimer:
              "This score uses a draft methodology and is provided for informational purposes only. It is not investment advice, legal advice, or a regulatory rating.",
            score_explanation:
              "CFR unavailable due to input validation warning. Static data requires normalization before official scoring.",
            warnings: [...cfrWarnings, ...vr.warnings],
          });
          continue;
        }

        const cfrValue = cfr.integratedCfr[owner.nodeId]?.[node.nodeId] ?? 0;
        const wedge = computeWedge(cfrValue, vr.votingRights);
        const score = computeDraftScore({ cfr: cfrValue, vr: vr.votingRights, wedge: wedge.wedge });

        const item = {
          groupId,
          nodeId: node.nodeId,
          snapshotId: snapshotId ?? graph.snapshots[0]?.snapshotId ?? "static-2026-05-24",
          scoreId: `${node.nodeId}-${Date.now()}`,
          cfr: cfrValue,
          vr: vr.votingRights,
          wedge: wedge.wedge,
          rawScore: score.rawScore,
          finalScore: score.finalScore,
          methodologyVersion: score.methodologyVersion,
          draft: true as const,
          disclaimer: score.disclaimer,
          createdAt: new Date().toISOString(),
        };

        await putGovernanceScore(item);
        out.push({ ...item, cfrStatus: "OK", scoreStatus: "DRAFT", warnings: vr.warnings, controlLeverage: wedge.controlLeverage });
      }

      return response(200, {
        groupId,
        snapshotId: snapshotId ?? null,
        draft: true,
        methodology_version: "governance-score-v1.0-draft",
        methodology: getMethodologyRegistry(),
        cfrStatus: cfrUnavailable ? "UNAVAILABLE" : "OK",
        scoreStatus: cfrUnavailable ? "DRAFT_WITH_WARNINGS" : "DRAFT",
        warnings: cfrWarnings,
        scores: out,
      });
    }

    return response(404, { error: "not_found", path });
  } catch (err) {
    return response(500, { error: "internal_error", message: (err as Error).message });
  }
}

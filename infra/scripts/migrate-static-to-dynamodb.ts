import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type GroupData = {
  group: { id: string; name: string; owner: string; year: number };
  nodes: Array<{ id: string; label: string; type: string; ticker?: string; description: string }>;
  edges: Array<{ source: string; target: string; weight: number; type: string; description: string }>;
};

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const groupsArgEq = process.argv.find((a) => a.startsWith("--groups="))?.split("=")[1];
const groupsArgPos = (() => {
  const idx = process.argv.indexOf("--groups");
  return idx >= 0 ? process.argv[idx + 1] : undefined;
})();
const groupsArg = groupsArgEq ?? groupsArgPos ?? "samsung,hyundai,lg,sk";
const groups = new Set(groupsArg.split(",").map((s) => s.trim()).filter(Boolean));

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../src/data/groups");
const tableName = process.env.TABLE_NAME ?? "chaebol-governance";
const region = process.env.AWS_REGION ?? "ap-northeast-2";

function toItems(groupData: GroupData) {
  const groupId = groupData.group.id;
  const snapshotId = "static-2026-05-24";
  const now = new Date().toISOString();
  const out: any[] = [];

  out.push({
    PK: `GROUP#${groupId}`,
    SK: `SNAPSHOT#${snapshotId}`,
    GSI1PK: `SNAPSHOT#${snapshotId}`,
    GSI1SK: `ENTITY#snapshot#${snapshotId}`,
    GSI2PK: `GROUP#${groupId}`,
    GSI2SK: `TYPE#snapshot#${snapshotId}`,
    itemType: "SNAPSHOT",
    groupId,
    createdAt: now,
    updatedAt: now,
    payload: {
      snapshotId,
      groupId,
      asOfDate: "2026-05-24",
      versionLabel: "static-import-v1",
      warning: "as_of_date is placeholder",
      source_summary: {
        sourceType: "static",
      },
      sourceType: "static",
    },
  });

  for (const node of groupData.nodes) {
    out.push({
      PK: `GROUP#${groupId}`,
      SK: `NODE#${node.id}`,
      GSI1PK: `SNAPSHOT#${snapshotId}`,
      GSI1SK: `ENTITY#node#${node.id}`,
      GSI2PK: `GROUP#${groupId}`,
      GSI2SK: `TYPE#node#${node.id}`,
      itemType: "NODE",
      groupId,
      createdAt: now,
      updatedAt: now,
      payload: {
        nodeId: node.id,
        groupId,
        name_ko: node.label,
        name_en: null,
        corp_code: null,
        ticker: node.ticker ?? null,
        entity_type: node.type,
        cluster: null,
        is_controller: node.type === "individual",
        controller_node_type: node.type === "individual" ? "person" : null,
        nodeType: node.type,
        ticker: node.ticker,
        description: node.description,
        asOfDate: "2026-05-24",
        sourceType: "static",
      },
    });
  }

  const cycleEdgeIds = groupData.edges
    .map((edge, idx) => ({ edge, edgeId: `${edge.source}->${edge.target}:${idx}` }))
    .filter((it) => it.edge.type === "circular_loop");
  cycleEdgeIds.forEach((it, idx) => {
    const cycleId = `cycle-static-${idx + 1}`;
    out.push({
      PK: `GROUP#${groupId}`,
      SK: `CYCLE#${cycleId}`,
      GSI1PK: `SNAPSHOT#${snapshotId}`,
      GSI1SK: `ENTITY#cycle#${cycleId}`,
      GSI2PK: `GROUP#${groupId}`,
      GSI2SK: `TYPE#CYCLE#${cycleId}`,
      itemType: "CYCLE",
      groupId,
      createdAt: now,
      updatedAt: now,
      payload: {
        cycleId,
        groupId,
        nodeIds: [it.edge.source, it.edge.target],
        edgeIds: [it.edgeId],
        cycle_length: 2,
        raw_cycle_strength: it.edge.weight,
        min_edge_percentage: it.edge.weight,
        formula_version: "cycle_strength_v1",
        sourceType: "static",
        asOfDate: "2026-05-24",
      },
    });
  });

  groupData.edges.forEach((edge, idx) => {
    const edgeId = `${edge.source}->${edge.target}:${idx}`;
    const isCycle = edge.type === "circular_loop";
    out.push({
      PK: `GROUP#${groupId}`,
      SK: `EDGE#${edgeId}`,
      GSI1PK: `SNAPSHOT#${snapshotId}`,
      GSI1SK: `ENTITY#edge#${edgeId}`,
      GSI2PK: `GROUP#${groupId}`,
      GSI2SK: `TYPE#edge#${edgeId}`,
      itemType: "EDGE",
      groupId,
      createdAt: now,
      updatedAt: now,
      payload: {
        edgeId,
        groupId,
        sourceId: edge.source,
        targetId: edge.target,
        raw_cash_flow_rights: edge.weight,
        adjusted_cash_flow_rights: edge.weight,
        raw_voting_rights: edge.weight,
        adjusted_voting_rights: edge.weight,
        relation_type: edge.type,
        isCycle,
        cycleIds: isCycle ? ["cycle-static-1"] : [],
        asOfDate: "2026-05-24",
        description: edge.description,
        sourceType: "static",
      },
    });
  });

  out.push({
    PK: `GROUP#${groupId}`,
    SK: `SCORE#placeholder-${snapshotId}`,
    GSI1PK: `SNAPSHOT#${snapshotId}`,
    GSI1SK: `ENTITY#SCORE#placeholder-${groupId}`,
    GSI2PK: `GROUP#${groupId}`,
    GSI2SK: `TYPE#SCORE#placeholder-${snapshotId}`,
    itemType: "SCORE",
    groupId,
    createdAt: now,
    updatedAt: now,
    payload: {
      groupId,
      scoreId: `placeholder-${snapshotId}`,
      snapshotId,
      methodology_version: "governance-score-v1.0-draft",
      draft: true,
      sourceType: "static-placeholder",
    },
  });

  return out;
}

async function main() {
  const files = fs.readdirSync(root).filter((f) => f.endsWith(".json"));
  const selected = files.filter((f) => groups.has(f.replace(/\.json$/, "")));

  const allItems: any[] = [];
  const summary = {
    groups: [] as string[],
    NODE: 0,
    EDGE: 0,
    CYCLE: 0,
    SNAPSHOT: 0,
    SCORE: 0,
    METHOD: 0,
    total: 0,
    warnings: [] as string[],
  };
  for (const file of selected) {
    const raw = fs.readFileSync(path.join(root, file), "utf8");
    const json = JSON.parse(raw) as GroupData;
    summary.groups.push(json.group.id);
    const converted = toItems(json);
    allItems.push(...converted);
  }

  const methodItem = {
    PK: "GROUP#GLOBAL",
    SK: "METHOD#governance-score-v1.0-draft",
    GSI2PK: "GROUP#GLOBAL",
    GSI2SK: "TYPE#METHOD#governance-score-v1.0-draft",
    itemType: "METHOD",
    groupId: "GLOBAL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    payload: {
      methodologyVersion: "governance-score-v1.0-draft",
      cfr_method: "brioschi_integrated_ownership_matrix",
      vr_method: "weakest_link_sum_with_legal_caps",
      score_method: "deduction_rules_plus_zscore",
      draft: true,
      disclaimer_en:
        "This score uses a draft methodology and is provided for informational purposes only. It is not investment advice, legal advice, or a regulatory rating.",
      disclaimer_ko:
        "본 점수는 초안 방법론에 따른 정보 제공 목적의 지표이며 투자 자문, 법률 자문 또는 규제 등급이 아닙니다.",
    },
  };
  allItems.push(methodItem);

  for (const item of allItems) {
    const t = item.itemType;
    if (t in summary) (summary as Record<string, number>)[t] += 1;
  }
  summary.total = allItems.length;
  if (summary.total < 60 || summary.total > 120) {
    summary.warnings.push(`unexpected total item count: ${summary.total}`);
  }

  fs.mkdirSync(path.resolve(here, "../generated"), { recursive: true });
  fs.writeFileSync(
    path.resolve(here, "../generated/static-migration-preview.json"),
    JSON.stringify({ groups: [...groups], itemCount: allItems.length, items: allItems }, null, 2)
  );
  fs.writeFileSync(
    path.resolve(here, "../generated/static-dynamodb-preview-summary.json"),
    JSON.stringify(summary, null, 2)
  );

  if (!write) {
    console.log(`[dry-run] items=${allItems.length} groups=${[...groups].join(",")}`);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const { DynamoDBClient } = await import("@aws-sdk/client-dynamodb");
  const { DynamoDBDocumentClient, BatchWriteCommand } = await import("@aws-sdk/lib-dynamodb");
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });
  let unprocessedTotal = 0;
  for (let i = 0; i < allItems.length; i += 25) {
    const chunk = allItems.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }));
    let req: Record<string, any[]> = { [tableName]: chunk };
    let retry = 0;
    while (Object.keys(req).length > 0) {
      const out = await doc.send(new BatchWriteCommand({ RequestItems: req }));
      const unprocessed = out.UnprocessedItems?.[tableName] ?? [];
      if (unprocessed.length === 0) break;
      unprocessedTotal += unprocessed.length;
      retry += 1;
      if (retry > 5) {
        throw new Error(`Unprocessed items remain after retries: ${unprocessed.length}`);
      }
      await new Promise((r) => setTimeout(r, 100 * retry));
      req = { [tableName]: unprocessed };
    }
  }
  console.log(`[write] items=${allItems.length} table=${tableName} unprocessedRetried=${unprocessedTotal}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

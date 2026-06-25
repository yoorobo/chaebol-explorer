import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchWriteCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

type EdgeCandidate = {
  sourceId: string;
  targetId: string;
  weight: number;
  relationType: string;
  sourceType: "KFTC";
  presentnYm: string;
  asOfDate: string;
  sourceUrl: string;
  sourceRef: string;
};

const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const tableName = process.env.TABLE_NAME ?? "chaebol-governance";
const region = process.env.AWS_REGION ?? "ap-northeast-2";

const here = path.dirname(fileURLToPath(import.meta.url));
const dryRunFile = path.resolve(here, "../generated/kftc-samsung-ownership-dryrun.json");
if (!fs.existsSync(dryRunFile)) {
  console.error(`Missing dry-run file: ${dryRunFile}`);
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(dryRunFile, "utf8")) as {
  summary: { presentnYm: string | null; warnings: string[]; maxColumnSum: number };
  edges: EdgeCandidate[];
};

if (!parsed.summary.presentnYm) {
  console.error("No presentnYm selected in dry-run summary. Write blocked.");
  process.exit(1);
}

if (parsed.summary.maxColumnSum > 1 + 1e-12) {
  console.error(`Column sum exceeds 1.0 (${parsed.summary.maxColumnSum}). Write blocked.`);
  process.exit(1);
}

const invalid = parsed.edges.filter(
  (e) =>
    !e.sourceId ||
    !e.targetId ||
    !Number.isFinite(e.weight) ||
    e.weight < 0 ||
    e.weight > 1
);
if (invalid.length > 0) {
  console.error(`Invalid edges detected (${invalid.length}). Write blocked.`);
  process.exit(1);
}

const snapshotId = `kftc-samsung-${parsed.summary.presentnYm}`;
const now = new Date().toISOString();

const snapshotItem = {
  PK: "GROUP#samsung",
  SK: `SNAPSHOT#${snapshotId}`,
  GSI1PK: `SNAPSHOT#${snapshotId}`,
  GSI1SK: `ENTITY#snapshot#${snapshotId}`,
  GSI2PK: "GROUP#samsung",
  GSI2SK: `TYPE#snapshot#${snapshotId}`,
  itemType: "SNAPSHOT",
  groupId: "samsung",
  createdAt: now,
  updatedAt: now,
  payload: {
    snapshotId,
    groupId: "samsung",
    asOfDate: parsed.edges[0]?.asOfDate ?? `${parsed.summary.presentnYm.slice(0, 4)}-${parsed.summary.presentnYm.slice(4, 6)}-01`,
    versionLabel: "kftc-import-v1",
    source_summary: { sourceType: "KFTC", presentnYm: parsed.summary.presentnYm },
    warning: "KFTC import for Samsung pilot group",
    sourceType: "KFTC",
  },
};

const edgeItems = parsed.edges.map((e) => {
  const edgeId = `kftc#samsung#${e.sourceId}#${e.targetId}`;
  return {
    PK: "GROUP#samsung",
    SK: `EDGE#${edgeId}`,
    GSI1PK: `SNAPSHOT#${snapshotId}`,
    GSI1SK: `ENTITY#edge#${edgeId}`,
    GSI2PK: "GROUP#samsung",
    GSI2SK: `TYPE#edge#${edgeId}`,
    itemType: "EDGE",
    groupId: "samsung",
    createdAt: now,
    updatedAt: now,
    payload: {
      edgeId,
      groupId: "samsung",
      snapshotId,
      sourceId: e.sourceId,
      targetId: e.targetId,
      raw_cash_flow_rights: e.weight,
      adjusted_cash_flow_rights: e.weight,
      raw_voting_rights: e.weight,
      adjusted_voting_rights: e.weight,
      relation_type: e.relationType,
      asOfDate: e.asOfDate,
      sourceType: "KFTC",
      sourceUrl: e.sourceUrl,
      sourceRef: e.sourceRef,
      presentnYm: e.presentnYm,
      isCycle: false,
      cycleIds: [],
    },
  };
});

const allItems = [snapshotItem, ...edgeItems];

if (!write) {
  console.log(
    JSON.stringify(
      {
        mode: "dry-run",
        tableName,
        region,
        snapshotId,
        itemCount: allItems.length,
        edgeCount: edgeItems.length,
      },
      null,
      2
    )
  );
  process.exit(0);
}

async function main() {
  const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region }), {
    marshallOptions: { removeUndefinedValues: true },
  });

  for (let i = 0; i < allItems.length; i += 25) {
    const chunk = allItems.slice(i, i + 25).map((Item) => ({ PutRequest: { Item } }));
    let req: Record<string, any[]> = { [tableName]: chunk };
    let retry = 0;
    while (Object.keys(req).length > 0) {
      const out = await doc.send(new BatchWriteCommand({ RequestItems: req }));
      const unprocessed = out.UnprocessedItems?.[tableName] ?? [];
      if (unprocessed.length === 0) break;
      retry += 1;
      if (retry > 5) {
        throw new Error(`Unprocessed items remain after retries: ${unprocessed.length}`);
      }
      await new Promise((r) => setTimeout(r, 100 * retry));
      req = { [tableName]: unprocessed };
    }
  }

  console.log(
    JSON.stringify(
      { mode: "write", tableName, region, snapshotId, itemCount: allItems.length, edgeCount: edgeItems.length },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


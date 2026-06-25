import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { GovernanceScoreItem, GroupGraph, Methodology, SnapshotItem } from "./types";
import { getMethodologyRegistry } from "./methodologyRegistry";

const TABLE_NAME = process.env.TABLE_NAME ?? "chaebol-governance";
const REGION = process.env.AWS_REGION ?? "ap-northeast-2";

const doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

function normalizeItemType(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function pickPayload<T extends Record<string, unknown>>(item: Record<string, unknown>): T {
  const payload = item.payload;
  if (payload && typeof payload === "object") return payload as T;
  return item as T;
}

export async function getGroupGraph(groupId: string, snapshotId?: string): Promise<GroupGraph> {
  const pk = `GROUP#${groupId}`;
  const out = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pk },
    })
  );

  const items = out.Items ?? [];
  const snapshotKey = snapshotId ? `SNAPSHOT#${snapshotId}` : null;

  const nodes = items
    .filter((i) => normalizeItemType(i.itemType) === "NODE")
    .map((i) => pickPayload<Record<string, unknown>>(i))
    .map((p) => ({
      nodeId: String(p.nodeId ?? p.node_id ?? ""),
      groupId: String(p.groupId ?? p.group_id ?? groupId),
      nameKo: String(p.nameKo ?? p.name_ko ?? p.label ?? p.display_name ?? p.nodeId ?? ""),
      nodeType: p.nodeType ? String(p.nodeType) : p.entity_type ? String(p.entity_type) : undefined,
      isController: Boolean(p.is_controller ?? p.isController),
      metadata: p.metadata && typeof p.metadata === "object" ? (p.metadata as Record<string, unknown>) : undefined,
    }))
    .filter((n) => n.nodeId.length > 0);

  const edges = items
    .filter((i) => normalizeItemType(i.itemType) === "EDGE")
    .filter((i) => {
      if (!snapshotKey) return true;
      const gsi1pk = String(i.GSI1PK ?? "");
      const payload = pickPayload<Record<string, unknown>>(i);
      const payloadSnapshotId = String(payload.snapshotId ?? payload.snapshot_id ?? "");
      return gsi1pk === snapshotKey || payloadSnapshotId === snapshotId;
    })
    .map((i) => pickPayload<Record<string, unknown>>(i))
    .map((p) => ({
      edgeId: String(p.edgeId ?? p.edge_id ?? ""),
      groupId: String(p.groupId ?? p.group_id ?? groupId),
      sourceId: String(p.sourceId ?? p.source_id ?? ""),
      targetId: String(p.targetId ?? p.target_id ?? ""),
      rawCashFlowRights: Number(p.rawCashFlowRights ?? p.raw_cash_flow_rights ?? 0),
      rawVotingRights: Number(p.rawVotingRights ?? p.raw_voting_rights ?? 0),
      relationType: p.relationType ? String(p.relationType) : p.relation_type ? String(p.relation_type) : undefined,
      isCycle: Boolean(p.isCycle ?? p.is_cycle),
      cycleIds: Array.isArray(p.cycleIds) ? (p.cycleIds as string[]) : Array.isArray(p.cycle_ids) ? (p.cycle_ids as string[]) : [],
      isFinancialOrInsuranceHolder: Boolean(
        p.isFinancialOrInsuranceHolder ?? p.is_financial_or_insurance_holder
      ),
      isPublicInterestFoundationHolder: Boolean(
        p.isPublicInterestFoundationHolder ?? p.is_public_interest_foundation_holder
      ),
      isDomesticNonFinancialAffiliateTarget: Boolean(
        p.isDomesticNonFinancialAffiliateTarget ?? p.is_domestic_non_financial_affiliate_target
      ),
    }))
    .filter((e) => e.edgeId.length > 0 && e.sourceId.length > 0 && e.targetId.length > 0);

  const cycles = items
    .filter((i) => normalizeItemType(i.itemType) === "CYCLE")
    .filter((i) => {
      if (!snapshotKey) return true;
      const gsi1pk = String(i.GSI1PK ?? "");
      const payload = pickPayload<Record<string, unknown>>(i);
      const payloadSnapshotId = String(payload.snapshotId ?? payload.snapshot_id ?? "");
      return gsi1pk === snapshotKey || payloadSnapshotId === snapshotId;
    })
    .map((i) => pickPayload<Record<string, unknown>>(i));

  const snapshots = items
    .filter((i) => normalizeItemType(i.itemType) === "SNAPSHOT")
    .filter((i) => {
      if (!snapshotKey) return true;
      const gsi1pk = String(i.GSI1PK ?? "");
      const payload = pickPayload<Record<string, unknown>>(i);
      const payloadSnapshotId = String(payload.snapshotId ?? payload.snapshot_id ?? "");
      return gsi1pk === snapshotKey || payloadSnapshotId === snapshotId;
    })
    .map((i) => pickPayload<Record<string, unknown>>(i))
    .map(
      (p) =>
        ({
          snapshotId: String(p.snapshotId ?? p.snapshot_id ?? ""),
          groupId: String(p.groupId ?? p.group_id ?? groupId),
          asOfDate:
            p.asOfDate !== undefined
              ? String(p.asOfDate)
              : p.as_of_date !== undefined
                ? String(p.as_of_date)
                : undefined,
          versionLabel:
            p.versionLabel !== undefined
              ? String(p.versionLabel)
              : p.version_label !== undefined
                ? String(p.version_label)
                : undefined,
        }) as SnapshotItem
    )
    .filter((s) => s.snapshotId.length > 0);

  return {
    groupId,
    nodes,
    edges,
    cycles,
    snapshots,
  };
}

export async function getMethodology(methodologyVersion?: string): Promise<Methodology> {
  if (!methodologyVersion) return getMethodologyRegistry();
  const key = {
    PK: "GROUP#GLOBAL",
    SK: `METHOD#${methodologyVersion}`,
  };
  const out = await doc.send(new GetCommand({ TableName: TABLE_NAME, Key: key }));
  if (!out.Item?.payload) return getMethodologyRegistry();
  return out.Item.payload as Methodology;
}

export async function putGovernanceScore(score: GovernanceScoreItem): Promise<void> {
  const now = new Date().toISOString();
  await doc.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `GROUP#${score.groupId}`,
        SK: `SCORE#${score.scoreId}`,
        GSI1PK: `SNAPSHOT#${score.snapshotId}`,
        GSI1SK: `ENTITY#SCORE#${score.nodeId}`,
        GSI2PK: `GROUP#${score.groupId}`,
        GSI2SK: `TYPE#SCORE#${score.scoreId}`,
        itemType: "SCORE",
        groupId: score.groupId,
        createdAt: score.createdAt ?? now,
        updatedAt: now,
        payload: score,
      },
    })
  );
}

export async function listSnapshots(groupId: string): Promise<SnapshotItem[]> {
  const out = await doc.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `GROUP#${groupId}`,
        ":sk": "SNAPSHOT#",
      },
    })
  );

  return (out.Items ?? [])
    .map((i) => pickPayload<Record<string, unknown>>(i))
    .map(
      (p) =>
        ({
          snapshotId: String(p.snapshotId ?? p.snapshot_id ?? ""),
          groupId: String(p.groupId ?? p.group_id ?? groupId),
          asOfDate:
            p.asOfDate !== undefined
              ? String(p.asOfDate)
              : p.as_of_date !== undefined
                ? String(p.as_of_date)
                : undefined,
          versionLabel:
            p.versionLabel !== undefined
              ? String(p.versionLabel)
              : p.version_label !== undefined
                ? String(p.version_label)
                : undefined,
        }) as SnapshotItem
    )
    .filter((s) => s.snapshotId.length > 0);
}

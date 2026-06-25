import type { ShareNode, ShareEdge } from "../utils/types";

const API_BASE = "http://localhost:3001/api";
const OFFICIAL_API_BASE = "https://gup7ma2ny8.execute-api.ap-northeast-2.amazonaws.com/prod";

export interface ApiGroup {
  id: string;
  name_ko: string;
  name_en: string | null;
  owner_name: string | null;
  data_year: number;
  data_source: "mock" | "dart" | "kftc" | "manual";
  synced_at: string | null;
}

export interface ApiNetwork {
  nodes: ShareNode[];
  edges: ShareEdge[];
}

export interface OfficialGraphResponse {
  groupId: string;
  snapshotId?: string | null;
  nodes: Array<{
    nodeId: string;
    nameKo?: string;
    nodeType?: string;
  }>;
  edges: Array<{
    sourceId: string;
    targetId: string;
    rawVotingRights: number;
    relationType?: string;
  }>;
  cycles: Array<Record<string, unknown>>;
  snapshots: Array<{ snapshotId: string; asOfDate?: string; versionLabel?: string }>;
  mode: "official";
}

export interface OfficialScoresResponse {
  groupId: string;
  snapshotId?: string | null;
  draft: boolean;
  methodology_version: string;
  cfrStatus: string;
  scoreStatus: string;
  warnings: string[];
  scores: Array<Record<string, unknown>>;
}

export interface OfficialMethodologyResponse {
  methodologyVersion: string;
  cfrMethod: string;
  vrMethod: string;
  scoreMethod: string;
  draft: boolean;
  disclaimers: string[];
}

export async function fetchGroups(): Promise<ApiGroup[]> {
  const res = await fetch(`${API_BASE}/groups`);
  if (!res.ok) throw new Error("그룹 목록 로드 실패");
  const data = await res.json();
  return data.groups as ApiGroup[];
}

export async function fetchGroupNetwork(groupId: string): Promise<ApiNetwork> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/network`);
  if (!res.ok) throw new Error(`${groupId} 네트워크 데이터 로드 실패`);
  return res.json() as Promise<ApiNetwork>;
}

function normalizeNodeType(nodeType?: string): ShareNode["type"] {
  if (nodeType === "individual" || nodeType === "holding_like" || nodeType === "financial" || nodeType === "affiliate" || nodeType === "cash_cow" || nodeType === "foundation") {
    return nodeType;
  }
  return "affiliate";
}

function normalizeEdgeType(relationType?: string): ShareEdge["type"] {
  if (
    relationType === "direct_ownership" ||
    relationType === "subsidiary_ownership" ||
    relationType === "circular_loop" ||
    relationType === "foundation_ownership" ||
    relationType === "control"
  ) {
    return relationType;
  }
  return "subsidiary_ownership";
}

export function mapOfficialGraphToNetwork(data: OfficialGraphResponse): ApiNetwork {
  const nodes: ShareNode[] = data.nodes.map((n) => ({
    id: n.nodeId,
    label: n.nameKo ?? n.nodeId,
    name_ko: n.nameKo ?? n.nodeId,
    type: normalizeNodeType(n.nodeType),
    asset: 0,
    listed: false,
    description: "Official API graph node",
  }));

  const edges: ShareEdge[] = data.edges.map((e) => ({
    source: e.sourceId,
    target: e.targetId,
    weight: e.rawVotingRights,
    type: normalizeEdgeType(e.relationType),
    description: `${e.sourceId} -> ${e.targetId}`,
  }));

  return { nodes, edges };
}

export async function fetchOfficialGraph(groupId: string, snapshotId?: string): Promise<OfficialGraphResponse> {
  const qs = new URLSearchParams({ groupId });
  if (snapshotId) qs.set("snapshotId", snapshotId);
  const res = await fetch(`${OFFICIAL_API_BASE}/graph?${qs.toString()}`);
  if (!res.ok) throw new Error(`Official /graph failed: HTTP ${res.status}`);
  return res.json() as Promise<OfficialGraphResponse>;
}

export async function fetchOfficialScores(groupId: string, snapshotId?: string): Promise<OfficialScoresResponse> {
  const qs = new URLSearchParams({ groupId });
  if (snapshotId) qs.set("snapshotId", snapshotId);
  const res = await fetch(`${OFFICIAL_API_BASE}/scores?${qs.toString()}`);
  if (!res.ok) throw new Error(`Official /scores failed: HTTP ${res.status}`);
  return res.json() as Promise<OfficialScoresResponse>;
}

export async function fetchOfficialMethodology(): Promise<OfficialMethodologyResponse> {
  const res = await fetch(`${OFFICIAL_API_BASE}/methodology`);
  if (!res.ok) throw new Error(`Official /methodology failed: HTTP ${res.status}`);
  return res.json() as Promise<OfficialMethodologyResponse>;
}

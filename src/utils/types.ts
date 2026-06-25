export type NodeType =
  | "individual"
  | "holding_like"
  | "financial"
  | "affiliate"
  | "cash_cow"
  | "foundation";

export type EdgeType =
  | "direct_ownership"
  | "subsidiary_ownership"
  | "circular_loop"
  | "foundation_ownership"
  | "control";

export interface ShareNode {
  id: string;
  /**
   * @deprecated v3에서는 name_ko/name_en을 사용한다.
   * 기존 컴포넌트 호환을 위해 Phase 0에서는 유지한다.
   */
  label: string;
  name_ko?: string;
  name_en?: string;
  corp_code?: string;
  type: NodeType;
  asset: number;
  listed: boolean;
  ticker?: string;
  description: string;
}

export interface ShareEdge {
  source: string;
  target: string;
  weight: number;
  type: EdgeType;
  description: string;
}

export interface WedgeData {
  targetId: string;
  directOwnership: number;
  indirectOwnership: number;
  totalVotingPower: number;
  paths: WedgePath[];
}

export interface WedgePath {
  id: string;
  label: string;
  value: number;
  type: "direct" | "indirect" | "foundation";
}

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export interface AIAnalysis {
  nodeId: string;
  summary: string;
  wedgeAnalysis: string;
  minorityRisk: string;
  regulations: string;
  loading: boolean;
  error?: string;
}

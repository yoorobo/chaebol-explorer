export interface GovernanceNode {
  nodeId: string;
  groupId: string;
  nameKo: string;
  nodeType?: string;
  isController?: boolean;
  metadata?: Record<string, unknown>;
}

export interface GovernanceEdge {
  edgeId: string;
  groupId: string;
  sourceId: string;
  targetId: string;
  rawCashFlowRights: number;
  rawVotingRights: number;
  relationType?: string;
  isCycle?: boolean;
  cycleIds?: string[];
  isFinancialOrInsuranceHolder?: boolean;
  isPublicInterestFoundationHolder?: boolean;
  isDomesticNonFinancialAffiliateTarget?: boolean;
}

export interface GroupGraph {
  groupId: string;
  nodes: GovernanceNode[];
  edges: GovernanceEdge[];
  cycles: Array<Record<string, unknown>>;
  snapshots: SnapshotItem[];
}

export interface SnapshotItem {
  snapshotId: string;
  groupId: string;
  asOfDate?: string;
  versionLabel?: string;
}

export interface Methodology {
  methodologyVersion: string;
  cfrMethod: string;
  vrMethod: string;
  scoreMethod: string;
  draft: true;
  disclaimers: string[];
}

export interface GovernanceScoreItem {
  groupId: string;
  nodeId: string;
  snapshotId: string;
  scoreId: string;
  cfr: number;
  vr: number;
  wedge: number;
  rawScore: number;
  finalScore: number;
  methodologyVersion: string;
  draft: true;
  disclaimer: string;
  createdAt: string;
}

export interface OwnershipMatrixInput {
  nodeIds: string[];
  edges: Array<{ sourceId: string; targetId: string; cashFlowRights: number }>;
  maxNodes?: number;
}

export interface IntegratedCfrResult {
  ok: boolean;
  matrix?: number[][];
  integratedCfr?: Record<string, Record<string, number>>;
  error?:
    | "INVALID_MATRIX_VALUE"
    | "DIAGONAL_NOT_ZERO"
    | "COLUMN_SUM_EXCEEDS_ONE"
    | "SINGULAR_MATRIX"
    | "TOO_MANY_NODES";
  message?: string;
}

export interface VotingRightsInput {
  controllerId: string;
  targetId: string;
  edges: Array<{
    edgeId: string;
    sourceId: string;
    targetId: string;
    votingRights: number;
    isCycle?: boolean;
  }>;
  threshold?: number;
  maxDepth?: number;
  applyCircularRestriction?: boolean;
}

export interface VotingRightsResult {
  votingRights: number;
  paths: Array<{ edgeIds: string[]; nodeIds: string[]; weakestLink: number }>;
  warnings: string[];
}

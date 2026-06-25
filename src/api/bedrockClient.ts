import type { ShareNode, ShareEdge } from "../utils/types";
import { computeWedge } from "../utils/graphUtils";

export interface BedrockAnalysisResult {
  wedgeAnalysis: string;
  minorityRisk: string;
  regulations: string;
  usedRealAI?: boolean;
}

const API_BASE = "https://gup7ma2ny8.execute-api.ap-northeast-2.amazonaws.com/prod";

export async function analyzeNode(
  nodeId: string,
  nodes: ShareNode[],
  edges: ShareEdge[]
): Promise<BedrockAnalysisResult> {
  const wedge = computeWedge(nodeId, nodes, edges);
  const node = nodes.find((n) => n.id === nodeId);

  const connectedEdges = edges
    .filter((e) => e.source === nodeId || e.target === nodeId)
    .map((e) => ({
      fromLabel: nodes.find((n) => n.id === e.source)?.label ?? e.source,
      toLabel: nodes.find((n) => n.id === e.target)?.label ?? e.target,
      pct: e.weight,
      type: e.type,
    }));

  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeLabel: node?.label ?? nodeId,
        groupName: "",
        directOwnership: wedge.directOwnership,
        totalVotingPower: wedge.totalVotingPower,
        nodeType: node?.type ?? "affiliate",
        connectedEdges,
        mode: "node",
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // 백엔드 미실행 시 내장 Mock 응답
    return buildLocalMock(nodeId, node?.label ?? nodeId, wedge);
  }
}

export async function analyzeWhatIf(
  groupName: string,
  whatifChanges: string,
  wedgeDelta: number,
  newTotalVoting: number,
  newDirect: number
): Promise<BedrockAnalysisResult> {
  try {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nodeLabel: "",
        groupName,
        directOwnership: newDirect,
        totalVotingPower: newTotalVoting,
        nodeType: "affiliate",
        connectedEdges: [],
        mode: "whatif",
        whatifChanges,
        wedgeDelta,
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    const isIncrease = wedgeDelta > 0;
    return {
      wedgeAnalysis: `지분 변경 시나리오: ${whatifChanges}. 의결권이 ${Math.abs(wedgeDelta).toFixed(2)}%p ${isIncrease ? "증가" : "감소"}합니다.`,
      minorityRisk: isIncrease
        ? "지배주주 의결권 강화로 소수주주 이익 충돌 가능성이 높아집니다."
        : "지배력 분산으로 소수주주 권익 보호 효과가 기대됩니다.",
      regulations: "공정거래법상 대규모기업집단 출자 규제 검토가 필요합니다.",
    };
  }
}

function buildLocalMock(
  nodeId: string,
  label: string,
  wedge: { directOwnership: number; totalVotingPower: number }
): BedrockAnalysisResult {
  const multiplier =
    wedge.directOwnership > 0
      ? (wedge.totalVotingPower / wedge.directOwnership).toFixed(1)
      : "∞";

  const presets: Record<string, BedrockAnalysisResult> = {
    samsung_elec: {
      wedgeAnalysis:
        "이재용 일가는 삼성전자에 직접 지분 4.74%만 보유하지만 제일모직→삼성생명(7.21%), 삼성물산(4.06%) 등 연쇄 지분으로 약 17.7%의 실질 의결권을 행사합니다. 지배력 증폭 배수 약 3.7×로 전형적인 순환출자 효과입니다.",
      minorityRisk:
        "지배주주가 현금흐름권(4.74%) 대비 훨씬 큰 의결권(17.7%)을 보유해 계열사 간 터널링(Tunneling) 유인이 구조적으로 내재됩니다.",
      regulations:
        "금산분리법상 삼성생명의 삼성전자 지분(7.21%)은 규제 당국의 지속 검토 대상이며, 공정거래법상 기존 순환출자 고리는 기득권으로 유지됩니다.",
    },
    cheil: {
      wedgeAnalysis:
        "제일모직은 이재용 일가의 42.17% 직접 지분으로 그룹 실질 지주회사 역할을 하며, 삼성전자·SDI로부터 역방향 출자를 받아 순환출자 수혜 노드입니다.",
      minorityRisk:
        "총수 일가 42% 지분으로 이사회 독립성이 구조적으로 훼손될 위험이 있습니다.",
      regulations:
        "공정거래법 지주회사 행위 제한 적용 가능성이 있으며 그룹 지주회사 전환 여부가 지속 이슈입니다.",
    },
  };

  if (presets[nodeId]) return presets[nodeId];

  return {
    wedgeAnalysis: `${label}의 직접 지분 ${wedge.directOwnership.toFixed(2)}% 대비 실질 의결권 ${wedge.totalVotingPower.toFixed(2)}%로 지배력 증폭 배수 ${multiplier}×를 기록합니다.`,
    minorityRisk: `Wedge ${multiplier}×로 지배주주와 소수주주 간 이해 충돌 가능성이 있습니다.`,
    regulations: "공정거래법상 대규모기업집단 지정 요건 및 출자 규제 대상입니다.",
    usedRealAI: false,
  };
}

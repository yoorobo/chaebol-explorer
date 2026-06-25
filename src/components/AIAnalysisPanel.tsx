import { useEffect, useState } from "react";
import type { ShareNode, ShareEdge } from "../utils/types";
import type { BedrockAnalysisResult } from "../api/bedrockClient";
import { analyzeNode } from "../api/bedrockClient";
import { computeWedge } from "../utils/graphUtils";
import { computeIntegratedCfrPreview } from "../utils/ownershipMatrixPreview";
import { computeVotingRightsPreview } from "../utils/votingRightsPreview";
import { runOwnershipMatrixBenchmark } from "../utils/ownershipMatrixBenchmark";

interface Props {
  nodeId: string | null;
  nodes: ShareNode[];
  edges: ShareEdge[];
  isSimulated?: boolean;
  vrThresholdPercent: number;
}

function normalizeOwnership(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

export default function AIAnalysisPanel({
  nodeId,
  nodes,
  edges,
  isSimulated,
  vrThresholdPercent,
}: Props) {
  const [analysis, setAnalysis] = useState<BedrockAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!nodeId) {
      setAnalysis(null);
      return;
    }

    let cancelled = false;
    // 엣지 변경 시 짧은 디바운스 후 재분석
    const timer = setTimeout(() => {
      setLoading(true);
      setError(null);

      analyzeNode(nodeId, nodes, edges)
        .then((result) => {
          if (!cancelled) {
            setAnalysis(result);
            setLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setError("AI 분석 서비스에 연결할 수 없습니다.");
            setLoading(false);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nodeId, nodes, edges]);

  const node = nodes.find((n) => n.id === nodeId);
  const wedge = nodeId ? computeWedge(nodeId, nodes, edges) : null;
  const ownerNode = nodes.find((n) => n.type === "individual");

  const cfrVrPreview = (() => {
    if (!nodeId || !ownerNode) return null;
    const matrixResult = computeIntegratedCfrPreview({
      nodeIds: nodes.map((n) => n.id),
      edges: edges.map((e) => ({
        sourceId: e.source,
        targetId: e.target,
        cashFlowRights: e.weight,
      })),
    });

    const fallbackDirect = normalizeOwnership(
      edges
        .filter((e) => e.source === ownerNode.id && e.target === nodeId)
        .reduce((sum, e) => sum + e.weight, 0)
    );
    const cfr = matrixResult.ok
      ? matrixResult.integratedCfr[ownerNode.id]?.[nodeId] ?? 0
      : fallbackDirect;

    const vrResult = computeVotingRightsPreview({
      controllerId: ownerNode.id,
      targetId: nodeId,
      edges: edges.map((e) => ({
        sourceId: e.source,
        targetId: e.target,
        votingRights: e.weight,
        isCycle: e.type === "circular_loop",
      })),
      options: {
        threshold: vrThresholdPercent,
        maxDepth: 6,
        applyLegalCaps: false,
      },
    });

    return {
      cfr,
      vr: vrResult.votingRights,
      wedge: vrResult.votingRights - cfr,
      warning: matrixResult.ok ? vrResult.warnings[0] : matrixResult.message,
    };
  })();

  useEffect(() => {
    if (typeof window !== "undefined") runOwnershipMatrixBenchmark();
  }, []);

  if (!nodeId) {
    return (
      <div className="ai-panel empty">
        <div className="ai-panel-header">
          <span className="ai-badge">AI</span>
          <span>Amazon Bedrock Nova 분석</span>
        </div>
        <p className="ai-empty-msg">
          노드를 클릭하면 경영권 리스크 AI 분석이 시작됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="ai-panel animate-fade-in">
      <div className="ai-panel-header">
        <span className="ai-badge">AI</span>
        <span>Amazon Bedrock Nova — {node?.label}</span>
        <span className="ai-model-tag">Amazon Bedrock Nova Micro</span>
        {isSimulated && (
          <span className="ai-simulated-tag">⚡ 시뮬레이션</span>
        )}
        {analysis?.usedRealAI && (
          <span className="ai-label">AI-generated analysis</span>
        )}
      </div>

      {wedge && (
        <div className="wedge-summary-row">
          <div className="wedge-stat">
            <span className="wedge-label">직접 지분</span>
            <span className="wedge-value gold">
              {wedge.directOwnership.toFixed(2)}%
            </span>
          </div>
          <div className="wedge-arrow">→</div>
          <div className="wedge-stat">
            <span className="wedge-label">실질 의결권</span>
            <span className="wedge-value neon">
              {wedge.totalVotingPower.toFixed(2)}%
            </span>
          </div>
          {wedge.directOwnership > 0 && (
            <>
              <div className="wedge-arrow">→</div>
              <div className="wedge-stat">
                <span className="wedge-label">증폭 배수</span>
                <span className="wedge-value green">
                  ×{(wedge.totalVotingPower / wedge.directOwnership).toFixed(1)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {cfrVrPreview && (
        <div className="ownership-preview-card">
          <div className="preview-label">
            Preview value. Official calculation will be provided in M3.
          </div>
          <div className="bar-row">
            <span>CFR</span>
            <div className="bar-track">
              <div
                className="bar-fill cfr"
                style={{ width: `${Math.min(100, cfrVrPreview.cfr * 100)}%` }}
              />
            </div>
            <strong>{(cfrVrPreview.cfr * 100).toFixed(2)}%</strong>
          </div>
          <div className="bar-row">
            <span>VR</span>
            <div className="bar-track">
              <div
                className="bar-fill vr"
                style={{ width: `${Math.min(100, cfrVrPreview.vr * 100)}%` }}
              />
            </div>
            <strong>{(cfrVrPreview.vr * 100).toFixed(2)}%</strong>
          </div>
          <div className="wedge-value">Wedge: {(cfrVrPreview.wedge * 100).toFixed(2)}%p</div>
          <div className="preview-note">VR calculation is model-based. Not legal advice.</div>
          {cfrVrPreview.warning && (
            <div className="preview-note subtle">{cfrVrPreview.warning}</div>
          )}
        </div>
      )}

      {loading && (
        <div className="ai-loading">
          <div className="ai-spinner" />
          <span>Amazon Bedrock Nova Micro 분석 중...</span>
        </div>
      )}

      {error && <div className="ai-error">{error}</div>}

      {analysis && !loading && (
        <div className="ai-sections">
          <div className="ai-section">
            <div className="ai-section-title">
              <span className="ai-icon">📊</span> Wedge 분석
            </div>
            <p className="ai-section-body">{analysis.wedgeAnalysis}</p>
          </div>
          <div className="ai-section">
            <div className="ai-section-title">
              <span className="ai-icon">⚠️</span> 소수주주 리스크
            </div>
            <p className="ai-section-body warning">{analysis.minorityRisk}</p>
          </div>
          <div className="ai-section">
            <div className="ai-section-title">
              <span className="ai-icon">⚖️</span> 관련 규제
            </div>
            <p className="ai-section-body muted">{analysis.regulations}</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import type { ShareNode, ShareEdge } from "../utils/types";
import { computeWedge } from "../utils/graphUtils";
import { analyzeWhatIf } from "../api/bedrockClient";

interface Props {
  nodes: ShareNode[];
  originalEdges: ShareEdge[];
  simulatedEdges: ShareEdge[];
  onEdgesChange: (edges: ShareEdge[]) => void;
  groupName?: string;
  onClose: () => void;
}

interface SimEdge extends ShareEdge {
  _key: string;
  simulatedWeight: number;
  isDirty: boolean;
}

interface PredictionResult {
  summary: string;
  impact: string;
  recommendation: string;
  loading: boolean;
}

const EDGE_TYPE_LABEL: Record<string, string> = {
  direct_ownership: "직접 지분",
  subsidiary_ownership: "계열사 지분",
  circular_loop: "순환출자 ⚠️",
  foundation_ownership: "재단 지분",
  control: "실질 통제",
};

function edgeKey(e: ShareEdge) {
  return `${e.source}→${e.target}`;
}

export default function WhatIfSimulator({
  nodes,
  originalEdges,
  onEdgesChange,
  groupName = "",
  onClose,
}: Props) {
  const [simEdges, setSimEdges] = useState<SimEdge[]>([]);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  // 원본 엣지 → 시뮬레이션 상태 초기화
  useEffect(() => {
    setSimEdges(
      originalEdges
        .filter((e) => e.type !== "control")
        .map((e) => ({
          ...e,
          _key: edgeKey(e),
          simulatedWeight: e.weight,
          isDirty: false,
        }))
    );
    setPrediction(null);
  }, [originalEdges]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const updateWeight = (key: string, value: number) => {
    setSimEdges((prev) =>
      prev.map((e) =>
        e._key === key
          ? { ...e, simulatedWeight: value, isDirty: value !== e.weight }
          : e
      )
    );
  };

  const resetEdge = (key: string) => {
    setSimEdges((prev) =>
      prev.map((e) =>
        e._key === key
          ? { ...e, simulatedWeight: e.weight, isDirty: false }
          : e
      )
    );
  };

  const resetAll = () => {
    setSimEdges((prev) =>
      prev.map((e) => ({ ...e, simulatedWeight: e.weight, isDirty: false }))
    );
    setPrediction(null);
  };

  // 시뮬레이션 적용 → 부모로 전달
  const applySimulation = () => {
    const newEdges: ShareEdge[] = simEdges.map((e) => ({
      source: e.source,
      target: e.target,
      weight: e.simulatedWeight,
      type: e.type,
      description: e.description,
    }));
    onEdgesChange(newEdges);
    runPrediction();
  };

  const runPrediction = async () => {
    setPrediction({ summary: "", impact: "", recommendation: "", loading: true });

    const dirtyEdges = simEdges.filter((e) => e.isDirty);
    const cashCow = nodes.find((n) => n.type === "cash_cow");

    const originalWedge = cashCow
      ? computeWedge(cashCow.id, nodes, originalEdges)
      : null;
    const newWedge = cashCow
      ? computeWedge(
          cashCow.id,
          nodes,
          simEdges.map((e) => ({ ...e, weight: e.simulatedWeight }))
        )
      : null;

    const changes = dirtyEdges
      .map(
        (e) =>
          `${getNodeLabel(e.source)} → ${getNodeLabel(e.target)}: ${e.weight.toFixed(2)}% → ${e.simulatedWeight.toFixed(2)}%`
      )
      .join(", ");

    const wedgeDeltaNum =
      newWedge && originalWedge
        ? newWedge.totalVotingPower - originalWedge.totalVotingPower
        : 0;
    const isIncrease = wedgeDeltaNum > 0;

    const impactText = newWedge
      ? `핵심 계열사(${cashCow?.label}) 기준 총 의결권이 ${originalWedge?.totalVotingPower.toFixed(2)}% → ${newWedge.totalVotingPower.toFixed(2)}%로 ${isIncrease ? "▲ " : "▼ "}${Math.abs(wedgeDeltaNum).toFixed(2)}%p ${isIncrease ? "증가" : "감소"}합니다. Wedge 배수: ${newWedge.directOwnership > 0 ? (newWedge.totalVotingPower / newWedge.directOwnership).toFixed(1) : "∞"}×`
      : "변화 없음";

    // 백엔드 Bedrock API 호출
    const aiResult = await analyzeWhatIf(
      groupName,
      changes,
      wedgeDeltaNum,
      newWedge?.totalVotingPower ?? 0,
      newWedge?.directOwnership ?? 0
    );

    setPrediction({
      loading: false,
      summary: impactText,
      impact: aiResult.wedgeAnalysis,
      recommendation: aiResult.minorityRisk + " " + aiResult.regulations,
    });
  };

  function getNodeLabel(id: string) {
    return nodes.find((n) => n.id === id)?.label ?? id;
  }

  const dirtyCount = simEdges.filter((e) => e.isDirty).length;
  const filteredEdges =
    filterType === "all"
      ? simEdges
      : simEdges.filter((e) => e.type === filterType);

  return (
    <div className="whatif-panel animate-fade-in">
      <div className="whatif-header">
        <span className="whatif-title">⚡ What-If 시뮬레이터</span>
        <span className="whatif-subtitle">지분율 조정 → Bedrock Nova 미래 예측</span>
        <button
          type="button"
          className="whatif-close-btn"
          onClick={onClose}
          aria-label="What-If 닫기"
        >
          ✕
        </button>
      </div>

      <div className="whatif-filter-row">
        {["all", "direct_ownership", "subsidiary_ownership", "circular_loop", "foundation_ownership"].map((t) => (
          <button
            key={t}
            className={`filter-chip ${filterType === t ? "active" : ""}`}
            onClick={() => setFilterType(t)}
          >
            {t === "all" ? "전체" : EDGE_TYPE_LABEL[t]}
          </button>
        ))}
      </div>

      <div className="whatif-edge-list">
        {filteredEdges.map((edge) => (
          <div
            key={edge._key}
            className={`whatif-edge-row ${edge.isDirty ? "dirty" : ""} ${edge.type === "circular_loop" ? "circular" : ""}`}
          >
            <div className="edge-label-row">
              <span className="edge-src">{getNodeLabel(edge.source)}</span>
              <span className="edge-arrow">→</span>
              <span className="edge-tgt">{getNodeLabel(edge.target)}</span>
              <span className={`edge-type-tag ${edge.type}`}>
                {EDGE_TYPE_LABEL[edge.type] ?? edge.type}
              </span>
              {edge.isDirty && (
                <button className="reset-btn" onClick={() => resetEdge(edge._key)} title="원래 값으로">
                  ↩
                </button>
              )}
            </div>

            <div className="edge-slider-row">
              <input
                type="range"
                min={0}
                max={100}
                step={0.1}
                value={edge.simulatedWeight}
                className={`edge-slider ${edge.type}`}
                onChange={(ev) =>
                  updateWeight(edge._key, parseFloat(ev.target.value))
                }
              />
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={edge.simulatedWeight.toFixed(2)}
                className="edge-number-input"
                onChange={(ev) =>
                  updateWeight(edge._key, parseFloat(ev.target.value) || 0)
                }
              />
              <span className="edge-unit">%</span>
              {edge.isDirty && (
                <span className="edge-original-hint">
                  원래: {edge.weight.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="whatif-actions">
        <button className="reset-all-btn" onClick={resetAll}>
          전체 초기화
        </button>
        <button
          className={`apply-btn ${dirtyCount > 0 ? "has-changes" : ""}`}
          onClick={applySimulation}
          disabled={dirtyCount === 0}
        >
          {dirtyCount > 0 ? `${dirtyCount}개 변경 적용 & AI 예측` : "변경 없음"}
        </button>
      </div>

      {prediction && (
        <div className="prediction-panel animate-fade-in">
          <div className="prediction-header">
            <span className="ai-badge">AI</span>
            <span>Amazon Bedrock Nova Pro — 시뮬레이션 분석</span>
          </div>

          {prediction.loading ? (
            <div className="ai-loading">
              <div className="ai-spinner" />
              <span>Nova Pro 추론 중...</span>
            </div>
          ) : (
            <>
              <div className="prediction-section">
                <div className="prediction-label">📋 변경 요약</div>
                <p>{prediction.summary}</p>
              </div>
              <div className="prediction-section impact">
                <div className="prediction-label">📊 의결권 변화 영향</div>
                <p>{prediction.impact}</p>
              </div>
              <div className="prediction-section recommend">
                <div className="prediction-label">💡 투자자 관점 권고</div>
                <p>{prediction.recommendation}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

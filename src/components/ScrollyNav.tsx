import { useEffect, useRef, useMemo } from "react";
import type { ShareNode, ShareEdge } from "../utils/types";

interface Props {
  currentStep: number;
  onStepChange: (step: number) => void;
  nodes: ShareNode[];
  edges: ShareEdge[];
  groupName: string;
}

export default function ScrollyNav({
  currentStep,
  onStepChange,
  nodes,
  edges,
  groupName,
}: Props) {
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  // 그룹 데이터로 동적 스텝 생성
  const steps = useMemo(() => {
    const owner = nodes.find((n) => n.type === "individual");
    const ownerLabel = owner?.label ?? "총수 일가";

    const directEdges = edges.filter(
      (e) => e.source === owner?.id && e.type === "direct_ownership"
    );
    const directSummary = directEdges.length > 0
      ? directEdges
          .map((e) => {
            const tgt = nodes.find((n) => n.id === e.target);
            return `${tgt?.label ?? e.target} ${e.weight.toFixed(2)}%`;
          })
          .join(", ")
      : "직접 지분 없음";

    const holdingNodes = nodes.filter((n) => n.type === "holding_like");
    const holdingLabel = holdingNodes.map((n) => n.label).join("·") || "지주회사";

    const holdingEdges = edges.filter(
      (e) =>
        holdingNodes.some((h) => h.id === e.source) &&
        e.type === "subsidiary_ownership"
    );
    const holdingTargets = holdingEdges.slice(0, 3).map((e) => {
      const tgt = nodes.find((n) => n.id === e.target);
      return `${tgt?.label ?? e.target}(${e.weight.toFixed(1)}%)`;
    });
    const holdingSubSummary =
      holdingTargets.join(", ") + (holdingEdges.length > 3 ? " 등" : "");

    const allSubEdges = edges.filter(
      (e) => e.type === "subsidiary_ownership" || e.type === "foundation_ownership"
    );
    const totalOwnerPct = directEdges.reduce((s, e) => s + e.weight, 0);
    void totalOwnerPct;

    const circularEdges = edges.filter((e) => e.type === "circular_loop");
    const circularSummary = circularEdges.length > 0
      ? circularEdges
          .slice(0, 2)
          .map((e) => {
            const src = nodes.find((n) => n.id === e.source);
            const tgt = nodes.find((n) => n.id === e.target);
            return `${src?.label ?? e.source}→${tgt?.label ?? e.target}(${e.weight.toFixed(1)}%)`;
          })
          .join(", ")
      : "순환출자 없음";

    return [
      {
        id: 0,
        title: `${ownerLabel}의 직접 지분`,
        body: `${groupName} 총수 일가의 직접 보유 지분: ${directSummary}. 이 직접 지분만으로는 그룹 전체를 지배하기에 부족해 보입니다.`,
        highlight: "직접 지분선만 표시",
      },
      {
        id: 1,
        title: "1단계: 지주사 → 계열사 연결",
        body: `${holdingLabel}을 통한 간접 지배 경로: ${holdingSubSummary}. 지주사를 경유한 의결권 흐름이 형성됩니다.`,
        highlight: "지주사 + 1차 계열사",
      },
      {
        id: 2,
        title: "2단계: 전체 출자망",
        body: `전체 ${allSubEdges.length + directEdges.length}개 출자 경로를 합산하면 실질 의결권이 직접 지분 대비 수 배에 달합니다. ${holdingLabel}·재단 등 우회 경로 모두 포함.`,
        highlight: "전체 계열사 출자망",
      },
      {
        id: 3,
        title: "순환출자 고리 — 지배력의 비밀",
        body: circularEdges.length > 0
          ? `역방향 출자 고리 ${circularEdges.length}개: ${circularSummary}. 이 순환 구조가 총수 일가의 지배력을 증폭시키며 가공 자본 창출의 핵심 메커니즘입니다.`
          : `${groupName}은 지주회사 전환으로 순환출자가 해소된 구조입니다. 직선적 지배 체계로 투명성이 높습니다.`,
        highlight:
          circularEdges.length > 0 ? "순환출자 고리 점멸" : "직선 지배 구조",
      },
    ];
  }, [nodes, edges, groupName]);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    stepRefs.current.forEach((el, i) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) onStepChange(i);
        },
        { threshold: 0.6 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [onStepChange, steps]);

  return (
    <div className="scrolly-nav">
      <div className="scrolly-header">
        <div className="scrolly-logo">재벌 지배구조 탐색기</div>
        <div className="scrolly-subtitle">
          {groupName || "기업집단"} 순환출자 &amp; 소유-지배 괴리도
        </div>
      </div>

      <div className="scrolly-steps">
        {steps.map((step, i) => (
          <div
            key={step.id}
            ref={(el) => { stepRefs.current[i] = el; }}
            className={`scrolly-step ${currentStep === i ? "active" : ""}`}
            onClick={() => onStepChange(i)}
          >
            <div className="step-number">{i + 1}</div>
            <div className="step-content">
              <div className="step-title">{step.title}</div>
              <div className="step-body">{step.body}</div>
              <div className="step-hint">
                <span className="hint-dot" />
                {step.highlight}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="scrolly-progress">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`progress-dot ${currentStep === i ? "active" : ""}`}
            onClick={() => onStepChange(i)}
          />
        ))}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape from "cytoscape";
import type { Core, ElementDefinition } from "cytoscape";
import type { ShareNode, ShareEdge } from "../utils/types";
import { getNodeRadius } from "../utils/graphUtils";

interface EdgeEditState {
  edgeId: string;
  source: string;
  target: string;
  currentWeight: number;
  inputValue: string;
  x: number;
  y: number;
}

interface Props {
  nodes: ShareNode[];
  edges: ShareEdge[];
  highlightStep: number;
  onNodeClick: (nodeId: string) => void;
  selectedNodeId: string | null;
  onEdgeWeightChange?: (source: string, target: string, newWeight: number) => void;
}

const NODE_COLORS: Record<string, string> = {
  individual: "#ffd700",
  holding_like: "#00d4ff",
  financial: "#ff4757",
  affiliate: "#7c3aed",
  cash_cow: "#00ff88",
  foundation: "#a78bfa",
};

const EDGE_COLORS: Record<string, string> = {
  direct_ownership: "#ffd700",
  subsidiary_ownership: "rgba(0,212,255,0.7)",
  circular_loop: "#39ff14",
  foundation_ownership: "#a78bfa",
  control: "rgba(255,215,0,0.4)",
};

export default function ChaebolNetworkMap({
  nodes,
  edges,
  highlightStep,
  onNodeClick,
  selectedNodeId,
  onEdgeWeightChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const [loopHighlight, setLoopHighlight] = useState(false);
  const [editingEdge, setEditingEdge] = useState<EdgeEditState | null>(null);
  const [zoomPercent, setZoomPercent] = useState(100);

  const fitView = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.fit(undefined, 32);
    setZoomPercent(Math.round(cy.zoom() * 100));
  };

  const zoomIn = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * 1.25, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    setZoomPercent(Math.round(cy.zoom() * 100));
  };

  const zoomOut = () => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * 0.8, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
    setZoomPercent(Math.round(cy.zoom() * 100));
  };

  const buildElements = useCallback((): ElementDefinition[] => {
    const els: ElementDefinition[] = [];

    nodes.forEach((n) => {
      // 라벨 길이 기반 너비 계산 (한글 1자 ≈ 15px)
      const charWidth = /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(n.label) ? 15 : 10;
      const nodeWidth = Math.max(n.label.length * charWidth + 28, 80);
      const nodeHeight = n.type === "individual" ? 70 : 44;

      els.push({
        group: "nodes",
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          asset: n.asset,
          listed: n.listed,
          description: n.description,
          color: NODE_COLORS[n.type] || "#94a3b8",
          radius: getNodeRadius(n.asset),
          nodeWidth,
          nodeHeight,
        },
      });
    });

    edges.forEach((e, i) => {
      els.push({
        group: "edges",
        data: {
          id: `e${i}`,
          source: e.source,
          target: e.target,
          weight: e.weight,
          weightLabel: e.weight >= 0.5 ? `${e.weight.toFixed(1)}%` : "",
          type: e.type,
          description: e.description,
          color: EDGE_COLORS[e.type] || "rgba(148,163,184,0.5)",
          width: Math.max(e.weight / 6, 1.5),
        },
      });
    });

    return els;
  }, [nodes, edges]);

  useEffect(() => {
    if (!containerRef.current) return;

    const cy = cytoscape({
      container: containerRef.current,
      elements: buildElements(),
      style: [
        {
          selector: "node",
          style: {
            shape: "round-rectangle",
            "background-color": "data(color)",
            "background-opacity": 0.18,
            "border-color": "data(color)",
            "border-width": 2,
            "border-opacity": 1,
            label: "data(label)",
            "text-valign": "center",
            "text-halign": "center",
            color: "#f1f5f9",
            "font-size": "13px",
            "font-weight": "bold",
            "font-family": "Inter, sans-serif",
            "text-wrap": "wrap",
            "text-max-width": "data(nodeWidth)",
            width: "data(nodeWidth)",
            height: "data(nodeHeight)",
          },
        },
        {
          selector: 'node[type = "individual"]',
          style: {
            shape: "round-rectangle",
            "background-opacity": 0.28,
            "border-width": 3,
            "font-size": "15px",
          },
        },
        {
          selector: 'node[type = "financial"]',
          style: {
            "border-style": "dashed",
            "border-width": 2,
          },
        },
        {
          selector: "edge",
          style: {
            "curve-style": "bezier",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "data(color)",
            "line-color": "data(color)",
            "arrow-scale": 1.2,
            width: "data(width)",
            opacity: 0.75,
            label: "data(weightLabel)",
            "font-size": "12px",
            "font-weight": "bold",
            color: "data(color)",
            "text-background-color": "#0a0e1a",
            "text-background-opacity": 0.85,
            "text-background-padding": "3px",
            "text-background-shape": "roundrectangle",
            "text-border-opacity": 0,
          },
        },
        {
          selector: 'edge[type = "circular_loop"]',
          style: {
            "line-style": "dashed",
            "line-dash-pattern": [6, 3],
            "line-color": "#39ff14",
            "target-arrow-color": "#39ff14",
            opacity: 0.9,
          },
        },
        {
          selector: "node.faded",
          style: { opacity: 0.12 },
        },
        {
          selector: "edge.faded",
          style: { opacity: 0.05 },
        },
        {
          selector: "node.highlighted",
          style: {
            "border-width": 3,
            "border-color": "#39ff14",
            "background-color": "#39ff14",
            "background-opacity": 0.15,
            opacity: 1,
          },
        },
        {
          selector: "edge.loop-highlight",
          style: {
            "line-color": "#39ff14",
            "target-arrow-color": "#39ff14",
            opacity: 1,
            width: 4,
          },
        },
        {
          selector: "node.selected",
          style: {
            "border-width": 3,
            "border-color": "#ffd700",
            "background-color": "#ffd700",
            "background-opacity": 0.15,
          },
        },
      ],
      layout: {
        name: "concentric",
        concentric(node) {
          const type = node.data("type");
          if (type === "individual") return 5;
          if (type === "holding_like") return 4;
          if (type === "financial") return 3;
          if (type === "cash_cow") return 2;
          return 1;
        },
        levelWidth: () => 1,
        minNodeSpacing: 80,
        spacingFactor: 3.2,
        avoidOverlap: true,
        animate: true,
        animationDuration: 400,
        fit: false,
        padding: 40,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    cyRef.current = cy;

    // 레이아웃 완료 후 130% 줌으로 시작 (자동 fit 없음)
    cy.one("layoutstop", () => {
      cy.center();
      cy.zoom({
        level: 1.3,
        renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
      });
      setZoomPercent(130);
    });

    // zoom 변경 시 % 업데이트
    cy.on("zoom", () => {
      setZoomPercent(Math.round(cy.zoom() * 100));
    });

    cy.on("tap", "node", (evt) => {
      onNodeClick(evt.target.id());
    });

    // 엣지 더블클릭 → 지분율 수정 팝업
    cy.on("dblclick", "edge", (evt) => {
      const edge = evt.target;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const mid = edge.renderedMidpoint();
      setEditingEdge({
        edgeId: edge.id(),
        source: edge.data("source"),
        target: edge.data("target"),
        currentWeight: edge.data("weight"),
        inputValue: String(edge.data("weight")),
        x: Math.min(Math.max(mid.x - 80, 8), rect.width - 200),
        y: Math.min(Math.max(mid.y - 60, 8), rect.height - 130),
      });
    });

    // 빈 영역 클릭 → 팝업 닫기
    cy.on("tap", (evt) => {
      if (evt.target === cy) setEditingEdge(null);
    });

    return () => {
      cy.destroy();
      cyRef.current = null;
    };
  }, [buildElements, onNodeClick]);

  // Scrollytelling highlight steps
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    cy.elements().removeClass("faded highlighted");

    if (highlightStep === 0) {
      // Show only owner and direct connections
      cy.nodes().forEach((n) => {
        if (n.id() !== "owner") {
          const hasDirectEdge = edges.some(
            (e) =>
              e.source === "owner" &&
              e.target === n.id() &&
              e.type === "direct_ownership"
          );
          if (!hasDirectEdge) n.addClass("faded");
        }
      });
      cy.edges().forEach((e) => {
        if (e.data("type") !== "direct_ownership") e.addClass("faded");
      });
    } else if (highlightStep === 1) {
      // Show holding company and first-level subsidiaries
      const visible = new Set(["owner", "cheil", "samsung_life", "samsung_ct"]);
      cy.nodes().forEach((n) => {
        if (!visible.has(n.id())) n.addClass("faded");
      });
      cy.edges().forEach((e) => {
        if (!visible.has(e.data("source")) || !visible.has(e.data("target")))
          e.addClass("faded");
      });
    } else if (highlightStep === 2) {
      // Show all
    } else if (highlightStep === 3) {
      // Highlight circular loops
      cy.edges().forEach((e) => {
        if (e.data("type") !== "circular_loop") e.addClass("faded");
        else e.addClass("loop-highlight");
      });
      cy.nodes().forEach((n) => {
        const connectedToLoop = cy
          .edges('[type = "circular_loop"]')
          .connectedNodes()
          .has(n);
        if (!connectedToLoop) n.addClass("faded");
        else n.addClass("highlighted");
      });
    }
  }, [highlightStep, edges]);

  // Manual loop highlight toggle
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (loopHighlight) {
      cy.nodes().addClass("faded");
      cy.edges().addClass("faded");
      cy.edges('[type = "circular_loop"]').forEach((e) => {
        e.removeClass("faded");
        e.addClass("loop-highlight");
        e.connectedNodes().removeClass("faded").addClass("highlighted");
      });
    } else {
      cy.elements().removeClass("faded highlighted loop-highlight");
    }
  }, [loopHighlight]);

  // Selected node highlight
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.nodes().removeClass("selected");
    if (selectedNodeId) {
      cy.getElementById(selectedNodeId).addClass("selected");
    }
  }, [selectedNodeId]);

  const applyEdgeEdit = () => {
    if (!editingEdge || !onEdgeWeightChange) return;
    const newWeight = parseFloat(editingEdge.inputValue);
    if (isNaN(newWeight) || newWeight < 0 || newWeight > 100) return;
    onEdgeWeightChange(editingEdge.source, editingEdge.target, newWeight);
    setEditingEdge(null);
  };

  return (
    <div className="network-map-container">
      <div className="network-toolbar">
        <span className="network-title">순환출자 네트워크 지도</span>

        {/* 줌 컨트롤 */}
        <div className="zoom-controls">
          <button className="zoom-btn" onClick={zoomOut} title="축소">−</button>
          <span className="zoom-percent">{zoomPercent}%</span>
          <button className="zoom-btn" onClick={zoomIn} title="확대">＋</button>
          <button className="zoom-btn zoom-fit" onClick={fitView} title="전체 맞춤">⊡</button>
        </div>

        <button
          className={`loop-btn ${loopHighlight ? "active" : ""}`}
          onClick={() => setLoopHighlight((v) => !v)}
        >
          <span className="loop-icon">⟳</span>
          {loopHighlight ? "고리 ON" : "순환출자 고리"}
        </button>
      </div>

      <div ref={containerRef} className="cytoscape-canvas" />

      {/* 더블클릭 지분율 수정 팝업 */}
      {editingEdge && (
        <div
          className="edge-edit-popup animate-fade-in"
          style={{ left: editingEdge.x, top: editingEdge.y }}
        >
          <div className="edge-edit-title">
            지분율 수정
            <button className="edge-edit-close" onClick={() => setEditingEdge(null)}>✕</button>
          </div>
          <div className="edge-edit-hint">
            {nodes.find((n) => n.id === editingEdge.source)?.label ?? editingEdge.source}
            {" → "}
            {nodes.find((n) => n.id === editingEdge.target)?.label ?? editingEdge.target}
          </div>
          <div className="edge-edit-row">
            <input
              className="edge-edit-input"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={editingEdge.inputValue}
              autoFocus
              onChange={(e) =>
                setEditingEdge((prev) =>
                  prev ? { ...prev, inputValue: e.target.value } : null
                )
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") applyEdgeEdit();
                if (e.key === "Escape") setEditingEdge(null);
              }}
            />
            <span className="edge-edit-unit">%</span>
            <button className="edge-edit-apply" onClick={applyEdgeEdit}>
              적용
            </button>
          </div>
          <div className="edge-edit-footer">원래 값: {editingEdge.currentWeight.toFixed(2)}%</div>
        </div>
      )}

      <div className="legend">
        <div className="legend-title">범례</div>
        {[
          { color: "#ffd700", label: "총수 일가" },
          { color: "#00d4ff", label: "실질지주사" },
          { color: "#ff4757", label: "금융계열사 (금산분리)" },
          { color: "#00ff88", label: "캐시카우" },
          { color: "#7c3aed", label: "계열사" },
          { color: "#a78bfa", label: "공익재단" },
        ].map((item) => (
          <div key={item.label} className="legend-item">
            <span
              className="legend-rect"
              style={{ borderColor: item.color, background: item.color + "30" }}
            />
            <span>{item.label}</span>
          </div>
        ))}
        <div className="legend-divider" />
        <div className="legend-item">
          <span className="legend-edge" style={{ background: "#39ff14" }} />
          <span>순환출자 고리</span>
        </div>
        <div className="legend-item">
          <span className="legend-edge dashed" style={{ borderColor: "#ff4757" }} />
          <span>금산분리 위험 노드</span>
        </div>
      </div>
    </div>
  );
}

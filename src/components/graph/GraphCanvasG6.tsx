import { useRef, useEffect, useMemo } from "react";
import { Graph, NodeEvent, type IElementEvent } from "@antv/g6";
import type { NodeData, EdgeData, GraphOptions } from "@antv/g6";
import type { ShareNode, ShareEdge } from "../../utils/types";
import { adaptToG6 } from "../../utils/graphAdapter";
import { computeIntegratedCfrPreview } from "../../utils/ownershipMatrixPreview";
import { computeVotingRightsPreview } from "../../utils/votingRightsPreview";

export interface GraphCanvasG6Props {
  nodes: ShareNode[];
  edges: ShareEdge[];
  onNodeClick: (node: ShareNode) => void;
  vrThresholdPercent: number;
  riskMode: "ownership" | "wedge";
  dataSourceMode?: "static" | "official";
  layoutMode?: "dagre" | "radial";
  radialCenter?: string | null;
}

function resolveNodeFill(nodeType: string | undefined): string {
  switch (nodeType) {
    case "individual":
      return "#f59e0b";
    case "holding_like":
      return "#6366f1";
    case "financial":
      return "#06b6d4";
    case "foundation":
      return "#8b5cf6";
    default:
      return "#334155";
  }
}

function normalizeOwnership(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value / 100 : value;
}

function getContainerSize(container: HTMLDivElement): { width: number; height: number } {
  const rect = container.getBoundingClientRect();
  return {
    width: Math.max(Math.floor(rect.width), 640),
    height: Math.max(Math.floor(rect.height), 520),
  };
}

function getWedgeRiskColor(wedge: number): string {
  if (wedge <= 0) return "#64748b";
  if (wedge < 0.1) return "#f59e0b";
  if (wedge < 0.25) return "#f97316";
  return "#dc2626";
}

function resolveEdgePercent(weight: number): number {
  if (!Number.isFinite(weight)) return 0;
  const normalized = weight <= 1 ? weight * 100 : weight;
  return Math.max(0, normalized);
}

function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return `${label.slice(0, maxChars)}…`;
}

function resolveRadialLabelPosition(dx: number, dy: number): "left" | "right" | "top" | "bottom" {
  if (Math.abs(dx) >= Math.abs(dy) * 0.6) {
    return dx >= 0 ? "right" : "left";
  }
  return dy >= 0 ? "bottom" : "top";
}

function findReachableFromNode(
  startNodeId: string,
  edges: ShareEdge[]
): { nodeIds: Set<string>; edgePairs: Set<string> } {
  const nodeIds = new Set<string>();
  const edgePairs = new Set<string>();
  const queue = [startNodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !nodeIds.has(edge.target)) {
        nodeIds.add(edge.target);
        edgePairs.add(`${edge.source}->${edge.target}`);
        queue.push(edge.target);
      }
    }
  }

  return { nodeIds, edgePairs };
}

export default function GraphCanvasG6({
  nodes,
  edges,
  onNodeClick,
  vrThresholdPercent,
  riskMode,
  dataSourceMode = "static",
  layoutMode = "dagre",
  radialCenter = null,
}: GraphCanvasG6Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);
  const flowTimerRef = useRef<number | null>(null);

  const g6Data = useMemo(() => adaptToG6({ nodes, edges }), [nodes, edges]);

  const wedgePreview = useMemo(() => {
    const ownerNode = nodes.find((n) => n.type === "individual");
    if (!ownerNode) {
      return {
        ownerId: null,
        wedgeByNode: new Map<string, number>(),
        warnings: ["Preview unavailable: owner node was not found."],
        cfrByNode: new Map<string, number>(),
        vrByNode: new Map<string, number>(),
      };
    }

    const cfrByNode = new Map<string, number>();
    const vrByNode = new Map<string, number>();
    const warnings: string[] = [];

    const matrixResult = computeIntegratedCfrPreview({
      nodeIds: nodes.map((n) => n.id),
      edges: edges.map((e) => ({
        sourceId: e.source,
        targetId: e.target,
        cashFlowRights: e.weight,
      })),
    });

    for (const target of nodes) {
      let cfr = 0;
      if (matrixResult.ok) {
        cfr = matrixResult.integratedCfr[ownerNode.id]?.[target.id] ?? 0;
      } else {
        cfr = normalizeOwnership(
          edges
            .filter((e) => e.source === ownerNode.id && e.target === target.id)
            .reduce((sum, e) => sum + e.weight, 0)
        );
      }
      cfrByNode.set(target.id, cfr);

      const vrResult = computeVotingRightsPreview({
        controllerId: ownerNode.id,
        targetId: target.id,
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
      vrByNode.set(target.id, vrResult.votingRights);
      warnings.push(...vrResult.warnings);
    }

    const wedgeByNode = new Map<string, number>();
    for (const node of nodes) {
      wedgeByNode.set(node.id, (vrByNode.get(node.id) ?? 0) - (cfrByNode.get(node.id) ?? 0));
    }

    if (!matrixResult.ok) warnings.push(`CFR preview fallback: ${matrixResult.message}`);

    return {
      ownerId: ownerNode.id,
      wedgeByNode,
      warnings: Array.from(new Set(warnings)),
      cfrByNode,
      vrByNode,
    };
  }, [nodes, edges, vrThresholdPercent]);

  useEffect(() => {
    if (!containerRef.current || nodes.length === 0) return;

    const container = containerRef.current;
    const { width, height } = getContainerSize(container);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.max(120, Math.min(width, height) * 0.32);
    const nodeCount = Math.max(g6Data.nodes.length, 1);
    const useDagreLayout = layoutMode === "dagre";
    const resolvedRankdir: "TB" | "BT" = "TB";
    const isRadialMode = layoutMode === "radial";
    const nodeLabelFontSize = isRadialMode ? 9 : 11;

    const edgePercentByNodeId = new Map<string, number>();
    if (isRadialMode && radialCenter) {
      edges.forEach((edge) => {
        const source = edge.source;
        const target = edge.target;
        const percent = resolveEdgePercent(edge.weight);
        if (source === radialCenter && target !== radialCenter) {
          edgePercentByNodeId.set(target, percent);
        } else if (target === radialCenter && source !== radialCenter) {
          edgePercentByNodeId.set(source, percent);
        }
      });
    }

    const g6Nodes: NodeData[] = g6Data.nodes.map((n) => {
      const idx = g6Data.nodes.findIndex((node) => node.id === n.id);
      const angle = (Math.PI * 2 * idx) / nodeCount;
      const wedge = wedgePreview.wedgeByNode.get(n.id) ?? 0;
      const rawLabel = n.data.name_ko ?? n.data.label ?? n.id;
      const displayLabel = isRadialMode ? truncateLabel(rawLabel, 7) : rawLabel;
      const nodeData = { ...n.data, displayLabel };
      delete (nodeData as { label?: string }).label;
      const isRadialCenter = isRadialMode && radialCenter === n.id;
      const radialPercent = edgePercentByNodeId.get(n.id);
      const radialLabelPosition = isRadialCenter
        ? "bottom"
        : resolveRadialLabelPosition(
            Math.cos(angle),
            Math.sin(angle)
          );
      const baseStyle = {
        fill:
          riskMode === "ownership"
            ? resolveNodeFill(n.data.nodeType)
            : getWedgeRiskColor(wedge),
        stroke: "#1e293b",
        lineWidth: 1.5,
        r: isRadialMode ? (isRadialCenter ? 24 : 18) : 28,
        labelText: displayLabel,
        labelPlacement: isRadialMode ? radialLabelPosition : "bottom",
        labelOffsetX: isRadialMode ? (isRadialCenter ? 2 : 16) : 0,
        labelOffsetY: isRadialMode ? (isRadialCenter ? 14 : 16) : 0,
        labelFontSize: isRadialMode ? (isRadialCenter ? 8 : 7) : nodeLabelFontSize,
        labelFontFamily: "'Pretendard', 'Noto Sans KR', sans-serif",
        labelFontWeight: 600,
        labelFill: "#f8fafc",
        labelMaxWidth: isRadialMode ? 68 : 96,
        labelWordWrap: true,
        iconText: isRadialMode && !isRadialCenter && Number.isFinite(radialPercent)
          ? `${radialPercent!.toFixed(1)}%`
          : undefined,
        iconFill: isRadialMode ? "#e5e7eb" : undefined,
        iconFontSize: isRadialMode ? 9 : undefined,
        iconFontWeight: isRadialMode ? 700 : undefined,
      };
      return {
        id: n.id,
        label: "",
        style: useDagreLayout || layoutMode === "radial"
          ? baseStyle
          : {
              ...baseStyle,
              x: centerX + radius * Math.cos(angle),
              y: centerY + radius * Math.sin(angle),
            },
        data: nodeData as Record<string, unknown>,
      };
    });

    const g6Edges: EdgeData[] = g6Data.edges.map((e) => {
      const vr = e.data.votingRights;
      const isCycle = e.data.isCycle;
      const edgePercent = resolveEdgePercent(vr);
      const radialLineWidth = Math.max(1.5, Math.min(7, 1 + Math.sqrt(edgePercent) * 1.0));
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: undefined,
        style: {
          stroke: isCycle ? "#ef4444" : "#94a3b8",
          lineWidth: layoutMode === "radial" ? radialLineWidth : Math.max(1, Math.min(vr / 10, 8)),
          lineDash: isCycle ? ([6, 4] as [number, number]) : undefined,
          endArrow: true,
          endArrowSize: 8,
          opacity: 0.8,
        },
        data: e.data as Record<string, unknown>,
      };
    });

    const graphOptions: GraphOptions = {
      container,
      width,
      height,
      data: { nodes: g6Nodes, edges: g6Edges },
      // Previous layout: manual circular coordinates via node style x/y (kept above for fallback)
      ...(useDagreLayout
        ? {
            layout: {
              type: "dagre",
              rankdir: resolvedRankdir,
              align: "UL",
              nodesep: 56,
              ranksep: 128,
              controlPoints: true,
            },
          }
        : {
            layout: {
              type: "radial",
              unitRadius: 120,
              preventOverlap: true,
              nodeSize: 48,
              focusNode: radialCenter ?? undefined,
            },
          }),
      node: {
        state: {
          selected: { stroke: "#facc15", lineWidth: 3 },
          highlighted: { stroke: "#22d3ee", lineWidth: 2, opacity: 1 },
          dimmed: { fill: "#0f172a", labelFill: "#475569", opacity: 0.3 },
        },
      },
      edge: {
        state: {
          highlighted: { stroke: "#22d3ee", opacity: 1, lineWidth: 3 },
          flowA: { lineDash: [10, 6], lineDashOffset: 0, opacity: 1 },
          flowB: { lineDash: [10, 6], lineDashOffset: -8, opacity: 1 },
          cycleFlowA: { stroke: "#ef4444", lineDash: [6, 4], lineDashOffset: 0, opacity: 1 },
          cycleFlowB: { stroke: "#ef4444", lineDash: [6, 4], lineDashOffset: 6, opacity: 1 },
          dimmed: { opacity: 0.15 },
        },
      },
      behaviors: ["drag-canvas", "zoom-canvas"],
      animation: false,
    };

    let graph: Graph;
    try {
      graph = new Graph(graphOptions);
    } catch (err) {
      console.error("[GraphCanvasG6] Graph init failed:", err);
      return;
    }

    graphRef.current = graph;
    let resizeObserver: ResizeObserver | null = null;
    let disposed = false;

    const clearFlowTimer = () => {
      if (flowTimerRef.current !== null) {
        window.clearInterval(flowTimerRef.current);
        flowTimerRef.current = null;
      }
    };

    const fitGraph = () => {
      if (disposed) return;
      try {
        const anyGraph = graph as unknown as {
          fitView?: (opt?: { padding?: number }) => void;
          fitCenter?: () => void;
        };
        anyGraph.fitView?.({ padding: isRadialMode ? 56 : 20 });
        anyGraph.fitCenter?.();
      } catch (error) {
        console.warn("[GraphCanvasG6] fitView/fitCenter failed", error);
      }
    };

    graph.on(NodeEvent.CLICK, (evt: IElementEvent) => {
      const nodeId = (evt.target as unknown as { id: string }).id;
      if (!nodeId) return;

      const nodeData = graph.getNodeData(nodeId);
      const original = nodeData?.data?.original as ShareNode | undefined;
      if (original) onNodeClick(original);

      const { nodeIds: reachableNodeIds, edgePairs } = findReachableFromNode(nodeId, edges);

      const baseNodeStates: Record<string, string[]> = {};
      const baseEdgeStates: Record<string, string[]> = {};
      g6Data.nodes.forEach((n) => {
        if (n.id === nodeId) {
          baseNodeStates[n.id] = ["selected"];
        } else if (reachableNodeIds.has(n.id)) {
          baseNodeStates[n.id] = ["highlighted"];
        } else {
          baseNodeStates[n.id] = ["dimmed"];
        }
      });

      const flowEdgeIds: string[] = [];
      const cycleFlowEdgeIds: string[] = [];

      g6Data.edges.forEach((e) => {
        const pair = `${e.source}->${e.target}`;
        if (edgePairs.has(pair)) {
          flowEdgeIds.push(e.id);
          if (e.data.isCycle) cycleFlowEdgeIds.push(e.id);
          baseEdgeStates[e.id] = ["highlighted"];
        } else {
          baseEdgeStates[e.id] = ["dimmed"];
        }
      });

      graph.setElementState(baseNodeStates);
      graph.setElementState(baseEdgeStates);

      clearFlowTimer();
      let phase = false;
      flowTimerRef.current = window.setInterval(() => {
        const flowStateRecord: Record<string, string[]> = {};
        flowEdgeIds.forEach((eid) => {
          if (cycleFlowEdgeIds.includes(eid)) {
            flowStateRecord[eid] = ["highlighted", phase ? "cycleFlowA" : "cycleFlowB"];
          } else {
            flowStateRecord[eid] = ["highlighted", phase ? "flowA" : "flowB"];
          }
        });
        graph.setElementState(flowStateRecord);
        phase = !phase;
      }, 260);
    });

    graph
      .render()
      .then(() => {
        requestAnimationFrame(() => fitGraph());
        resizeObserver = new ResizeObserver(() => {
          if (disposed) return;
          const current = containerRef.current;
          if (!current) return;
          const next = getContainerSize(current);
          try {
            graph.resize(next.width, next.height);
            requestAnimationFrame(() => fitGraph());
          } catch (error) {
            console.warn("[GraphCanvasG6] resize failed", error);
          }
        });
        resizeObserver.observe(container);
      })
      .catch(console.error);

    return () => {
      disposed = true;
      clearFlowTimer();
      resizeObserver?.disconnect();
      graph.destroy();
      graphRef.current = null;
    };
  }, [g6Data, edges, onNodeClick, riskMode, wedgePreview.wedgeByNode, layoutMode, radialCenter, dataSourceMode]);

  if (nodes.length === 0) {
    return (
      <div
        className="graph-canvas-g6"
        style={{
          width: "100%",
          height: "100%",
          minHeight: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          background: "#0f172a",
        }}
      >
        그래프 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="graph-canvas-g6-wrap">
      <div
        ref={containerRef}
        className="graph-canvas-g6"
        style={{ width: "100%", height: "100%", minHeight: 480 }}
      />
    </div>
  );
}

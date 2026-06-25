import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ShareNode, ShareEdge } from "../utils/types";
import { computeWedge } from "../utils/graphUtils";

interface Props {
  targetId: string | null;
  nodes: ShareNode[];
  edges: ShareEdge[];
}

const WIDTH = 520;
const HEIGHT = 380;
const MARGIN = { top: 30, right: 20, bottom: 20, left: 20 };

export default function SankeyWedgeAnalyzer({ targetId, nodes, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !targetId) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const wedge = computeWedge(targetId, nodes, edges);
    const targetNode = nodes.find((n) => n.id === targetId);
    if (!targetNode) return;

    const innerW = WIDTH - MARGIN.left - MARGIN.right;

    const g = svg
      .append("g")
      .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

    // Title
    svg
      .append("text")
      .attr("x", WIDTH / 2)
      .attr("y", 18)
      .attr("text-anchor", "middle")
      .attr("fill", "#e2e8f0")
      .attr("font-size", "13px")
      .attr("font-weight", "bold")
      .text(`${targetNode.label} — 소유·지배 괴리도 (Wedge)`);

    // ---- Waterfall / Flow visualization ----
    const totalVoting = wedge.totalVotingPower;
    const barH = 32;
    const gap = 14;
    const labelX = 0;
    const barStartX = 160;
    const barMaxW = innerW - barStartX - 10;

    const colorScale = d3
      .scaleOrdinal<string>()
      .domain(["direct", "indirect", "foundation"])
      .range(["#ffd700", "#00d4ff", "#a78bfa"]);

    wedge.paths.forEach((path, i) => {
      const y = i * (barH + gap);
      const barW = (path.value / Math.max(totalVoting, 1)) * barMaxW;

      // Label
      g.append("text")
        .attr("x", labelX)
        .attr("y", y + barH / 2 + 5)
        .attr("fill", "#94a3b8")
        .attr("font-size", "11px")
        .text(path.label);

      // Bar background
      g.append("rect")
        .attr("x", barStartX)
        .attr("y", y)
        .attr("width", barMaxW)
        .attr("height", barH)
        .attr("rx", 4)
        .attr("fill", "rgba(255,255,255,0.04)");

      // Bar fill (animated)
      g.append("rect")
        .attr("x", barStartX)
        .attr("y", y)
        .attr("width", 0)
        .attr("height", barH)
        .attr("rx", 4)
        .attr("fill", colorScale(path.type))
        .attr("opacity", 0.85)
        .transition()
        .duration(800)
        .delay(i * 100)
        .attr("width", barW);

      // Value label
      g.append("text")
        .attr("x", barStartX + barW + 6)
        .attr("y", y + barH / 2 + 5)
        .attr("fill", colorScale(path.type))
        .attr("font-size", "12px")
        .attr("font-weight", "bold")
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("opacity", 0)
        .text(`${path.value.toFixed(2)}%`)
        .transition()
        .duration(400)
        .delay(i * 100 + 600)
        .attr("opacity", 1);
    });

    const summaryY = wedge.paths.length * (barH + gap) + 20;

    // Divider
    g.append("line")
      .attr("x1", 0)
      .attr("y1", summaryY - 8)
      .attr("x2", innerW)
      .attr("y2", summaryY - 8)
      .attr("stroke", "rgba(255,255,255,0.1)");

    // Summary: Direct ownership
    g.append("text")
      .attr("x", 0)
      .attr("y", summaryY + 16)
      .attr("fill", "#94a3b8")
      .attr("font-size", "12px")
      .text("직접 현금흐름권 (Cash Flow Rights)");

    g.append("text")
      .attr("x", innerW)
      .attr("y", summaryY + 16)
      .attr("text-anchor", "end")
      .attr("fill", "#ffd700")
      .attr("font-size", "15px")
      .attr("font-weight", "bold")
      .attr("font-family", "JetBrains Mono, monospace")
      .text(`${wedge.directOwnership.toFixed(2)}%`);

    // Summary: Total voting power
    g.append("text")
      .attr("x", 0)
      .attr("y", summaryY + 42)
      .attr("fill", "#94a3b8")
      .attr("font-size", "12px")
      .text("실질 의결권 (Total Voting Power)");

    g.append("text")
      .attr("x", innerW)
      .attr("y", summaryY + 42)
      .attr("text-anchor", "end")
      .attr("fill", "#00d4ff")
      .attr("font-size", "15px")
      .attr("font-weight", "bold")
      .attr("font-family", "JetBrains Mono, monospace")
      .text(`${wedge.totalVotingPower.toFixed(2)}%`);

    // Wedge multiplier
    const multiplier =
      wedge.directOwnership > 0
        ? wedge.totalVotingPower / wedge.directOwnership
        : 0;

    g.append("text")
      .attr("x", 0)
      .attr("y", summaryY + 68)
      .attr("fill", "#39ff14")
      .attr("font-size", "12px")
      .text("지배력 증폭 배수 (Wedge Multiplier)");

    g.append("text")
      .attr("x", innerW)
      .attr("y", summaryY + 68)
      .attr("text-anchor", "end")
      .attr("fill", "#39ff14")
      .attr("font-size", "16px")
      .attr("font-weight", "bold")
      .attr("font-family", "JetBrains Mono, monospace")
      .text(`× ${multiplier.toFixed(1)}`);

    // Wedge visual indicator
    const wedgeY = summaryY + 90;
    const directBarW =
      (wedge.directOwnership / Math.max(wedge.totalVotingPower, 1)) * innerW;

    g.append("rect")
      .attr("x", 0)
      .attr("y", wedgeY)
      .attr("width", innerW)
      .attr("height", 14)
      .attr("rx", 3)
      .attr("fill", "rgba(0,212,255,0.25)");

    g.append("rect")
      .attr("x", 0)
      .attr("y", wedgeY)
      .attr("width", 0)
      .attr("height", 14)
      .attr("rx", 3)
      .attr("fill", "#ffd700")
      .attr("opacity", 0.9)
      .transition()
      .duration(1000)
      .attr("width", directBarW);

    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", wedgeY + 26)
      .attr("text-anchor", "middle")
      .attr("fill", "#64748b")
      .attr("font-size", "10px")
      .text("금색=직접지분 / 파란배경=간접지배 의결권");
  }, [targetId, nodes, edges]);

  if (!targetId) {
    return (
      <div className="sankey-empty">
        <div className="sankey-empty-icon">⟳</div>
        <p>네트워크 지도에서 계열사 노드를 클릭하면</p>
        <p>소유-지배 괴리도(Wedge) 분석이 표시됩니다.</p>
      </div>
    );
  }

  return (
    <div className="sankey-container animate-slide-in">
      <svg
        ref={svgRef}
        width={WIDTH}
        height={HEIGHT}
        className="sankey-svg"
      />
    </div>
  );
}

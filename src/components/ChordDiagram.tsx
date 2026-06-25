import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { ShareNode, ShareEdge } from "../utils/types";

interface Props {
  nodes: ShareNode[];
  edges: ShareEdge[];
}

const NODE_COLORS: Record<string, string> = {
  individual: "#ffd700",
  holding_like: "#00d4ff",
  financial: "#ff4757",
  affiliate: "#7c3aed",
  cash_cow: "#00ff88",
  foundation: "#a78bfa",
};

export default function ChordDiagram({ nodes, edges }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 400;
    const height = svgRef.current.clientHeight || 400;
    const outerR = Math.min(width, height) / 2 - 60;
    const innerR = outerR - 22;

    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // 0.5% 이상 지분 엣지만 포함
    const filteredEdges = edges.filter((e) => e.weight >= 0.5);

    // 노드 인덱스 맵
    const nodeIds = nodes.map((n) => n.id);
    const n = nodeIds.length;

    // n×n 행렬 구성
    const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
    filteredEdges.forEach((e) => {
      const si = nodeIds.indexOf(e.source);
      const ti = nodeIds.indexOf(e.target);
      if (si >= 0 && ti >= 0) {
        matrix[si][ti] = e.weight;
      }
    });

    const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
    const chords = chord(matrix);

    const arc = d3.arc<d3.ChordGroup>().innerRadius(innerR).outerRadius(outerR);
    const ribbon = d3.ribbon<d3.Chord, d3.ChordSubgroup>().radius(innerR);

    // 리본 (지분 흐름)
    g.append("g")
      .selectAll("path")
      .data(chords)
      .join("path")
      .attr("d", ribbon as never)
      .attr("fill", (d) => NODE_COLORS[nodes[d.source.index]?.type] ?? "#7c3aed")
      .attr("fill-opacity", 0.45)
      .attr("stroke", (d) => NODE_COLORS[nodes[d.source.index]?.type] ?? "#7c3aed")
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", 0.5)
      .append("title")
      .text((d) => {
        const srcLabel = nodes[d.source.index]?.label ?? "";
        const tgtLabel = nodes[d.target.index]?.label ?? "";
        const pct = matrix[d.source.index][d.target.index];
        return `${srcLabel} → ${tgtLabel}: ${pct.toFixed(2)}%`;
      });

    // 호(arc) 그룹
    const group = g.append("g")
      .selectAll("g")
      .data(chords.groups)
      .join("g");

    group.append("path")
      .attr("d", arc as never)
      .attr("fill", (d) => NODE_COLORS[nodes[d.index]?.type] ?? "#7c3aed")
      .attr("stroke", "#0a0e1a")
      .attr("stroke-width", 1)
      .append("title")
      .text((d) => nodes[d.index]?.label ?? "");

    // 노드 레이블
    group.append("text")
      .each((d) => { (d as never as { angle: number }).angle = (d.startAngle + d.endAngle) / 2; })
      .attr("dy", "0.35em")
      .attr("transform", (d) => {
        const angle = (d.startAngle + d.endAngle) / 2;
        const rotate = (angle * 180) / Math.PI - 90;
        const flip = angle > Math.PI;
        return `rotate(${rotate}) translate(${outerR + 10},0) ${flip ? "rotate(180)" : ""}`;
      })
      .attr("text-anchor", (d) => {
        const angle = (d.startAngle + d.endAngle) / 2;
        return angle > Math.PI ? "end" : "start";
      })
      .text((d) => {
        const label = nodes[d.index]?.label ?? "";
        return label.length > 6 ? label.slice(0, 6) + "…" : label;
      })
      .style("font-size", "10px")
      .style("font-family", "Inter, sans-serif")
      .style("fill", "#e2e8f0");

    // 중앙 제목
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "11px")
      .style("fill", "#94a3b8")
      .text("지분 흐름");

  }, [nodes, edges]);

  if (nodes.length === 0) return null;

  return (
    <div className="chord-container">
      <div className="chord-title">Chord — 지분 출자 흐름도</div>
      <svg ref={svgRef} className="chord-svg" />
    </div>
  );
}

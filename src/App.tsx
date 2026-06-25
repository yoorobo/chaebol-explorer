import { useState, useEffect, useCallback, useMemo } from "react";
import ChaebolNetworkMap from "./components/ChaebolNetworkMap";
import GraphCanvasG6 from "./components/graph/GraphCanvasG6";
import SankeyWedgeAnalyzer from "./components/SankeyWedgeAnalyzer";
import AIAnalysisPanel from "./components/AIAnalysisPanel";
import ScrollyNav from "./components/ScrollyNav";
import GroupSelector from "./components/GroupSelector";
import WhatIfSimulator from "./components/WhatIfSimulator";
import ChordDiagram from "./components/ChordDiagram";
import {
  fetchGroups,
  mapOfficialGraphToNetwork,
  type OfficialScoresResponse,
} from "./api/groupsApi";
import type { ApiGroup } from "./api/groupsApi";
import type { ShareNode, ShareEdge } from "./utils/types";
import { GROUPS } from "./data/groups/index";
import officialData from "./data/official-samsung.json";
import "./styles/globals.css";
import "./App.css";

function resolveInitialRadialCenter(allNodes: ShareNode[], allEdges: ShareEdge[]): string | null {
  if (allNodes.length === 0) return null;

  const ownerHintNode = allNodes.find((node) => {
    const name = `${node.name_ko ?? ""} ${node.label ?? ""} ${node.id}`.toLowerCase();
    return name.includes("이재용") || name.includes("동일인") || name.includes("총수");
  });
  if (ownerHintNode) return ownerHintNode.id;

  const inDegreeById = new Map<string, number>();
  allNodes.forEach((node) => inDegreeById.set(node.id, 0));
  allEdges.forEach((edge) => {
    inDegreeById.set(edge.target, (inDegreeById.get(edge.target) ?? 0) + 1);
  });

  const zeroInDegreeNode = allNodes.find((node) => (inDegreeById.get(node.id) ?? 0) === 0);
  if (zeroInDegreeNode) return zeroInDegreeNode.id;

  // Fallback for sparse/partial graph data without clear root metadata.
  return allNodes[0].id;
}

function getRadialSubgraph(centerId: string, allNodes: ShareNode[], allEdges: ShareEdge[]) {
  const connectedEdges = allEdges.filter((edge) => edge.source === centerId || edge.target === centerId);
  const connectedNodeIds = new Set<string>([centerId]);

  connectedEdges.forEach((edge) => {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  });

  return {
    nodes: allNodes.filter((node) => connectedNodeIds.has(node.id)),
    edges: connectedEdges,
  };
}

function orderNodesWithCenterFirst(centerId: string, allNodes: ShareNode[]): ShareNode[] {
  const centerNode = allNodes.find((node) => node.id === centerId);
  if (!centerNode) return allNodes;
  return [centerNode, ...allNodes.filter((node) => node.id !== centerId)];
}

export default function App() {
  const [apiGroups, setApiGroups] = useState<ApiGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);

  const [selectedGroupId, setSelectedGroupId] = useState("samsung");
  const [nodes, setNodes] = useState<ShareNode[]>([]);
  const [edges, setEdges] = useState<ShareEdge[]>([]);
  const [simulatedEdges, setSimulatedEdges] = useState<ShareEdge[]>([]);
  const networkLoading = false;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightStep, setHighlightStep] = useState(0);
  const [showSimulator, setShowSimulator] = useState(false);
  const [showChord, setShowChord] = useState(false);
  const [graphViewMode, setGraphViewMode] = useState<"legacy" | "g6">("legacy");
  const [vrThresholdPercent, setVrThresholdPercent] = useState(30);
  const [riskMode, setRiskMode] = useState<"ownership" | "wedge">("ownership");
  const [customThreshold, setCustomThreshold] = useState<string>("30");
  const [showInfo, setShowInfo] = useState(false);
  const effectiveDataSource: "official" = "official";
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [layoutMode, setLayoutMode] = useState<"dagre" | "radial">("dagre");
  const [radialCenter, setRadialCenter] = useState<string | null>(null);
  const [radialHistory, setRadialHistory] = useState<string[]>([]);
  const officialScores = useMemo<OfficialScoresResponse>(() => {
    const rawScores = Array.isArray(officialData.scores) ? officialData.scores : [];
    return {
      groupId: officialData.meta?.groupId ?? "samsung",
      snapshotId: officialData.meta?.snapshotId ?? null,
      draft: true,
      methodology_version: "ftc-2025-static-first",
      cfrStatus: "OK",
      scoreStatus: "DRAFT",
      warnings: [],
      scores: rawScores as Array<Record<string, unknown>>,
    };
  }, []);
  const officialSnapshotId = officialData.meta?.snapshotId ?? null;
  const officialBaseDate = officialData.meta?.baseDate ?? "2025-05-01";
  const officialFetchedDate = officialData.meta?.fetchedAt
    ? String(officialData.meta.fetchedAt).slice(0, 10)
    : "TBD";

  // 그룹 목록 로드 (API → fallback to mock)
  useEffect(() => {
    fetchGroups()
      .then((groups) => setApiGroups(groups))
      .catch(() => {
        // 서버 미실행 시 mock 데이터로 fallback
        const mockGroups: ApiGroup[] = Object.values(GROUPS).map((g) => ({
          id: g.group.id,
          name_ko: g.group.name,
          name_en: null,
          owner_name: g.group.owner,
          data_year: g.group.year,
          data_source: "mock" as const,
          synced_at: null,
        }));
        setApiGroups(mockGroups);
      })
      .finally(() => setGroupsLoading(false));
  }, []);

  useEffect(() => {
    const graphPayload = {
      groupId: officialData.meta?.groupId ?? "samsung",
      snapshotId: officialData.meta?.snapshotId ?? null,
      nodes: Array.isArray(officialData.graph?.nodes) ? officialData.graph.nodes : [],
      edges: Array.isArray(officialData.graph?.edges) ? officialData.graph.edges : [],
      cycles: [],
      snapshots: [],
      mode: "official" as const,
    };
    const mapped = mapOfficialGraphToNetwork(graphPayload);
    setNodes(mapped.nodes);
    setEdges(mapped.edges);
    setSimulatedEdges(mapped.edges);
  }, [selectedGroupId]);

  useEffect(() => {
    setRadialCenter(resolveInitialRadialCenter(nodes, simulatedEdges));
    setRadialHistory([]);
  }, [selectedGroupId, effectiveDataSource, nodes, simulatedEdges]);

  const handleGroupChange = (id: string) => {
    setSelectedGroupId(id);
    setSelectedNodeId(null);
    setHighlightStep(0);
    setShowSimulator(false);
  };

  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => (prev === nodeId ? null : nodeId));
  }, []);

  const handleG6NodeClick = useCallback(
    (node: ShareNode) => {
      handleNodeClick(node.id);
      if (layoutMode !== "radial") return;
      setRadialCenter((prev) => {
        if (!prev || prev === node.id) return node.id;
        setRadialHistory((history) => [...history, prev]);
        return node.id;
      });
    },
    [handleNodeClick, layoutMode]
  );

  const handleRadialBack = useCallback(() => {
    setRadialHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory;
      const nextHistory = [...prevHistory];
      const previousCenter = nextHistory.pop() ?? null;
      if (!previousCenter) return prevHistory;
      setRadialCenter(previousCenter);
      setSelectedNodeId(previousCenter);
      return nextHistory;
    });
  }, []);

  const visibleGraph = useMemo(() => {
    if (layoutMode !== "radial") {
      return { nodes, edges: simulatedEdges };
    }
    const validCenter = radialCenter && nodes.some((n) => n.id === radialCenter)
      ? radialCenter
      : resolveInitialRadialCenter(nodes, simulatedEdges);
    if (!validCenter) return { nodes, edges: simulatedEdges };
    const subgraph = getRadialSubgraph(validCenter, nodes, simulatedEdges);
    return {
      nodes: orderNodesWithCenterFirst(validCenter, subgraph.nodes),
      edges: subgraph.edges,
    };
  }, [layoutMode, nodes, simulatedEdges, radialCenter]);

  const handleEdgeWeightChange = (source: string, target: string, newWeight: number) => {
    setSimulatedEdges((prev) =>
      prev.map((e) =>
        e.source === source && e.target === target
          ? { ...e, weight: newWeight }
          : e
      )
    );
  };

  const applyCustomThreshold = () => {
    const parsed = Number(customThreshold);
    if (!Number.isFinite(parsed)) return;
    const bounded = Math.max(0, Math.min(100, parsed));
    setVrThresholdPercent(bounded);
    setCustomThreshold(String(bounded));
  };

  return (
    <div
      className={`app-layout${leftPanelOpen ? "" : " left-collapsed"}${rightPanelOpen ? "" : " right-collapsed"}`}
    >
      <aside className={`sidebar${leftPanelOpen ? "" : " collapsed"}`}>
        <GroupSelector
          groups={apiGroups}
          selectedId={selectedGroupId}
          onSelect={handleGroupChange}
          loading={groupsLoading}
        />
        <ScrollyNav
          currentStep={highlightStep}
          onStepChange={setHighlightStep}
          nodes={nodes}
          edges={edges}
          groupName={apiGroups.find((g) => g.id === selectedGroupId)?.name_ko ?? selectedGroupId}
        />
      </aside>

      <main className="main-view">
        {networkLoading && (
          <div className="network-loading-overlay">
            <div className="ai-spinner large" />
          </div>
        )}
        <div className="global-toolbar">
          <div className="toolbar-group">
            <button
              type="button"
              onClick={() => setGraphViewMode("legacy")}
              className={graphViewMode === "legacy" ? "active" : ""}
            >
              기존 뷰
            </button>
            <button
              type="button"
              onClick={() => setGraphViewMode("g6")}
              className={graphViewMode === "g6" ? "active" : ""}
            >
              G6 뷰
            </button>
          </div>
          <div className="toolbar-group">
            <button
              type="button"
              className={`layout-toggle-btn ${layoutMode === "dagre" ? "active" : ""}`}
              onClick={() => setLayoutMode("dagre")}
            >
              계층형
            </button>
            <button
              type="button"
              className={`layout-toggle-btn ${layoutMode === "radial" ? "active" : ""}`}
              onClick={() => setLayoutMode("radial")}
            >
              방사형
            </button>
            <span className="source-badge official">Official Static Data</span>
          </div>
          <div className="toolbar-group">
            <button
              type="button"
              className={`panel-toggle-btn ${leftPanelOpen ? "active" : ""}`}
              onClick={() => setLeftPanelOpen((v) => !v)}
              title="기업목록 패널"
            >
              ◧
            </button>
            <button
              type="button"
              className={`panel-toggle-btn ${rightPanelOpen ? "active" : ""}`}
              onClick={() => setRightPanelOpen((v) => !v)}
              title="분석 패널"
            >
              ◨
            </button>
            <button
              type="button"
              className="info-btn"
              onClick={() => setShowInfo((v) => !v)}
              aria-expanded={showInfo}
            >
              ⓘ Info
            </button>
          </div>
        </div>
        {graphViewMode === "g6" && (
          <div className="g6-subtoolbar">
            <div className="toolbar-group">
              <button
                type="button"
                className={riskMode === "ownership" ? "active" : ""}
                onClick={() => setRiskMode("ownership")}
              >
                Ownership
              </button>
              <button
                type="button"
                className={riskMode === "wedge" ? "active" : ""}
                onClick={() => setRiskMode("wedge")}
              >
                Wedge
              </button>
            </div>
            <div className="toolbar-group threshold-group">
              <span>threshold</span>
              {[10, 20, 30].map((v) => (
                <button
                  key={v}
                  type="button"
                  className={vrThresholdPercent === v ? "active" : ""}
                  onClick={() => {
                    setVrThresholdPercent(v);
                    setCustomThreshold(String(v));
                  }}
                >
                  {v === 30 ? "30% KR" : `${v}%`}
                </button>
              ))}
              <label className="custom-threshold-inline">
                <span>Custom</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  onBlur={applyCustomThreshold}
                />
              </label>
            </div>
            {layoutMode === "radial" && (
              <div className="toolbar-group">
                <button
                  type="button"
                  className="radial-back-btn"
                  disabled={radialHistory.length === 0}
                  onClick={handleRadialBack}
                >
                  ← 이전 중심
                </button>
              </div>
            )}
          </div>
        )}
        {showInfo && (
          <div className="toolbar-info-panel" role="dialog" aria-label="Graph Info">
            <p>Preview/Official 데이터 모드와 G6 위험 표시 옵션을 전환할 수 있습니다.</p>
            <p>VR calculation is model-based. Not legal advice.</p>
            <p>Matrix preview limit: 50 nodes. Circular voting restriction is not auto-applied.</p>
          </div>
        )}
        <div className="graph-stage">
          {graphViewMode === "legacy" ? (
            <ChaebolNetworkMap
              nodes={nodes}
              edges={simulatedEdges}
              highlightStep={highlightStep}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
              onEdgeWeightChange={handleEdgeWeightChange}
            />
          ) : (
            <GraphCanvasG6
              nodes={visibleGraph.nodes}
              edges={visibleGraph.edges}
              onNodeClick={handleG6NodeClick}
              vrThresholdPercent={vrThresholdPercent}
              riskMode={riskMode}
              dataSourceMode={effectiveDataSource}
              layoutMode={layoutMode}
              radialCenter={radialCenter}
            />
          )}
        </div>

        <div className="map-btn-row">
          <button
            className={`simulator-toggle-btn ${showSimulator ? "active" : ""}`}
            onClick={() => setShowSimulator((v) => !v)}
          >
            {showSimulator ? "✕ 시뮬레이터 닫기" : "⚡ What-If 시뮬레이터"}
          </button>
          <button
            className={`simulator-toggle-btn chord-btn ${showChord ? "active" : ""}`}
            onClick={() => setShowChord((v) => !v)}
          >
            {showChord ? "✕ Chord 닫기" : "◎ Chord 다이어그램"}
          </button>
        </div>

        {showSimulator && (
          <WhatIfSimulator
            nodes={nodes}
            originalEdges={edges}
            simulatedEdges={simulatedEdges}
            onEdgesChange={setSimulatedEdges}
            groupName={apiGroups.find((g) => g.id === selectedGroupId)?.name_ko ?? selectedGroupId}
            onClose={() => setShowSimulator(false)}
          />
        )}
        {showChord && (
          <div className="chord-overlay animate-fade-in">
            <ChordDiagram nodes={nodes} edges={simulatedEdges} />
          </div>
        )}
      </main>

      <aside className={`detail-panel${rightPanelOpen ? "" : " collapsed"}`}>
        {effectiveDataSource === "official" && officialScores && (
          <div className="official-status-card">
            <div className="official-status-title">API Official Status</div>
            <div className="official-source-meta">
              <div>공식 정적 데이터 로드 중</div>
            </div>
            {officialSnapshotId && (
              <div className="official-status-row">
                <span>snapshotId</span>
                <strong>{officialSnapshotId}</strong>
              </div>
            )}
            <div className="official-status-row">
              <span>methodology_version</span>
              <strong>{officialScores.methodology_version}</strong>
            </div>
            <div className="official-status-row">
              <span>cfrStatus</span>
              <strong>{officialScores.cfrStatus}</strong>
            </div>
            <div className="official-status-row">
              <span>scoreStatus</span>
              <strong>{officialScores.scoreStatus}</strong>
            </div>
            <div className="official-status-row">
              <span>scores count</span>
              <strong>{officialScores.scores.length}</strong>
            </div>
            {(officialScores.warnings?.length ?? 0) > 0 && (
              <ul className="official-warning-list">
                {officialScores.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            )}
            {officialScores.scores.length > 0 && (
              <div className="official-score-preview">
                <div>
                  sample cfr: <strong>{String((officialScores.scores[0] as { cfr?: number }).cfr ?? "n/a")}</strong>
                </div>
                <div>
                  sample score: <strong>{String((officialScores.scores[0] as { finalScore?: number }).finalScore ?? "n/a")}</strong>
                </div>
              </div>
            )}
          </div>
        )}
        <SankeyWedgeAnalyzer
          targetId={selectedNodeId}
          nodes={nodes}
          edges={simulatedEdges}
        />
        <AIAnalysisPanel
          nodeId={selectedNodeId}
          nodes={nodes}
          edges={simulatedEdges}
          isSimulated={JSON.stringify(simulatedEdges) !== JSON.stringify(edges)}
          vrThresholdPercent={vrThresholdPercent}
        />
      </aside>
      <div className="global-disclaimer" role="note">
        <span>공정위 2025 붙임3 삼성 소유지분도 PDF 기반 추출 데이터</span>
        <span aria-hidden="true"> · </span>
        <span>기준일: {officialBaseDate} | 추출일: {officialFetchedDate}</span>
        <span aria-hidden="true"> · </span>
        <span>실시간 데이터 아님 · 정보 제공 목적 · 투자 자문 아님</span>
      </div>
    </div>
  );
}

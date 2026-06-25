import express from "express";
import cors from "cors";
import "dotenv/config";
import { listGroups, getGroupNetwork } from "./db/groupRepo.js";
import { query } from "./db/pool.js";
import { analyzeWithBedrock } from "./api/bedrockAnalyzer.js";

const app = express();
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

// ── 헬스체크 ──────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// ── 전체 그룹 목록 ────────────────────────────────────
app.get("/api/groups", async (_req, res) => {
  try {
    const groups = await listGroups();
    res.json({ groups });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── 그룹 네트워크 데이터 ──────────────────────────────
app.get("/api/groups/:groupId/network", async (req, res) => {
  try {
    const data = await getGroupNetwork(req.params.groupId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── 순환출자 고리 목록 ────────────────────────────────
app.get("/api/groups/:groupId/circular-loops", async (req, res) => {
  try {
    const rows = await query(
      `SELECT src.name_ko AS source, tgt.name_ko AS target,
              s.ownership_pct, s.data_year, s.data_source
       FROM shareholdings s
       JOIN companies src ON src.id = s.source_company_id
       JOIN companies tgt ON tgt.id = s.target_company_id
       WHERE s.group_id = ? AND s.is_circular = 1`,
      [req.params.groupId]
    );
    res.json({ loops: rows });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── AI 분석 (Bedrock Nova) ────────────────────────────
app.post("/api/analyze", async (req, res) => {
  try {
    const result = await analyzeWithBedrock(req.body);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// ── API 동기화 상태 ───────────────────────────────────
app.get("/api/sync-status", async (_req, res) => {
  try {
    const logs = await query(
      `SELECT api_source, status, records_inserted, started_at, finished_at
       FROM api_sync_logs ORDER BY started_at DESC LIMIT 20`
    );
    res.json({ logs });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

const PORT = Number(process.env.PORT ?? 3001);
app.listen(PORT, () => {
  console.log(`\n🚀 Chaebol API Server: http://localhost:${PORT}\n`);
});

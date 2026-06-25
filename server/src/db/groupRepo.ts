import { query } from "./pool.js";

export interface DbGroup {
  id: string;
  name_ko: string;
  name_en: string | null;
  owner_name: string | null;
  data_year: number;
  data_source: string;
  synced_at: Date | null;
}

export interface DbCompany {
  id: number;
  group_id: string;
  dart_corp_code: string | null;
  name_ko: string;
  node_type: string;
  is_listed: number;
  stock_code: string | null;
  total_assets: number | null;
  description_ko: string | null;
  data_source: string;
}

export interface DbShareholding {
  id: number;
  group_id: string;
  source_name: string;
  target_name: string;
  ownership_pct: number;
  edge_type: string;
  is_circular: number;
  data_year: number;
  data_source: string;
}

// ── 그룹 목록 조회 ──────────────────────────────────────
export function listGroups(): Promise<DbGroup[]> {
  return query<DbGroup>("SELECT * FROM chaebol_groups ORDER BY id");
}

// ── 특정 그룹의 전체 네트워크 데이터 (프론트엔드 형식으로 변환) ──
export async function getGroupNetwork(groupId: string) {
  const companies = await query<DbCompany>(
    "SELECT * FROM companies WHERE group_id = ? AND is_active = 1",
    [groupId]
  );

  const shareholdings = await query<DbShareholding>(
    `SELECT s.*,
            src.name_ko AS source_name,
            tgt.name_ko AS target_name
     FROM shareholdings s
     JOIN companies src ON src.id = s.source_company_id
     JOIN companies tgt ON tgt.id = s.target_company_id
     WHERE s.group_id = ?`,
    [groupId]
  );

  // 프론트엔드 형식으로 변환
  const nodes = companies.map((c) => ({
    id: slugify(c.name_ko),
    label: c.name_ko,
    type: c.node_type,
    asset: c.total_assets ?? 0,
    listed: c.is_listed === 1,
    ticker: c.stock_code ?? undefined,
    description: c.description_ko ?? "",
    dart_corp_code: c.dart_corp_code,
    data_source: c.data_source,
  }));

  const edges = shareholdings.map((s) => ({
    source: slugify(s.source_name),
    target: slugify(s.target_name),
    weight: Number(s.ownership_pct),
    type: s.edge_type,
    description: `${s.source_name} → ${s.target_name} ${s.ownership_pct}%`,
    is_circular: s.is_circular === 1,
    data_source: s.data_source,
  }));

  return { nodes, edges };
}

// ── DART 동기화 후 회사 upsert ──────────────────────────
export async function upsertCompany(data: {
  group_id: string;
  dart_corp_code: string;
  corp_reg_no?: string;
  name_ko: string;
  name_en?: string;
  is_listed: boolean;
  stock_code?: string;
  stock_market?: string;
  total_assets?: number;
  fiscal_year?: number;
  industry_code?: string;
  industry_name?: string;
  description_ko?: string;
  node_type?: string;
}) {
  await query(
    `INSERT INTO companies
       (group_id, dart_corp_code, corp_reg_no, name_ko, name_en,
        node_type, is_listed, stock_code, stock_market,
        total_assets, fiscal_year, industry_code, industry_name,
        description_ko, data_source, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dart', NOW())
     ON DUPLICATE KEY UPDATE
       name_ko = VALUES(name_ko),
       is_listed = VALUES(is_listed),
       stock_code = VALUES(stock_code),
       total_assets = VALUES(total_assets),
       synced_at = NOW()`,
    [
      data.group_id, data.dart_corp_code, data.corp_reg_no ?? null,
      data.name_ko, data.name_en ?? null,
      data.node_type ?? "affiliate",
      data.is_listed ? 1 : 0,
      data.stock_code ?? null, data.stock_market ?? null,
      data.total_assets ?? null, data.fiscal_year ?? null,
      data.industry_code ?? null, data.industry_name ?? null,
      data.description_ko ?? null,
    ]
  );
}

// ── 지분 관계 upsert ────────────────────────────────────
export async function upsertShareholding(data: {
  group_id: string;
  source_corp_code: string;
  target_corp_code: string;
  ownership_pct: number;
  voting_pct?: number;
  shares_held?: number;
  edge_type: string;
  is_circular: boolean;
  report_date?: string;
  data_year: number;
}) {
  await query(
    `INSERT INTO shareholdings
       (group_id, source_company_id, target_company_id,
        ownership_pct, voting_pct, shares_held,
        edge_type, is_circular, report_date, data_year,
        data_source, synced_at)
     SELECT ?, s.id, t.id, ?, ?, ?, ?, ?, ?, ?, 'dart', NOW()
     FROM companies s, companies t
     WHERE s.dart_corp_code = ? AND t.dart_corp_code = ?
     ON DUPLICATE KEY UPDATE
       ownership_pct = VALUES(ownership_pct),
       synced_at = NOW()`,
    [
      data.group_id,
      data.ownership_pct, data.voting_pct ?? null,
      data.shares_held ?? null,
      data.edge_type, data.is_circular ? 1 : 0,
      data.report_date ?? null, data.data_year,
      data.source_corp_code, data.target_corp_code,
    ]
  );
}

// ── 동기화 로그 기록 ────────────────────────────────────
export async function logSync(data: {
  api_source: "dart" | "kftc" | "manual";
  endpoint: string;
  group_id?: string;
  request_params?: object;
  status: "success" | "fail" | "partial";
  records_inserted?: number;
  records_updated?: number;
  error_message?: string;
  response_code?: number;
  started_at: Date;
}) {
  await query(
    `INSERT INTO api_sync_logs
       (api_source, endpoint, group_id, request_params, status,
        records_inserted, records_updated, error_message,
        response_code, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      data.api_source, data.endpoint, data.group_id ?? null,
      data.request_params ? JSON.stringify(data.request_params) : null,
      data.status,
      data.records_inserted ?? 0, data.records_updated ?? 0,
      data.error_message ?? null, data.response_code ?? null,
      data.started_at,
    ]
  );
}

function slugify(name: string): string {
  return name.replace(/[^a-zA-Z0-9가-힣]/g, "_").toLowerCase();
}

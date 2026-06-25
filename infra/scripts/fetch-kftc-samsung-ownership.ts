import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type RawResponseRecord = {
  endpoint: string;
  url: string;
  presentnYm: string;
  unityGrupCode?: string;
  fetchedAt: string;
  xml: string;
};

type EdgeCandidate = {
  sourceId: string;
  targetId: string;
  weight: number;
  relationType: string;
  sourceType: "KFTC";
  presentnYm: string;
  asOfDate: string;
  sourceUrl: string;
  sourceRef: string;
};

type DryRunSummary = {
  groupId: "samsung";
  presentnYm: string | null;
  unityGrupCode: string | null;
  edgeCount: number;
  maxColumnSum: number;
  invalidEdges: number;
  duplicatePairs: number;
  warnings: string[];
};

const args = new Set(process.argv.slice(2));
const dryRun = !args.has("--write");
const explicitYm = process.argv.find((a) => a.startsWith("--presentnYm="))?.split("=")[1];
const explicitGroupCode = process.argv.find((a) => a.startsWith("--unityGrupCode="))?.split("=")[1];
const maxMonthsArg = process.argv.find((a) => a.startsWith("--maxMonths="))?.split("=")[1];
const maxMonths = Number(maxMonthsArg ?? "36");

const apiKey = process.env.KFTC_API_KEY ?? process.env.DATA_GO_KR_API_KEY;
if (!apiKey) {
  console.error("KFTC_API_KEY or DATA_GO_KR_API_KEY is required");
  process.exit(1);
}

const here = path.dirname(fileURLToPath(import.meta.url));
const generatedDir = path.resolve(here, "../generated");
fs.mkdirSync(generatedDir, { recursive: true });

function buildYmCandidates(maxBackMonths: number): string[] {
  if (explicitYm) return [explicitYm];
  const out: string[] = [];
  const now = new Date();
  for (let i = 0; i < maxBackMonths; i += 1) {
    const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    out.push(`${y}${m}`);
  }
  return Array.from(new Set(out));
}

function buildGroupCodeCandidates(): string[] {
  if (explicitGroupCode) return [explicitGroupCode];
  // NOTE: Samsung code mapping is not publicly documented in this workspace.
  // Keep a broad candidate set and record dry-run evidence instead of forcing writes.
  const base = ["001", "01", "1", "samsung", "SAMSUNG"];
  for (let i = 1; i <= 120; i += 1) {
    base.push(String(i).padStart(3, "0"));
  }
  return Array.from(new Set(base));
}

function parseTag(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1].trim() : null;
}

function parseItems(xml: string): Array<Record<string, string>> {
  const blocks = xml.match(/<item>([\s\S]*?)<\/item>/gi) ?? [];
  return blocks.map((block) => {
    const row: Record<string, string> = {};
    const tagRegex = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/g;
    let m: RegExpExecArray | null = null;
    while ((m = tagRegex.exec(block)) !== null) {
      row[m[1]] = m[2].trim();
    }
    return row;
  });
}

function normalizeRatio(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(n)) return NaN;
  // KFTC percent-like values are expected. Convert to ratio.
  if (n > 1) return n / 100;
  return n;
}

function mapItemsToEdges(
  items: Array<Record<string, string>>,
  presentnYm: string,
  sourceUrl: string
): { edges: EdgeCandidate[]; warnings: string[] } {
  const warnings: string[] = [];
  const edges: EdgeCandidate[] = [];

  for (const item of items) {
    const sourceId =
      item.shhldrId ??
      item.shhldrNm ??
      item.ownrNm ??
      item.sourceId ??
      item.ptyOtlkNm ??
      "";
    const targetId =
      item.cmpnyId ??
      item.affCmpnyNm ??
      item.trgtCmpnyNm ??
      item.targetId ??
      item.unityGrupNm ??
      "";
    const rawPct =
      item.stkRt ??
      item.qotaRt ??
      item.ownshpRt ??
      item.innrtQotaRt ??
      item.qota ??
      "";

    if (!sourceId || !targetId || rawPct === "") {
      warnings.push(`Unmappable item fields: ${JSON.stringify(item)}`);
      continue;
    }

    const ratio = normalizeRatio(rawPct);
    if (!Number.isFinite(ratio) || ratio < 0 || ratio > 1) {
      warnings.push(`Invalid ratio from item: source=${sourceId} target=${targetId} raw=${rawPct}`);
      continue;
    }

    edges.push({
      sourceId: sourceId.replace(/\s+/g, "_").toLowerCase(),
      targetId: targetId.replace(/\s+/g, "_").toLowerCase(),
      weight: ratio,
      relationType: "subsidiary_ownership",
      sourceType: "KFTC",
      presentnYm,
      asOfDate: `${presentnYm.slice(0, 4)}-${presentnYm.slice(4, 6)}-01`,
      sourceUrl,
      sourceRef: `KFTC ${presentnYm}`,
    });
  }

  return { edges, warnings };
}

function validateEdges(edges: EdgeCandidate[]): { warnings: string[]; maxColumnSum: number; duplicatePairs: number } {
  const warnings: string[] = [];
  const byTarget = new Map<string, number>();
  const pairSeen = new Set<string>();
  let duplicatePairs = 0;

  for (const e of edges) {
    const pair = `${e.sourceId}->${e.targetId}`;
    if (pairSeen.has(pair)) duplicatePairs += 1;
    pairSeen.add(pair);
    byTarget.set(e.targetId, (byTarget.get(e.targetId) ?? 0) + e.weight);
  }

  let maxColumnSum = 0;
  for (const [target, sum] of byTarget) {
    if (sum > maxColumnSum) maxColumnSum = sum;
    if (sum > 1 + 1e-12) warnings.push(`COLUMN_SUM_EXCEEDS_ONE target=${target} sum=${sum}`);
  }
  return { warnings, maxColumnSum, duplicatePairs };
}

async function fetchXml(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  const ymCandidates = buildYmCandidates(maxMonths);
  const groupCodes = buildGroupCodeCandidates();
  const rawRecords: RawResponseRecord[] = [];

  let chosenYm: string | null = null;
  let chosenCode: string | null = null;
  let chosenItems: Array<Record<string, string>> = [];
  let chosenUrl = "";
  const warnings: string[] = [];

  for (const ym of ymCandidates) {
    for (const code of groupCodes) {
      const baseUrl = "https://apis.data.go.kr/1130000/innerQotaEqltrmCmprList/innerQotaEqltrmCmprUnityListApi";
      const url = `${baseUrl}?serviceKey=${encodeURIComponent(apiKey)}&presentnYm=${ym}&unityGrupCode=${encodeURIComponent(code)}&numOfRows=1000&pageNo=1`;
      let xml = "";
      try {
        xml = await fetchXml(url);
      } catch (err) {
        warnings.push(String(err));
        continue;
      }
      rawRecords.push({
        endpoint: "innerQotaEqltrmCmprUnityListApi",
        url,
        presentnYm: ym,
        unityGrupCode: code,
        fetchedAt: new Date().toISOString(),
        xml,
      });

      const resultCode = parseTag(xml, "resultCode");
      const totalCount = Number(parseTag(xml, "totalCount") ?? "0");
      if (resultCode === "00" && totalCount > 0) {
        chosenYm = ym;
        chosenCode = code;
        chosenItems = parseItems(xml);
        chosenUrl = url;
        break;
      }
    }
    if (chosenYm) break;
  }

  let edges: EdgeCandidate[] = [];
  if (chosenItems.length > 0) {
    const mapped = mapItemsToEdges(chosenItems, chosenYm!, chosenUrl);
    edges = mapped.edges;
    warnings.push(...mapped.warnings);
  } else {
    warnings.push("No KFTC rows found with current candidate parameters (resultCode=00 but totalCount=0).");
  }

  const check = validateEdges(edges);
  warnings.push(...check.warnings);
  const invalidEdges = check.warnings.filter((w) => w.startsWith("Invalid ratio")).length;

  const dryRunSummary: DryRunSummary = {
    groupId: "samsung",
    presentnYm: chosenYm,
    unityGrupCode: chosenCode,
    edgeCount: edges.length,
    maxColumnSum: check.maxColumnSum,
    invalidEdges,
    duplicatePairs: check.duplicatePairs,
    warnings,
  };

  const rawFile = path.resolve(generatedDir, "kftc-samsung-raw-responses.json");
  const edgeFile = path.resolve(generatedDir, "kftc-samsung-ownership-dryrun.json");
  fs.writeFileSync(rawFile, JSON.stringify({ fetchedAt: new Date().toISOString(), records: rawRecords }, null, 2));
  fs.writeFileSync(edgeFile, JSON.stringify({ summary: dryRunSummary, edges }, null, 2));

  console.log(JSON.stringify(dryRunSummary, null, 2));
  if (!dryRun) {
    console.error("This script is fetch/normalize only. Use upsert-kftc-samsung-to-dynamodb.ts for writes.");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


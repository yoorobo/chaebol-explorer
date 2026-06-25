import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ReviewRow = {
  include: string;
  sourceName: string;
  targetName: string;
  rawPercent: string;
  weight: string;
  edgeType: string;
  sourceRef: string;
  note: string;
  rowNo: number;
};

type Edge = {
  sourceName: string;
  targetName: string;
  sourceId: string;
  targetId: string;
  rawPercent: number;
  weight: number;
  edgeType: string;
  sourceRef: string;
  note: string;
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || !args.has("--write");
const here = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.resolve(here, "../source/ftc/2025-stock-ownership/manual/samsung-edges-review.csv");
const outPath = path.resolve(here, "../generated/ftc-2025-samsung-edges-dryrun.json");

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }
    if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function includeFlag(v: string): boolean {
  const s = v.toLowerCase().trim();
  return s === "1" || s === "true" || s === "y" || s === "yes";
}

function normalizeId(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "")
    .toLowerCase();
}

function parsePercent(rawPercent: string): number {
  const n = Number(rawPercent.replace(/[%\s,]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return n;
}

function parseWeight(weight: string, rawPercent: number): number {
  if (weight.trim().length === 0) {
    return rawPercent / 100;
  }
  const n = Number(weight.replace(/[%\s,]/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return n > 1 ? n / 100 : n;
}

function main() {
  if (!fs.existsSync(csvPath)) {
    throw new Error(`Missing CSV template: ${csvPath}`);
  }
  const lines = fs.readFileSync(csvPath, "utf8").split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV has no data rows");

  const headers = parseCsvLine(lines[0]);
  const required = ["include", "sourceName", "targetName", "rawPercent", "weight", "edgeType", "sourceRef", "note"];
  for (const key of required) {
    if (!headers.includes(key)) throw new Error(`Missing header: ${key}`);
  }

  const rows: ReviewRow[] = lines.slice(1).map((line, idx) => {
    const values = parseCsvLine(line);
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => {
      rec[h] = values[i] ?? "";
    });
    return {
      include: rec.include ?? "",
      sourceName: rec.sourceName ?? "",
      targetName: rec.targetName ?? "",
      rawPercent: rec.rawPercent ?? "",
      weight: rec.weight ?? "",
      edgeType: rec.edgeType ?? "",
      sourceRef: rec.sourceRef ?? "",
      note: rec.note ?? "",
      rowNo: idx + 2,
    };
  });

  const selected = rows.filter((r) => includeFlag(r.include));
  const errors: string[] = [];

  const edges: Edge[] = selected.map((r) => {
    if (!r.sourceName.trim() || !r.targetName.trim() || !r.rawPercent.trim()) {
      errors.push(`row ${r.rowNo}: sourceName/targetName/rawPercent required`);
    }
    const rawPct = parsePercent(r.rawPercent);
    const w = parseWeight(r.weight, rawPct);
    if (!Number.isFinite(rawPct) || rawPct < 0) errors.push(`row ${r.rowNo}: invalid rawPercent ${r.rawPercent}`);
    if (!Number.isFinite(w) || w < 0 || w > 1) errors.push(`row ${r.rowNo}: invalid weight ${r.weight || "(auto)"}`);
    return {
      sourceName: r.sourceName,
      targetName: r.targetName,
      sourceId: normalizeId(r.sourceName),
      targetId: normalizeId(r.targetName),
      rawPercent: rawPct,
      weight: w,
      edgeType: r.edgeType || "subsidiary_ownership",
      sourceRef: r.sourceRef || "FTC 2025 붙임3 삼성 소유지분도",
      note: r.note,
    };
  });

  if (edges.length === 0) {
    errors.push("No included rows. Mark include=true/1/y for reviewed rows.");
  }

  const byTarget = new Map<string, number>();
  const dupSet = new Set<string>();
  const seen = new Set<string>();
  for (const e of edges) {
    const pair = `${e.sourceId}->${e.targetId}`;
    if (seen.has(pair)) dupSet.add(pair);
    seen.add(pair);
    byTarget.set(e.targetId, (byTarget.get(e.targetId) ?? 0) + e.weight);
  }
  const offendingTargets: Array<{ targetId: string; sum: number }> = [];
  let maxColumnSum = 0;
  for (const [targetId, sum] of byTarget) {
    if (sum > maxColumnSum) maxColumnSum = sum;
    if (sum > 1 + 1e-12) offendingTargets.push({ targetId, sum });
  }
  if (offendingTargets.length > 0) {
    errors.push(`COLUMN_SUM_EXCEEDS_ONE: ${offendingTargets.map((x) => `${x.targetId}=${x.sum}`).join(", ")}`);
  }

  const result = {
    generatedAt: new Date().toISOString(),
    mode: dryRun ? "dry-run" : "write",
    sourceCsv: path.relative(process.cwd(), csvPath),
    edgeCount: edges.length,
    maxColumnSum,
    offendingTargets,
    duplicatePairs: [...dupSet],
    errors,
    writeAllowed: errors.length === 0,
    edges,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ edgeCount: edges.length, maxColumnSum, writeAllowed: errors.length === 0, errors }, null, 2));

  if (errors.length > 0) {
    process.exit(1);
  }
}

main();


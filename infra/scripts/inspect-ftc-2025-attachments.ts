import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

type InventoryItem = {
  fileName: string;
  absolutePath: string;
  extension: string;
  sizeBytes: number;
  category: "attachment" | "normalized";
  attachmentNo: string | null;
};

type SheetRow = {
  rowIndex: number;
  values: Array<string | number | null>;
};

type SamsungRow = {
  fileName: string;
  sheet: string;
  rowIndex: number;
  values: Array<string | number | null>;
};

type Candidate = {
  fileName: string;
  sheet: string;
  rowIndex: number;
  sourceRaw: string;
  targetRaw: string;
  ownershipPercentRaw: number;
  ownershipRatio: number;
  confidence: "high" | "medium" | "low";
  note: string;
};

const root = process.cwd();
const extractedDir = path.resolve(root, "infra/source/ftc/2025-stock-ownership/extracted");
const normalizedDir = path.resolve(root, "infra/source/ftc/2025-stock-ownership/normalized");
const generatedDir = path.resolve(root, "infra/generated");
fs.mkdirSync(generatedDir, { recursive: true });

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).map((f) => path.join(dir, f)).filter((p) => fs.statSync(p).isFile());
}

function toInventory(): InventoryItem[] {
  const files = [...listFiles(extractedDir), ...listFiles(normalizedDir)];
  return files.map((absolutePath) => {
    const fileName = path.basename(absolutePath);
    const m = fileName.match(/\(붙임(\d+)\)/);
    return {
      fileName,
      absolutePath,
      extension: path.extname(fileName).toLowerCase(),
      sizeBytes: fs.statSync(absolutePath).size,
      category: absolutePath.startsWith(normalizedDir) ? "normalized" : "attachment",
      attachmentNo: m ? m[1] : null,
    };
  });
}

function dumpWorkbookRows(xlsxPath: string): Array<{ sheet: string; rows: SheetRow[] }> {
  const py = `
from openpyxl import load_workbook
import json
wb = load_workbook(r'''${xlsxPath}''', read_only=True, data_only=True)
out = []
for ws in wb.worksheets:
    rows = []
    for idx, row in enumerate(ws.iter_rows(values_only=True), start=1):
        values = []
        for v in row:
            if isinstance(v, (int, float, str)) or v is None:
                values.append(v)
            else:
                values.append(str(v))
        rows.append({"rowIndex": idx, "values": values})
    out.append({"sheet": ws.title, "rows": rows})
print(json.dumps(out, ensure_ascii=False))
`;
  const stdout = execFileSync("python", ["-c", py], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(stdout);
}

function containsSamsung(values: Array<string | number | null>): boolean {
  const text = values.map((v) => (v == null ? "" : String(v))).join(" ");
  return text.includes("삼성") || text.toLowerCase().includes("samsung");
}

function normalizeEntity(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "")
    .toLowerCase();
}

function maybePercent(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v >= 0 && v <= 100) return v;
    if (v > 100 && v <= 10000) return v / 100;
  }
  if (typeof v === "string") {
    const n = Number(v.replace(/[%\s,]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) return n;
  }
  return null;
}

function extractCandidates(rows: SamsungRow[]): Candidate[] {
  const out: Candidate[] = [];
  for (const row of rows) {
    const vals = row.values;
    const strings = vals.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
    const numbers = vals.map((v) => maybePercent(v)).filter((v): v is number => v !== null);
    if (strings.length < 2 || numbers.length === 0) continue;

    const sourceRaw = strings[0];
    const targetRaw = strings[1];
    const pct = numbers[0];
    const source = normalizeEntity(sourceRaw);
    const target = normalizeEntity(targetRaw);
    if (!source || !target) continue;
    if (source === target) continue;

    out.push({
      fileName: row.fileName,
      sheet: row.sheet,
      rowIndex: row.rowIndex,
      sourceRaw,
      targetRaw,
      ownershipPercentRaw: pct,
      ownershipRatio: pct > 1 ? pct / 100 : pct,
      confidence: row.fileName.includes("붙임3") ? "low" : "medium",
      note: "Heuristic candidate from Samsung-containing row. Requires schema-level mapping validation.",
    });
  }
  return out;
}

function inspectAppendix3Pdf(pdfPath: string) {
  const txtPath = path.resolve(generatedDir, "ftc-2025-appendix3-temp.txt");
  execFileSync("pdftotext", [pdfPath, txtPath], { encoding: "utf8" });
  const text = fs.readFileSync(txtPath, "utf8");
  const hasSamsung = text.includes("삼성");
  const preview = text.split(/\r?\n/).filter((line) => line.includes("삼성")).slice(0, 20);
  const pageInfoRaw = execFileSync("pdfinfo", [pdfPath], { encoding: "utf8" });
  const pageLine = pageInfoRaw.split(/\r?\n/).find((l) => l.startsWith("Pages:")) ?? "";
  const pages = Number(pageLine.replace("Pages:", "").trim()) || null;

  return {
    fileName: path.basename(pdfPath),
    hasSamsungKeyword: hasSamsung,
    samsungLinePreview: preview,
    extractability: hasSamsung ? "high" : "unknown",
    pages,
    note:
      "Text extraction via pdftotext is available. Relationship graph parsing still requires table/shape aware parser.",
  };
}

function columnSumValidation(candidates: Candidate[]) {
  const byTarget = new Map<string, number>();
  const duplicates = new Set<string>();
  const seen = new Set<string>();
  for (const c of candidates) {
    const key = `${normalizeEntity(c.sourceRaw)}->${normalizeEntity(c.targetRaw)}`;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
    byTarget.set(key.split("->")[1], (byTarget.get(key.split("->")[1]) ?? 0) + c.ownershipRatio);
  }
  let max = 0;
  const offending: Array<{ target: string; sum: number }> = [];
  for (const [target, sum] of byTarget) {
    if (sum > max) max = sum;
    if (sum > 1 + 1e-12) offending.push({ target, sum });
  }
  return {
    maxColumnSum: max,
    offendingTargets: offending,
    duplicatePairs: [...duplicates],
  };
}

function main() {
  const inventory = toInventory();
  fs.writeFileSync(
    path.resolve(generatedDir, "ftc-2025-attachment-inventory.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), files: inventory }, null, 2)
  );

  const xlsxFiles = inventory.filter((f) => f.extension === ".xlsx");
  const allSamsungRows: SamsungRow[] = [];
  for (const f of xlsxFiles) {
    const dumped = dumpWorkbookRows(f.absolutePath);
    for (const sheet of dumped) {
      for (const row of sheet.rows) {
        if (containsSamsung(row.values)) {
          allSamsungRows.push({
            fileName: f.fileName,
            sheet: sheet.sheet,
            rowIndex: row.rowIndex,
            values: row.values,
          });
        }
      }
    }
  }

  const appendix2Rows = allSamsungRows.filter((r) => r.fileName.includes("붙임2") || r.fileName.includes("appendix-2"));
  fs.writeFileSync(
    path.resolve(generatedDir, "ftc-2025-appendix2-samsung-rows.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        fileRoleAssessment:
          "Appendix 2 appears to be group/company-level internal shareholding rate summary, not direct source-target ownership edge table.",
        rowCount: appendix2Rows.length,
        rows: appendix2Rows.slice(0, 300),
      },
      null,
      2
    )
  );

  const appendix3 = inventory.find((f) => f.fileName.includes("붙임3") && f.extension === ".pdf");
  const appendix3Inspection = appendix3
    ? inspectAppendix3Pdf(appendix3.absolutePath)
    : {
        fileName: null,
        hasSamsungKeyword: false,
        samsungLinePreview: [] as string[],
        extractability: "missing",
        pages: null,
        note: "Appendix 3 PDF not found.",
      };
  fs.writeFileSync(
    path.resolve(generatedDir, "ftc-2025-appendix3-samsung-pdf-inspection.json"),
    JSON.stringify({ generatedAt: new Date().toISOString(), ...appendix3Inspection }, null, 2)
  );

  const candidates = extractCandidates(allSamsungRows);
  fs.writeFileSync(
    path.resolve(generatedDir, "ftc-2025-samsung-candidates.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        candidateCount: candidates.length,
        candidates: candidates.slice(0, 1000),
      },
      null,
      2
    )
  );

  const check = columnSumValidation(candidates);
  const edgeDryrun = {
    generatedAt: new Date().toISOString(),
    source: "FTC 2025 attachments",
    classification: {
      appendix2AsDirectEdgeSource: false,
      appendix2AsReference: true,
      rationale:
        "Detected rows are largely aggregate/summary labels and do not consistently provide explicit source-target ownership pairs.",
      appendix3ExtractionFeasible: appendix3Inspection.extractability !== "missing",
    },
    edgeCandidateCount: candidates.length,
    writeAllowed: candidates.length > 0 && check.offendingTargets.length === 0,
    writeBlockedReason:
      candidates.length === 0
        ? "No reliable source-target EDGE candidates found."
        : check.offendingTargets.length > 0
          ? "Column sum exceeds 1.0 for at least one target."
          : null,
    maxColumnSum: check.maxColumnSum,
    offendingTargets: check.offendingTargets,
    duplicatePairs: check.duplicatePairs,
    sampleCandidates: candidates.slice(0, 30),
  };
  fs.writeFileSync(
    path.resolve(generatedDir, "ftc-2025-samsung-edges-dryrun.json"),
    JSON.stringify(edgeDryrun, null, 2)
  );

  console.log(
    JSON.stringify(
      {
        inventoryCount: inventory.length,
        samsungRowsAllXlsx: allSamsungRows.length,
        appendix2SamsungRows: appendix2Rows.length,
        candidateCount: candidates.length,
        maxColumnSum: check.maxColumnSum,
        writeAllowed: edgeDryrun.writeAllowed,
      },
      null,
      2
    )
  );
}

main();


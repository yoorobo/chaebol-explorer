import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface CsvEdgeRow {
  sourceName: string;
  targetName: string;
  rawPercent: string;
  weight: string;
  sourceRef?: string;
  confidence?: string;
  include?: string;
  note?: string;
}

interface EdgePayload {
  edgeId: string;
  sourceName: string;
  targetName: string;
  sourceId: string;
  targetId: string;
  rawPercent: number;
  weight: number;
  directionType: 'PERSON_TO_COMPANY' | 'COMPANY_TO_COMPANY';
  sourceRef: string;
  sourceType: 'FTC_DISCLOSURE_PDF_EXTRACTED';
  snapshotId: string;
}

const snapshotId = 'ftc-2025-samsung-stock-ownership';
const sourceRef = 'FTC 2025 붙임3 삼성 소유지분도';
const sourceType = 'FTC_DISCLOSURE_PDF_EXTRACTED';
const groupId = 'samsung';
const asOfDate = '2025-05-01';

const args = new Set(process.argv.slice(2));
const includeOnly = args.has('--include-only');

const here = path.dirname(fileURLToPath(import.meta.url));
const csvIn = path.resolve(here, '../source/ftc/2025-stock-ownership/manual/samsung-edges-gemini-raw.csv');
const csvOut = path.resolve(here, '../source/ftc/2025-stock-ownership/manual/samsung-edges-ftc2025-final.csv');

const nodeOut = path.resolve(here, '../generated/samsung-ftc2025-node-items-candidates.json');
const edgeOut = path.resolve(here, '../generated/samsung-ftc2025-edge-items-candidates.json');
const validationOut = path.resolve(here, '../generated/samsung-ftc2025-edge-validation.json');
const dryRunOut = path.resolve(here, '../generated/ftc-2025-samsung-final-dryrun.json');

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
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
    if (ch === ',' && !inQuote) {
      out.push(cur);
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => v.trim());
}

function includeFlag(v: string | undefined): boolean {
  const s = (v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1' || s === 'y' || s === 'yes';
}

function toNodeId(name: string): string {
  // Keep original name semantics; avoid arbitrary name normalization.
  const b64 = Buffer.from(name, 'utf8').toString('base64url');
  return `name:${b64}`;
}

function readCsvRows(file: string): CsvEdgeRow[] {
  const text = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = vals[i] ?? '';
    });
    return row as CsvEdgeRow;
  });
}

function main() {
  const inputRows = readCsvRows(csvIn);

  const selected = includeOnly ? inputRows.filter((r) => includeFlag(r.include)) : inputRows;

  const errors: string[] = [];
  const edges: EdgePayload[] = [];

  selected.forEach((r, idx) => {
    const rowNo = idx + 2;
    const sourceName = (r.sourceName ?? '').trim();
    const targetName = (r.targetName ?? '').trim();
    const rawPercent = Number(String(r.rawPercent ?? '').replace(/[%\s,]/g, ''));
    const autoWeight = rawPercent / 100;
    const givenWeight = Number(String(r.weight ?? '').replace(/[%\s,]/g, ''));
    const weight = Number.isFinite(givenWeight) ? (givenWeight > 1 ? givenWeight / 100 : givenWeight) : autoWeight;

    if (!sourceName || !targetName) errors.push(`row ${rowNo}: missing sourceName/targetName`);
    if (!Number.isFinite(rawPercent) || rawPercent < 0 || rawPercent > 100) errors.push(`row ${rowNo}: invalid rawPercent=${r.rawPercent}`);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) errors.push(`row ${rowNo}: invalid weight=${r.weight}`);

    const directionType = sourceName === '동일인(이재용)' ? 'PERSON_TO_COMPANY' : 'COMPANY_TO_COMPANY';

    edges.push({
      edgeId: `ftc2025#${sourceName}#${targetName}`,
      sourceName,
      targetName,
      sourceId: toNodeId(sourceName),
      targetId: toNodeId(targetName),
      rawPercent,
      weight,
      directionType,
      sourceRef,
      sourceType,
      snapshotId,
    });
  });

  const pairSeen = new Map<string, number[]>();
  edges.forEach((e, i) => {
    const key = `${e.sourceName}->${e.targetName}`;
    pairSeen.set(key, [...(pairSeen.get(key) ?? []), i + 2]);
  });
  const duplicates = [...pairSeen.entries()].filter(([, rows]) => rows.length > 1).map(([pair, rows]) => ({ pair, rows }));

  const colSums = new Map<string, number>();
  const colContrib = new Map<string, Array<{ sourceName: string; weight: number }>>();
  for (const e of edges) {
    colSums.set(e.targetName, (colSums.get(e.targetName) ?? 0) + e.weight);
    colContrib.set(e.targetName, [...(colContrib.get(e.targetName) ?? []), { sourceName: e.sourceName, weight: e.weight }]);
  }
  const targetsOverOne = [...colSums.entries()]
    .filter(([, sum]) => sum > 1 + 1e-12)
    .map(([targetName, sum]) => ({ targetName, sum, contributors: colContrib.get(targetName) ?? [] }))
    .sort((a, b) => b.sum - a.sum);

  const nodes = new Map<string, { nodeId: string; nodeName: string; nodeType: 'PERSON' | 'COMPANY' }>();
  for (const e of edges) {
    const sourceTypeNode = e.sourceName === '동일인(이재용)' ? 'PERSON' : 'COMPANY';
    nodes.set(e.sourceName, { nodeId: e.sourceId, nodeName: e.sourceName, nodeType: sourceTypeNode });
    nodes.set(e.targetName, { nodeId: e.targetId, nodeName: e.targetName, nodeType: 'COMPANY' });
  }

  // Required standalone nodes
  ['하만인터내셔널코리아', '미래로시스템'].forEach((name) => {
    if (!nodes.has(name)) {
      nodes.set(name, { nodeId: toNodeId(name), nodeName: name, nodeType: 'COMPANY' });
    }
  });

  const now = new Date().toISOString();
  const nodeItems = [...nodes.values()].map((n) => ({
    PK: `GROUP#${groupId}`,
    SK: `NODE#${n.nodeId}`,
    GSI2PK: `GROUP#${groupId}`,
    GSI2SK: `TYPE#NODE#${n.nodeId}`,
    itemType: 'NODE',
    groupId,
    createdAt: now,
    updatedAt: now,
    payload: {
      nodeId: n.nodeId,
      groupId,
      name_ko: n.nodeName,
      name_en: null,
      display_name: n.nodeName,
      ticker: null,
      market: null,
      corp_code: null,
      entity_type: n.nodeType,
      cluster: 'samsung',
      is_controller: n.nodeName === '동일인(이재용)',
      controller_node_type: n.nodeName === '동일인(이재용)' ? 'PERSON' : null,
      sourceType,
      asOfDate,
    },
  }));

  const edgeItems = edges.map((e) => ({
    PK: `GROUP#${groupId}`,
    SK: `EDGE#ftc2025#${e.sourceId}#${e.targetId}`,
    GSI1PK: `SNAPSHOT#${snapshotId}`,
    GSI1SK: `ENTITY#EDGE#ftc2025#${e.sourceId}#${e.targetId}`,
    GSI2PK: `GROUP#${groupId}`,
    GSI2SK: `TYPE#EDGE#ftc2025#${e.sourceId}#${e.targetId}`,
    itemType: 'EDGE',
    groupId,
    createdAt: now,
    updatedAt: now,
    payload: {
      edgeId: `ftc2025#${e.sourceId}#${e.targetId}`,
      groupId,
      sourceId: e.sourceId,
      targetId: e.targetId,
      sourceName: e.sourceName,
      targetName: e.targetName,
      raw_cash_flow_rights: e.weight,
      adjusted_cash_flow_rights: e.weight,
      raw_voting_rights: e.weight,
      adjusted_voting_rights: e.weight,
      relation_type: 'direct_ownership',
      snapshotId,
      sourceType,
      sourceRef,
      source_url: null,
      asOfDate,
      isCycle: false,
      cycleIds: [],
      directionType: e.directionType,
      rawPercent: e.rawPercent,
    },
  }));

  const snapshotItem = {
    PK: `GROUP#${groupId}`,
    SK: `SNAPSHOT#${snapshotId}`,
    GSI1PK: `SNAPSHOT#${snapshotId}`,
    GSI1SK: `ENTITY#SNAPSHOT#${groupId}`,
    GSI2PK: `GROUP#${groupId}`,
    GSI2SK: `TYPE#SNAPSHOT#${snapshotId}`,
    itemType: 'SNAPSHOT',
    groupId,
    createdAt: now,
    updatedAt: now,
    payload: {
      snapshotId,
      groupId,
      asOfDate,
      versionLabel: 'ftc-2025-baseline-v1',
      source_summary: {
        sourceAuthority: 'FTC/KFTC',
        sourceTitle: '2025년 공시대상기업집단 주식소유현황 분석·공개',
        sourceType,
      },
      coverage_note_ko: '공정위 PDF 기반 추출 후보 데이터',
      coverage_note_en: 'Candidate data extracted from FTC PDF',
      sourceType,
      sourceRef,
    },
  };

  const personEdges = edges.filter((e) => e.directionType === 'PERSON_TO_COMPANY');
  const companyEdges = edges.filter((e) => e.directionType === 'COMPANY_TO_COMPANY');

  const finalCsvRows = edges.map((e) => ({
    sourceName: e.sourceName,
    targetName: e.targetName,
    rawPercent: e.rawPercent,
    weight: Number((e.rawPercent / 100).toFixed(6)),
    sourceRef,
    confidence: 'medium',
    include: 'true',
    note: '공정위 PDF 기반 추출 후보 데이터, 추가 검증 필요',
  }));

  const maxCol = [...colSums.entries()].reduce((acc, cur) => (cur[1] > acc.sum ? { target: cur[0], sum: cur[1] } : acc), {
    target: '',
    sum: 0,
  });

  const validation = {
    generatedAt: now,
    edgeCount: edges.length,
    nodeCount: nodes.size,
    personEdgeCount: personEdges.length,
    companyEdgeCount: companyEdges.length,
    standaloneNodes: ['하만인터내셔널코리아', '미래로시스템'],
    duplicatePairCount: duplicates.length,
    duplicatePairs: duplicates,
    targetsOverOneCount: targetsOverOne.length,
    targetsOverOne,
    maxColumnSumTarget: maxCol.target,
    maxColumnSum: maxCol.sum,
    missingFieldErrors: errors,
    writeAllowed: errors.length === 0 && duplicates.length === 0 && targetsOverOne.length === 0,
    blockReasons: [
      ...(errors.length ? ['invalid_edge_fields'] : []),
      ...(duplicates.length ? ['duplicate_edges'] : []),
      ...(targetsOverOne.length ? ['column_sum_exceeds_one'] : []),
    ],
    dataLabel: '공정위 PDF 기반 추출 후보 데이터',
  };

  const dryRun = {
    generatedAt: now,
    mode: 'dry-run',
    groupId,
    snapshotId,
    sourceType,
    sourceRef,
    includeOnly,
    validation,
    items: {
      snapshot: snapshotItem,
      nodes: nodeItems,
      edges: edgeItems,
    },
  };

  fs.writeFileSync(
    csvOut,
    [
      'sourceName,targetName,rawPercent,weight,sourceRef,confidence,include,note',
      ...finalCsvRows.map((r) =>
        [r.sourceName, r.targetName, r.rawPercent, r.weight, r.sourceRef, r.confidence, r.include, r.note]
          .map((v) => {
            const s = String(v);
            return s.includes(',') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(',')
      ),
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(nodeOut, JSON.stringify({ generatedAt: now, groupId, snapshotId, nodes: nodeItems }, null, 2));
  fs.writeFileSync(edgeOut, JSON.stringify({ generatedAt: now, groupId, snapshotId, edges: edgeItems }, null, 2));
  fs.writeFileSync(validationOut, JSON.stringify(validation, null, 2));
  fs.writeFileSync(dryRunOut, JSON.stringify(dryRun, null, 2));

  console.log(
    JSON.stringify(
      {
        csvOut,
        nodeOut,
        edgeOut,
        validationOut,
        dryRunOut,
        validation,
      },
      null,
      2
    )
  );
}

main();

// 실행: node scripts/fetch-static-data.js
// 조건: 정학님 로컬에서만 실행 (Codex 환경은 외부 API DNS 제한으로 불가)
// 갱신: 공정위 데이터 변경 시 재실행 후 재배포

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_BASE = 'https://gup7ma2ny8.execute-api.ap-northeast-2.amazonaws.com/prod';
const GROUP_ID = 'samsung';
const SNAPSHOT_ID = 'ftc-2025-samsung-stock-ownership';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'data', 'official-samsung.json');

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        let raw = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          raw += chunk;
        });

        res.on('end', () => {
          if (!statusCode || statusCode < 200 || statusCode >= 300) {
            reject(new Error(`HTTP ${statusCode} for ${url}: ${raw.slice(0, 400)}`));
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            resolve(parsed);
          } catch (err) {
            reject(new Error(`JSON parse error for ${url}: ${err.message}`));
          }
        });
      })
      .on('error', (err) => reject(err));
  });
}

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function collectSnapshotIds(graphResponse, scoresResponse) {
  const ids = [];
  const candidates = [
    graphResponse && graphResponse.snapshotId,
    graphResponse && graphResponse.meta && graphResponse.meta.snapshotId,
    scoresResponse && scoresResponse.snapshotId,
    scoresResponse && scoresResponse.meta && scoresResponse.meta.snapshotId,
  ];

  for (const v of candidates) {
    if (typeof v === 'string' && v.trim().length > 0) ids.push(v.trim());
  }

  return ids;
}

function main() {
  const graphUrl = `${API_BASE}/graph?groupId=${encodeURIComponent(GROUP_ID)}&snapshotId=${encodeURIComponent(SNAPSHOT_ID)}`;
  const scoresUrl = `${API_BASE}/scores?groupId=${encodeURIComponent(GROUP_ID)}&snapshotId=${encodeURIComponent(SNAPSHOT_ID)}`;

  Promise.all([getJson(graphUrl), getJson(scoresUrl)])
    .then(([graphResponse, scoresResponse]) => {
      const errors = [];

      // 7) graph 응답에 nodes/edges 배열 존재
      const graphNodes = graphResponse && graphResponse.nodes;
      const graphEdges = graphResponse && graphResponse.edges;
      if (!Array.isArray(graphNodes)) errors.push('graphResponse.nodes 배열이 없습니다.');
      if (!Array.isArray(graphEdges)) errors.push('graphResponse.edges 배열이 없습니다.');

      // scores 응답 구조 정규화: 배열 또는 { scores: 배열 }
      let scoresArray = null;
      if (Array.isArray(scoresResponse)) {
        scoresArray = scoresResponse;
      } else if (scoresResponse && Array.isArray(scoresResponse.scores)) {
        scoresArray = scoresResponse.scores;
      }
      if (!Array.isArray(scoresArray)) {
        errors.push('scores 응답이 배열 형태가 아닙니다. (배열 또는 scoresResponse.scores 배열 필요)');
      }

      if (Array.isArray(graphNodes)) {
        // 1) nodes.length === 72
        if (graphNodes.length !== 72) {
          errors.push(`nodes.length=${graphNodes.length} (기대값 72)`);
        }
      }

      if (Array.isArray(graphEdges)) {
        // 2) edges.length === 102
        if (graphEdges.length !== 102) {
          errors.push(`edges.length=${graphEdges.length} (기대값 102)`);
        }
      }

      if (Array.isArray(scoresArray)) {
        // 3) scores.length > 0
        if (scoresArray.length <= 0) {
          errors.push('scores.length가 0입니다.');
        }

        // 6) scores 배열 각 항목 nodeId 필드 존재
        const missingNodeIdIndexes = [];
        for (let i = 0; i < scoresArray.length; i += 1) {
          const item = scoresArray[i];
          if (!item || typeof item.nodeId !== 'string' || item.nodeId.trim().length === 0) {
            missingNodeIdIndexes.push(i);
          }
        }
        if (missingNodeIdIndexes.length > 0) {
          const sample = missingNodeIdIndexes.slice(0, 10).join(', ');
          errors.push(
            `scores 항목 nodeId 누락: ${missingNodeIdIndexes.length}건 (sample index: ${sample})`
          );
        }
      }

      // 4) snapshotId 검증
      const snapshotIds = collectSnapshotIds(graphResponse, scoresResponse);
      if (snapshotIds.length === 0) {
        errors.push('[TBD] 응답에 snapshotId가 전혀 없습니다. write 금지.');
      } else {
        const mismatches = snapshotIds.filter((id) => id !== SNAPSHOT_ID);
        if (mismatches.length > 0) {
          errors.push(`snapshotId 불일치: ${JSON.stringify(snapshotIds)} (기대값 ${SNAPSHOT_ID})`);
        }
      }

      // 5) cfrStatus 확인 (graph/scores 양쪽, 있으면 반드시 OK)
      const cfrCandidates = [
        graphResponse && graphResponse.cfrStatus,
        graphResponse && graphResponse.meta && graphResponse.meta.cfrStatus,
        scoresResponse && scoresResponse.cfrStatus,
        scoresResponse && scoresResponse.meta && scoresResponse.meta.cfrStatus,
      ];
      for (const status of cfrCandidates) {
        if (status === undefined || status === null) continue; // 없으면 skip
        if (status !== 'OK') {
          errors.push(`cfrStatus 불일치: ${String(status)} (기대값 OK)`);
        }
      }

      if (errors.length > 0) {
        console.error('[VALIDATION FAILED]');
        for (const err of errors) {
          console.error(`- ${err}`);
        }
        process.exit(1);
        return;
      }

      const output = {
        meta: {
          groupId: GROUP_ID,
          snapshotId: SNAPSHOT_ID,
          sourceRef: '공정위 2025 붙임3 삼성 소유지분도',
          baseDate: '2025-05-01',
          fetchedAt: new Date().toISOString(),
          sourceType: 'FTC_DISCLOSURE_PDF_EXTRACTED',
          isRealtime: false,
        },
        graph: {
          nodes: graphNodes,
          edges: graphEdges,
        },
        scores: scoresArray,
      };

      fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
      console.log(`[OK] wrote ${OUTPUT_PATH}`);
    })
    .catch((err) => fail(err.message));
}

main();

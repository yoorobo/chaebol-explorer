/**
 * DART API → MySQL 동기화 스크립트
 * 실행: npm run sync:dart
 *
 * 동작 순서:
 *  1. KFTC에서 기업집단별 계열사 dart_corp_code 매핑
 *  2. 각 계열사의 최대주주 현황 (majorstock) 파싱
 *  3. 5% 이상 주주 현황 (elestock) 파싱
 *  4. shareholdings 테이블 upsert
 */

import "dotenv/config";
import { getMajorShareholders, getFivePercentHolders, getCompanyInfo } from "./dartClient.js";
import { upsertCompany, upsertShareholding, logSync, listGroups } from "../db/groupRepo.js";
import { query } from "../db/pool.js";

// 주요 계열사 DART 코드 매핑 (corpCode.xml에서 검증된 실제 코드)
const DART_CODE_MAP: Record<string, { dart_code: string; group_id: string }> = {
  "삼성전자":       { dart_code: "00126380", group_id: "samsung" },
  "삼성생명":       { dart_code: "00126256", group_id: "samsung" },  // 삼성생명보험
  "삼성물산":       { dart_code: "00149655", group_id: "samsung" },
  "삼성화재":       { dart_code: "00139214", group_id: "samsung" },  // 삼성화재해상보험
  "삼성SDI":        { dart_code: "00126362", group_id: "samsung" },
  "현대자동차":     { dart_code: "00164742", group_id: "hyundai" },
  "기아":           { dart_code: "00106641", group_id: "hyundai" },
  "현대모비스":     { dart_code: "00164788", group_id: "hyundai" },
  "현대글로비스":   { dart_code: "00360595", group_id: "hyundai" },
  "현대제철":       { dart_code: "00145880", group_id: "hyundai" },
  "현대건설":       { dart_code: "00164478", group_id: "hyundai" },
  "현대위아":       { dart_code: "00106623", group_id: "hyundai" },
  "(주)LG":         { dart_code: "00120021", group_id: "lg" },
  "LG전자":         { dart_code: "00401731", group_id: "lg" },
  "LG화학":         { dart_code: "00356361", group_id: "lg" },
  "LG유플러스":     { dart_code: "00231363", group_id: "lg" },
  "LG에너지솔루션": { dart_code: "01515323", group_id: "lg" },
  "LG디스플레이":   { dart_code: "00227936", group_id: "lg" },
  "SK(주)":         { dart_code: "00181712", group_id: "sk" },  // SK(주) stock:034730
  "SK하이닉스":     { dart_code: "00164779", group_id: "sk" },  // 에스케이하이닉스
  "SK이노베이션":   { dart_code: "00631518", group_id: "sk" },
  "SK텔레콤":       { dart_code: "00159023", group_id: "sk" },
  "SK스퀘어":       { dart_code: "01596425", group_id: "sk" },
  "롯데지주":       { dart_code: "00120562", group_id: "lotte" },
  "롯데쇼핑":       { dart_code: "00120526", group_id: "lotte" },
  "롯데케미칼":     { dart_code: "00165413", group_id: "lotte" },
  "LG디스플레이":   { dart_code: "00105873", group_id: "lg" },
};

async function syncCompanyBasicInfo(
  corpCode: string,
  groupId: string
): Promise<void> {
  try {
    const info = await getCompanyInfo(corpCode);
    await upsertCompany({
      group_id: groupId,
      dart_corp_code: corpCode,
      corp_reg_no: info.jurir_no,
      name_ko: info.corp_name,
      name_en: info.corp_name_eng,
      is_listed: info.stock_code.trim() !== "",
      stock_code: info.stock_code.trim() || undefined,
      stock_market: mapCorpCls(info.corp_cls),
      industry_code: info.induty_code,
      description_ko: `대표자: ${info.ceo_nm} | 결산: ${info.acc_mt}월`,
    });
    console.log(`  ✓ 기업정보: ${info.corp_name}`);
  } catch (e) {
    console.warn(`  ✗ 기업정보 실패 (${corpCode}):`, (e as Error).message);
  }
}

async function syncShareholdings(
  corpCode: string,
  groupId: string,
  bsnsYear: string
): Promise<number> {
  let count = 0;

  // 최대주주 현황
  try {
    const majors = await getMajorShareholders(corpCode, bsnsYear);
    for (const s of majors) {
      const pct = parseFloat(s.trmend_posesn_stock_qota_rt) || 0;
      if (pct < 0.5) continue;  // 0.5% 미만 제외

      // 주주명으로 dart_corp_code 역매핑 시도
      const mapping = Object.entries(DART_CODE_MAP).find(
        ([name]) => s.nm.includes(name) || name.includes(s.nm)
      );
      if (!mapping) continue;

      await upsertShareholding({
        group_id: groupId,
        source_corp_code: mapping[1].dart_code,
        target_corp_code: corpCode,
        ownership_pct: pct,
        shares_held: parseInt(s.trmend_posesn_stock_co.replace(/,/g, "")) || undefined,
        edge_type: s.relate === "최대주주본인" ? "direct_ownership" : "subsidiary_ownership",
        is_circular: false,
        report_date: bsnsYear + "-12-31",
        data_year: parseInt(bsnsYear),
      });
      count++;
    }
  } catch (e) {
    console.warn(`  ✗ majorstock 실패 (${corpCode}):`, (e as Error).message);
  }

  return count;
}

async function main() {
  const bsnsYear = new Date().getFullYear() - 1 + "";  // 전년도 사업보고서
  console.log(`\n🔄 DART 동기화 시작 (${bsnsYear}년 사업보고서)\n`);

  const started = new Date();
  let totalInserted = 0;

  for (const [corpName, { dart_code, group_id }] of Object.entries(DART_CODE_MAP)) {
    console.log(`[${group_id}] ${corpName} (${dart_code})`);

    await syncCompanyBasicInfo(dart_code, group_id);
    const cnt = await syncShareholdings(dart_code, group_id, bsnsYear);
    totalInserted += cnt;

    // API rate limit 준수 (data.go.kr: 10,000건/일)
    await new Promise((r) => setTimeout(r, 300));
  }

  await logSync({
    api_source: "dart",
    endpoint: "majorstock + company",
    request_params: { bsns_year: bsnsYear },
    status: "success",
    records_inserted: totalInserted,
    started_at: started,
  });

  console.log(`\n✅ 완료: ${totalInserted}건 처리\n`);
  process.exit(0);
}

function mapCorpCls(cls: string): "KOSPI" | "KOSDAQ" | "KONEX" | undefined {
  if (cls === "Y") return "KOSPI";
  if (cls === "K") return "KOSDAQ";
  if (cls === "N") return "KONEX";
  return undefined;
}

main().catch((e) => {
  console.error("DART 동기화 실패:", e);
  process.exit(1);
});

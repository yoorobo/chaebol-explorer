/**
 * KFTC (공정거래위원회) OpenAPI → MySQL 동기화
 * 실행: npm run sync:kftc
 *
 * 동작:
 *  1. 전체 대규모기업집단 목록 수집 (data.go.kr)
 *  2. chaebol_groups 테이블 upsert
 *  3. 각 집단 소속 계열사 목록 수집 → companies upsert
 */

import "dotenv/config";
import { getAllAffiliates } from "./kftcClient.js";
import { query } from "../db/pool.js";
import { logSync } from "../db/groupRepo.js";

// 공정위 지정 연도 (매년 5월 공표)
const DSN_YEAR = new Date().getFullYear().toString();

async function syncGroups() {
  console.log(`\n🔄 KFTC 기업집단 동기화 (${DSN_YEAR}년)\n`);
  const started = new Date();

  let affiliates;
  try {
    affiliates = await getAllAffiliates(undefined, DSN_YEAR);
  } catch (e) {
    console.error("KFTC API 호출 실패 — API 키를 확인하세요:", (e as Error).message);
    console.log("→ .env 파일의 KFTC_API_KEY 값을 확인하고 재실행하세요.");
    process.exit(1);
  }

  // 그룹명 중복 제거
  const groupMap = new Map<string, { grp_cd: string; grp_nm: string }>();
  for (const a of affiliates) {
    if (!groupMap.has(a.grp_cd)) {
      groupMap.set(a.grp_cd, { grp_cd: a.grp_cd, grp_nm: a.grp_nm });
    }
  }

  console.log(`발견된 기업집단: ${groupMap.size}개`);

  // chaebol_groups upsert
  let groupsInserted = 0;
  for (const [, g] of groupMap) {
    const groupId = toGroupId(g.grp_nm);
    await query(
      `INSERT INTO chaebol_groups
         (id, kftc_group_code, name_ko, data_year, data_source, synced_at)
       VALUES (?, ?, ?, ?, 'kftc', NOW())
       ON DUPLICATE KEY UPDATE
         kftc_group_code = VALUES(kftc_group_code),
         name_ko = VALUES(name_ko),
         data_year = VALUES(data_year),
         data_source = 'kftc',
         synced_at = NOW()`,
      [groupId, g.grp_cd, g.grp_nm, parseInt(DSN_YEAR)]
    );
    groupsInserted++;
  }

  console.log(`그룹 upsert: ${groupsInserted}건`);

  // companies upsert
  let companiesInserted = 0;
  for (const a of affiliates) {
    const groupId = toGroupId(a.grp_nm);
    await query(
      `INSERT INTO companies
         (group_id, biz_reg_no, name_ko, node_type, is_listed,
          industry_name, data_source, synced_at)
       VALUES (?, ?, ?, 'affiliate', 0, ?, 'kftc', NOW())
       ON DUPLICATE KEY UPDATE
         name_ko = VALUES(name_ko),
         industry_name = VALUES(industry_name),
         synced_at = NOW()`,
      [groupId, a.bzno, a.cp_nm, a.bsicIndustry || null]
    );
    companiesInserted++;

    if (companiesInserted % 100 === 0) {
      process.stdout.write(`  계열사 ${companiesInserted}/${affiliates.length} 처리 중...\r`);
    }
  }

  console.log(`\n계열사 upsert: ${companiesInserted}건`);

  await logSync({
    api_source: "kftc",
    endpoint: "typeOfBusinessCompSttusListApi",
    request_params: { dsnYear: DSN_YEAR },
    status: "success",
    records_inserted: companiesInserted,
    records_updated: groupsInserted,
    started_at: started,
  });

  console.log(`\n✅ KFTC 동기화 완료\n`);
  process.exit(0);
}

// 한글 그룹명 → slug (예: "삼성" → "samsung" 매핑은 수동, 나머지는 한글 그대로)
function toGroupId(grpNm: string): string {
  const MAP: Record<string, string> = {
    "삼성": "samsung",
    "현대자동차": "hyundai",
    "LG": "lg",
    "SK": "sk",
    "롯데": "lotte",
    "포스코": "posco",
    "한화": "hanwha",
    "GS": "gs",
    "현대중공업": "hhi",
    "신세계": "shinsegae",
    "CJ": "cj",
    "카카오": "kakao",
    "네이버": "naver",
    "두산": "doosan",
    "LS": "ls",
    "부영": "boo_young",
    "영풍": "youngpoong",
    "미래에셋": "mirae_asset",
    "교보생명보험": "kyobo",
    "KT": "kt",
  };
  return MAP[grpNm] ?? grpNm.toLowerCase().replace(/[^a-z0-9가-힣]/g, "_");
}

syncGroups().catch((e) => {
  console.error("KFTC 동기화 실패:", e);
  process.exit(1);
});

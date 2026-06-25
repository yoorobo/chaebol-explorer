/**
 * 공정거래위원회 기업집단 OpenAPI 클라이언트
 *
 * API 키 발급: https://www.data.go.kr → 검색 "대규모기업집단" → 활용신청
 * 서비스명: 대규모기업집단 소속회사 참여업종 정보 조회 서비스
 * 응답 형식: XML (xml2js로 파싱)
 *
 * 제공 엔드포인트:
 *  - typeOfBusinessCompSttusListApi : 소속회사 참여업종 목록
 *  - corpListApi                    : 사용 가능 공개년월 조회
 */

import axios from "axios";
import { parseStringPromise } from "xml2js";
import "dotenv/config";

const BASE_URL =
  "https://api.odcloud.kr/api/15053508/v1";
const API_KEY = process.env.KFTC_API_KEY ?? "";

// ── 응답 타입 ────────────────────────────────────────────

export interface KftcAffiliate {
  bzno: string;          // 사업자등록번호
  cp_nm: string;         // 회사명
  grp_nm: string;        // 기업집단명
  grp_cd: string;        // 기업집단코드
  ceo_nm: string;        // 대표자명
  bsicIndustry: string;  // 주요 업종
  bsicPrdName: string;   // 주요 상품명
  dsnYear: string;       // 지정 연도
}

export interface KftcPageResponse {
  currentCount: number;
  matchCount: number;
  page: number;
  perPage: number;
  totalCount: number;
  data: KftcAffiliate[];
}

// ── API 호출 함수 ────────────────────────────────────────

/**
 * 대규모기업집단 소속회사 목록 조회
 *
 * @param grpNm  기업집단명 (예: "삼성") — 미입력 시 전체
 * @param dsnYear 지정연도 (예: "2023") — 미입력 시 최신
 * @param page   페이지 번호 (기본 1)
 * @param perPage 페이지당 건수 (최대 1000)
 */
export async function getAffiliates(params: {
  grpNm?: string;
  dsnYear?: string;
  page?: number;
  perPage?: number;
}): Promise<KftcPageResponse> {
  const res = await axios.get<KftcPageResponse>(
    `${BASE_URL}/uddi:04e0bfc8-d40a-467c-8524-bf1acb26ae64`,
    {
      params: {
        serviceKey: API_KEY,
        page: params.page ?? 1,
        perPage: params.perPage ?? 100,
        ...(params.grpNm ? { "cond[grp_nm::EQ]": params.grpNm } : {}),
        ...(params.dsnYear ? { "cond[dsnYear::EQ]": params.dsnYear } : {}),
        returnType: "JSON",
      },
      timeout: 15_000,
    }
  );
  return res.data;
}

/**
 * 전체 소속회사 목록 (페이징 자동 처리)
 */
export async function getAllAffiliates(
  grpNm?: string,
  dsnYear?: string
): Promise<KftcAffiliate[]> {
  const first = await getAffiliates({ grpNm, dsnYear, page: 1, perPage: 100 });
  const results: KftcAffiliate[] = [...first.data];

  const totalPages = Math.ceil(first.totalCount / 100);
  for (let p = 2; p <= totalPages; p++) {
    const page = await getAffiliates({ grpNm, dsnYear, page: p, perPage: 100 });
    results.push(...page.data);
  }

  return results;
}

/**
 * 공정위 egroup 포털 직접 API (별도 엔드포인트)
 * 대기업집단 지정 현황 XML 조회
 * URL: https://egroup.go.kr/
 *
 * 주의: egroup API는 별도 키 없이 공개 조회 가능한 일부 엔드포인트 존재
 */
export async function getGroupDesignationList(year: string) {
  const url = `https://egroup.go.kr/egps/wi/stat/pblicLrgscEntrprsGrpDsgnSttus.do`;
  const res = await axios.get(url, {
    params: { searchYear: year },
    headers: { Accept: "application/xml, text/xml" },
    timeout: 15_000,
  });

  try {
    return await parseStringPromise(res.data, { explicitArray: false });
  } catch {
    return res.data; // XML 파싱 실패 시 원문 반환
  }
}

/**
 * 금융감독원 DART OpenAPI 클라이언트
 *
 * API 키 발급: https://opendart.fss.or.kr → Open DART → 인증키 신청/관리
 * 문서: https://opendart.fss.or.kr/guide/main.do
 *
 * 사용 엔드포인트:
 *  - corpCode.xml : 전체 기업 코드 목록 (zip)
 *  - company      : 기업 기본 정보
 *  - majorstock   : 최대주주 현황 (사업보고서 기준)
 *  - elestock     : 5% 이상 주주 현황
 *  - stocktotqy   : 주식 총수 현황
 */

import axios from "axios";
import "dotenv/config";

const BASE_URL = "https://opendart.fss.or.kr/api";
const API_KEY = process.env.DART_API_KEY ?? "";

// ── 응답 타입 정의 ───────────────────────────────────────

export interface DartCompanyInfo {
  status: string;   // "000" = 정상
  message: string;
  corp_code: string;
  corp_name: string;
  corp_name_eng: string;
  stock_name: string;
  stock_code: string;   // 상장 종목코드 (비상장이면 공백)
  ceo_nm: string;
  corp_cls: string;     // Y=유가, K=코스닥, N=코넥스, E=기타
  jurir_no: string;     // 법인등록번호
  bizr_no: string;      // 사업자등록번호
  adres: string;
  hm_url: string;
  ir_url: string;
  phn_no: string;
  fax_no: string;
  induty_code: string;  // 표준산업분류코드
  est_dt: string;       // 설립일
  acc_mt: string;       // 결산월
}

export interface DartMajorShareholder {
  rcept_no: string;     // 접수번호
  corp_cls: string;
  corp_code: string;
  corp_name: string;
  nm: string;           // 주주명
  relate: string;       // 관계 (최대주주, 특수관계인 등)
  stock_knd: string;    // 주식 종류
  bsis_posesn_stock_co: string;   // 기초 보유 주식수
  bsis_posesn_stock_qota_rt: string; // 기초 지분율
  trmend_posesn_stock_co: string; // 기말 보유 주식수
  trmend_posesn_stock_qota_rt: string; // 기말 지분율
  rm: string;           // 비고
}

export interface DartMajorShareholderResponse {
  status: string;
  message: string;
  list: DartMajorShareholder[];
}

export interface DartFivePercentHolder {
  rcept_no: string;
  corp_cls: string;
  corp_code: string;
  corp_name: string;
  repror_nm: string;      // 보고자명 (주주명)
  stkqy: string;          // 보유 주식수
  stkqy_irds: string;     // 보유 주식수 증감
  hold_stock_qota_rt: string;  // 보유 지분율
  elestock_change_cause: string; // 변동 원인
  rm: string;
}

export interface DartListResponse<T> {
  status: string;
  message: string;
  list: T[];
}

// ── API 호출 함수 ────────────────────────────────────────

/**
 * 기업 기본 정보 조회
 * GET /api/company.json?crtfc_key=&corp_code=
 */
export async function getCompanyInfo(
  corpCode: string
): Promise<DartCompanyInfo> {
  const res = await axios.get<DartCompanyInfo>(`${BASE_URL}/company.json`, {
    params: { crtfc_key: API_KEY, corp_code: corpCode },
    timeout: 10_000,
  });
  if (res.data.status !== "000") {
    throw new Error(`DART company API error: ${res.data.message}`);
  }
  return res.data;
}

/**
 * 최대주주 현황 조회 (사업보고서 기준)
 * GET /api/majorstock.json?crtfc_key=&corp_code=&bsns_year=&reprt_code=
 *
 * reprt_code: 11011=사업보고서, 11012=반기보고서, 11013=1분기, 11014=3분기
 */
export async function getMajorShareholders(
  corpCode: string,
  bsnsYear: string,
  reprtCode = "11011"
): Promise<DartMajorShareholder[]> {
  const res = await axios.get<DartMajorShareholderResponse>(
    `${BASE_URL}/majorstock.json`,
    {
      params: {
        crtfc_key: API_KEY,
        corp_code: corpCode,
        bsns_year: bsnsYear,
        reprt_code: reprtCode,
      },
      timeout: 15_000,
    }
  );
  if (res.data.status === "013") return []; // 데이터 없음
  if (res.data.status !== "000") {
    throw new Error(`DART majorstock API error: ${res.data.message}`);
  }
  return res.data.list ?? [];
}

/**
 * 5% 이상 주주 현황 조회 (대량보유 공시)
 * GET /api/elestock.json?crtfc_key=&corp_code=&bsns_year=&reprt_code=
 */
export async function getFivePercentHolders(
  corpCode: string,
  bsnsYear: string,
  reprtCode = "11011"
): Promise<DartFivePercentHolder[]> {
  const res = await axios.get<DartListResponse<DartFivePercentHolder>>(
    `${BASE_URL}/elestock.json`,
    {
      params: {
        crtfc_key: API_KEY,
        corp_code: corpCode,
        bsns_year: bsnsYear,
        reprt_code: reprtCode,
      },
      timeout: 15_000,
    }
  );
  if (res.data.status === "013") return [];
  if (res.data.status !== "000") {
    throw new Error(`DART elestock API error: ${res.data.message}`);
  }
  return res.data.list ?? [];
}

/**
 * 전체 기업 코드 목록 다운로드 (ZIP → XML)
 * 기업집단 내 모든 계열사 dart_corp_code 매핑에 사용
 * GET /api/corpCode.xml?crtfc_key=
 */
export async function downloadCorpCodeZip(): Promise<Buffer> {
  const res = await axios.get<Buffer>(`${BASE_URL}/corpCode.xml`, {
    params: { crtfc_key: API_KEY },
    responseType: "arraybuffer",
    timeout: 60_000,
  });
  return Buffer.from(res.data);
}

/**
 * 주식 총수 현황 (발행주식 총수, 자사주 수 확인용)
 */
export async function getStockTotQy(
  corpCode: string,
  bsnsYear: string,
  reprtCode = "11011"
) {
  const res = await axios.get(`${BASE_URL}/stocktotqy.json`, {
    params: {
      crtfc_key: API_KEY,
      corp_code: corpCode,
      bsns_year: bsnsYear,
      reprt_code: reprtCode,
    },
    timeout: 10_000,
  });
  return res.data;
}

-- ============================================================
--  재벌 지분구조 시각화 시스템 — MySQL 스키마
--  실행: mysql -u root -p < database/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS chaebol_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE chaebol_db;

-- ============================================================
-- 1. 기업집단 (대기업 그룹)
--    KFTC OpenAPI: typeOfBusinessCompSttusListApi
-- ============================================================
CREATE TABLE IF NOT EXISTS chaebol_groups (
  id               VARCHAR(30)  NOT NULL,           -- 'samsung', 'hyundai' ...
  kftc_group_code  VARCHAR(20)  DEFAULT NULL,        -- 공정위 기업집단코드
  name_ko          VARCHAR(100) NOT NULL,            -- 삼성그룹
  name_en          VARCHAR(100) DEFAULT NULL,        -- Samsung Group
  owner_name       VARCHAR(50)  DEFAULT NULL,        -- 총수(동일인) 성명
  designation_year SMALLINT     DEFAULT NULL,        -- 대규모기업집단 지정 연도
  data_year        SMALLINT     NOT NULL,            -- 데이터 기준 연도
  data_source      ENUM('mock','dart','kftc','manual') NOT NULL DEFAULT 'mock',
  synced_at        DATETIME     DEFAULT NULL,        -- 마지막 API 동기화 시각
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ============================================================
-- 2. 계열사 (노드)
--    KFTC: 소속회사 목록 / DART: 기업기본정보
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  group_id         VARCHAR(30)  NOT NULL,
  dart_corp_code   VARCHAR(8)   DEFAULT NULL UNIQUE,  -- DART 고유번호
  corp_reg_no      VARCHAR(13)  DEFAULT NULL,          -- 법인등록번호
  biz_reg_no       VARCHAR(10)  DEFAULT NULL,          -- 사업자등록번호
  name_ko          VARCHAR(200) NOT NULL,
  name_en          VARCHAR(200) DEFAULT NULL,
  node_type        ENUM('individual','holding_like','financial','affiliate','cash_cow','foundation') NOT NULL,
  is_listed        TINYINT(1)   NOT NULL DEFAULT 0,
  stock_code       VARCHAR(10)  DEFAULT NULL,          -- 상장 종목코드
  stock_market     ENUM('KOSPI','KOSDAQ','KONEX') DEFAULT NULL,
  total_assets     BIGINT       DEFAULT NULL,          -- 자산총계 (원)
  fiscal_year      SMALLINT     DEFAULT NULL,          -- 재무데이터 기준연도
  industry_code    VARCHAR(10)  DEFAULT NULL,          -- 표준산업분류코드
  industry_name    VARCHAR(100) DEFAULT NULL,
  description_ko   TEXT         DEFAULT NULL,
  is_active        TINYINT(1)   NOT NULL DEFAULT 1,
  data_source      ENUM('mock','dart','kftc','manual') NOT NULL DEFAULT 'mock',
  synced_at        DATETIME     DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_group        (group_id),
  KEY idx_dart_code    (dart_corp_code),
  KEY idx_stock_code   (stock_code),
  CONSTRAINT fk_company_group FOREIGN KEY (group_id)
    REFERENCES chaebol_groups(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 3. 지분 관계 (엣지)
--    DART: 주요주주 공시, 사업보고서 5%이상 주주 현황
-- ============================================================
CREATE TABLE IF NOT EXISTS shareholdings (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  group_id         VARCHAR(30)  NOT NULL,
  source_company_id BIGINT      NOT NULL,             -- 주주 (지분 보유자)
  target_company_id BIGINT      NOT NULL,             -- 피투자사
  ownership_pct    DECIMAL(8,4) NOT NULL,             -- 지분율 (%)
  voting_pct       DECIMAL(8,4) DEFAULT NULL,         -- 의결권 비율 (자사주 제외 시 다를 수 있음)
  shares_held      BIGINT       DEFAULT NULL,         -- 보유 주식 수
  edge_type        ENUM(
    'direct_ownership',     -- 총수 직접
    'subsidiary_ownership', -- 계열사 간
    'circular_loop',        -- 순환출자 고리
    'foundation_ownership', -- 재단
    'control'               -- 실질 통제 (비지분)
  ) NOT NULL,
  is_circular      TINYINT(1)   NOT NULL DEFAULT 0,   -- 순환출자 여부 플래그
  report_type      VARCHAR(50)  DEFAULT NULL,         -- 공시 유형 (사업보고서 등)
  report_date      DATE         DEFAULT NULL,         -- 공시 기준일
  data_year        SMALLINT     NOT NULL,
  data_source      ENUM('mock','dart','kftc','manual') NOT NULL DEFAULT 'mock',
  synced_at        DATETIME     DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_shareholding (source_company_id, target_company_id, data_year),
  KEY idx_group        (group_id),
  KEY idx_target       (target_company_id),
  KEY idx_circular     (is_circular),
  CONSTRAINT fk_sh_group  FOREIGN KEY (group_id)   REFERENCES chaebol_groups(id),
  CONSTRAINT fk_sh_source FOREIGN KEY (source_company_id) REFERENCES companies(id),
  CONSTRAINT fk_sh_target FOREIGN KEY (target_company_id) REFERENCES companies(id)
) ENGINE=InnoDB;

-- ============================================================
-- 4. Wedge(괴리도) 계산 결과 캐시
-- ============================================================
CREATE TABLE IF NOT EXISTS wedge_cache (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  group_id         VARCHAR(30)  NOT NULL,
  target_company_id BIGINT      NOT NULL,
  data_year        SMALLINT     NOT NULL,
  direct_ownership_pct  DECIMAL(8,4) NOT NULL DEFAULT 0,
  total_voting_pct      DECIMAL(8,4) NOT NULL DEFAULT 0,
  indirect_ownership_pct DECIMAL(8,4) NOT NULL DEFAULT 0,
  wedge_multiplier DECIMAL(8,2) DEFAULT NULL,         -- total / direct
  calc_detail_json LONGTEXT     DEFAULT NULL,          -- JSON: 경로별 상세
  calculated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wedge (target_company_id, data_year),
  KEY idx_group (group_id),
  CONSTRAINT fk_wedge_target FOREIGN KEY (target_company_id)
    REFERENCES companies(id)
) ENGINE=InnoDB;

-- ============================================================
-- 5. AI 분석 결과 캐시 (Bedrock Nova 응답)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_analysis_cache (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  group_id         VARCHAR(30)  NOT NULL,
  target_company_id BIGINT      NOT NULL,
  data_year        SMALLINT     NOT NULL,
  model_id         VARCHAR(100) NOT NULL DEFAULT 'amazon.nova-lite-v1:0',
  input_tokens     INT          DEFAULT NULL,
  output_tokens    INT          DEFAULT NULL,
  wedge_analysis   TEXT         DEFAULT NULL,
  minority_risk    TEXT         DEFAULT NULL,
  regulations      TEXT         DEFAULT NULL,
  raw_response     LONGTEXT     DEFAULT NULL,          -- 원본 Bedrock 응답 JSON
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at       DATETIME     DEFAULT NULL,          -- 캐시 만료 시각
  PRIMARY KEY (id),
  UNIQUE KEY uq_ai_cache (target_company_id, data_year, model_id),
  KEY idx_group (group_id)
) ENGINE=InnoDB;

-- ============================================================
-- 6. API 동기화 로그 (DART/KFTC 호출 이력)
-- ============================================================
CREATE TABLE IF NOT EXISTS api_sync_logs (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  api_source       ENUM('dart','kftc','manual') NOT NULL,
  endpoint         VARCHAR(255) NOT NULL,              -- 호출 API 엔드포인트
  group_id         VARCHAR(30)  DEFAULT NULL,
  request_params   TEXT         DEFAULT NULL,          -- 요청 파라미터 JSON
  status           ENUM('success','fail','partial') NOT NULL,
  records_inserted INT          DEFAULT 0,
  records_updated  INT          DEFAULT 0,
  error_message    TEXT         DEFAULT NULL,
  response_code    SMALLINT     DEFAULT NULL,
  started_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at      DATETIME     DEFAULT NULL,
  PRIMARY KEY (id),
  KEY idx_source   (api_source),
  KEY idx_group    (group_id),
  KEY idx_started  (started_at)
) ENGINE=InnoDB;

-- ============================================================
-- 7. DART 원시 데이터 스테이징 (파싱 전 임시 저장)
-- ============================================================
CREATE TABLE IF NOT EXISTS dart_raw_staging (
  id               BIGINT       NOT NULL AUTO_INCREMENT,
  dart_corp_code   VARCHAR(8)   NOT NULL,
  report_type      VARCHAR(50)  NOT NULL,              -- 'annual', 'semi-annual' 등
  receipt_no       VARCHAR(14)  DEFAULT NULL,          -- DART 접수번호
  report_date      DATE         DEFAULT NULL,
  section_name     VARCHAR(100) DEFAULT NULL,          -- 파싱 섹션명
  raw_xml          LONGTEXT     DEFAULT NULL,
  raw_json         LONGTEXT     DEFAULT NULL,
  is_processed     TINYINT(1)   NOT NULL DEFAULT 0,
  processed_at     DATETIME     DEFAULT NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_corp_code  (dart_corp_code),
  KEY idx_processed  (is_processed)
) ENGINE=InnoDB;

-- ============================================================
-- 뷰: 그룹별 Wedge 요약
-- ============================================================
CREATE OR REPLACE VIEW v_group_wedge_summary AS
SELECT
  g.id            AS group_id,
  g.name_ko       AS group_name,
  g.owner_name,
  g.data_year,
  c.name_ko       AS target_company,
  c.stock_code,
  w.direct_ownership_pct,
  w.total_voting_pct,
  w.wedge_multiplier,
  w.calculated_at
FROM wedge_cache w
JOIN companies c ON c.id = w.target_company_id
JOIN chaebol_groups g ON g.id = w.group_id
ORDER BY g.id, w.wedge_multiplier DESC;

-- ============================================================
-- 뷰: 순환출자 고리 목록
-- ============================================================
CREATE OR REPLACE VIEW v_circular_loops AS
SELECT
  g.name_ko    AS group_name,
  src.name_ko  AS source_company,
  tgt.name_ko  AS target_company,
  s.ownership_pct,
  s.data_year,
  s.data_source
FROM shareholdings s
JOIN companies src ON src.id = s.source_company_id
JOIN companies tgt ON tgt.id = s.target_company_id
JOIN chaebol_groups g ON g.id = s.group_id
WHERE s.is_circular = 1
ORDER BY g.name_ko, s.ownership_pct DESC;

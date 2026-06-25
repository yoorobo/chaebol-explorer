-- ============================================================
--  Mock 데이터 시드 — chaebol_db
--  실행: mysql -u root -p chaebol_db < database/seed.sql
-- ============================================================

USE chaebol_db;

-- ============================================================
-- chaebol_groups
-- ============================================================
INSERT INTO chaebol_groups (id, name_ko, name_en, owner_name, data_year, data_source) VALUES
  ('samsung', '삼성그룹',      'Samsung Group',       '이재용', 2015, 'mock'),
  ('hyundai', '현대자동차그룹', 'Hyundai Motor Group', '정의선', 2023, 'mock'),
  ('lg',      'LG그룹',        'LG Group',            '구광모', 2023, 'mock'),
  ('sk',      'SK그룹',        'SK Group',            '최태원', 2023, 'mock'),
  ('lotte',   '롯데그룹',      'Lotte Group',         '신동빈', 2023, 'mock')
ON DUPLICATE KEY UPDATE
  name_ko = VALUES(name_ko),
  owner_name = VALUES(owner_name),
  updated_at = CURRENT_TIMESTAMP;

-- ============================================================
-- companies — 삼성
-- ============================================================
INSERT INTO companies (group_id, name_ko, node_type, is_listed, stock_code, total_assets, data_source) VALUES
  ('samsung', '이재용 일가',   'individual',   0, NULL,     0,               'mock'),
  ('samsung', '제일모직',      'holding_like', 1, '028260', 5000000000000,   'mock'),
  ('samsung', '삼성생명',      'financial',    1, '032830', 200000000000000, 'mock'),
  ('samsung', '삼성물산',      'affiliate',    1, '028260', 8000000000000,   'mock'),
  ('samsung', '삼성전자',      'cash_cow',     1, '005930', 300000000000000, 'mock'),
  ('samsung', '삼성화재',      'financial',    1, '000810', 20000000000000,  'mock'),
  ('samsung', '삼성SDI',       'affiliate',    1, '006400', 15000000000000,  'mock'),
  ('samsung', '삼성복지재단',  'foundation',   0, NULL,     0,               'mock');

-- ============================================================
-- companies — 현대차
-- ============================================================
INSERT INTO companies (group_id, name_ko, node_type, is_listed, stock_code, total_assets, data_source) VALUES
  ('hyundai', '정의선 일가',   'individual',   0, NULL,     0,               'mock'),
  ('hyundai', '현대자동차',    'cash_cow',     1, '005380', 200000000000000, 'mock'),
  ('hyundai', '기아',          'cash_cow',     1, '000270', 50000000000000,  'mock'),
  ('hyundai', '현대모비스',    'holding_like', 1, '012330', 40000000000000,  'mock'),
  ('hyundai', '현대글로비스',  'affiliate',    1, '086280', 5000000000000,   'mock'),
  ('hyundai', '현대위아',      'affiliate',    1, '011210', 3000000000000,   'mock'),
  ('hyundai', '현대제철',      'affiliate',    1, '004020', 12000000000000,  'mock'),
  ('hyundai', '현대건설',      'affiliate',    1, '000720', 8000000000000,   'mock');

-- ============================================================
-- companies — LG
-- ============================================================
INSERT INTO companies (group_id, name_ko, node_type, is_listed, stock_code, total_assets, data_source) VALUES
  ('lg', '구광모 일가',        'individual',   0, NULL,     0,               'mock'),
  ('lg', '(주)LG',             'holding_like', 1, '003550', 12000000000000,  'mock'),
  ('lg', 'LG전자',             'cash_cow',     1, '066570', 35000000000000,  'mock'),
  ('lg', 'LG화학',             'cash_cow',     1, '051910', 40000000000000,  'mock'),
  ('lg', 'LG유플러스',         'affiliate',    1, '032640', 10000000000000,  'mock'),
  ('lg', 'LG에너지솔루션',     'cash_cow',     1, '373220', 60000000000000,  'mock'),
  ('lg', 'LG디스플레이',       'affiliate',    1, '034220', 15000000000000,  'mock'),
  ('lg', 'LG복지재단',         'foundation',   0, NULL,     0,               'mock');

-- ============================================================
-- companies — SK
-- ============================================================
INSERT INTO companies (group_id, name_ko, node_type, is_listed, stock_code, total_assets, data_source) VALUES
  ('sk', '최태원 일가',        'individual',   0, NULL,     0,               'mock'),
  ('sk', 'SK(주)',              'holding_like', 1, '034730', 20000000000000,  'mock'),
  ('sk', 'SK하이닉스',         'cash_cow',     1, '000660', 80000000000000,  'mock'),
  ('sk', 'SK이노베이션',       'cash_cow',     1, '096770', 25000000000000,  'mock'),
  ('sk', 'SK텔레콤',           'affiliate',    1, '017670', 20000000000000,  'mock'),
  ('sk', 'SK네트웍스',         'affiliate',    1, '001740', 4000000000000,   'mock'),
  ('sk', 'SK온',               'affiliate',    0, NULL,     10000000000000,  'mock'),
  ('sk', 'SK스퀘어',           'holding_like', 1, '402340', 8000000000000,   'mock');

-- ============================================================
-- companies — 롯데
-- ============================================================
INSERT INTO companies (group_id, name_ko, node_type, is_listed, stock_code, total_assets, data_source) VALUES
  ('lotte', '신동빈 일가',     'individual',   0, NULL,     0,               'mock'),
  ('lotte', '롯데지주',        'holding_like', 1, '004990', 8000000000000,   'mock'),
  ('lotte', '롯데쇼핑',        'cash_cow',     1, '023530', 15000000000000,  'mock'),
  ('lotte', '롯데케미칼',      'cash_cow',     1, '011170', 12000000000000,  'mock'),
  ('lotte', '롯데웰푸드',      'affiliate',    1, '280360', 3000000000000,   'mock'),
  ('lotte', '롯데호텔',        'affiliate',    0, NULL,     5000000000000,   'mock'),
  ('lotte', '롯데건설',        'affiliate',    0, NULL,     4000000000000,   'mock'),
  ('lotte', '롯데장학재단',    'foundation',   0, NULL,     0,               'mock');

-- ============================================================
-- shareholdings — 삼성 (company id 참조용 서브쿼리)
-- ============================================================
INSERT INTO shareholdings
  (group_id, source_company_id, target_company_id, ownership_pct, edge_type, is_circular, data_year, data_source)
SELECT 'samsung', s.id, t.id, vals.pct, vals.etype, vals.circ, 2015, 'mock'
FROM (VALUES
  ROW('이재용 일가','제일모직',   42.17,'direct_ownership',    0),
  ROW('이재용 일가','삼성전자',    4.74,'direct_ownership',    0),
  ROW('이재용 일가','삼성복지재단',100.0,'control',             0),
  ROW('제일모직',   '삼성생명',   19.3, 'subsidiary_ownership',0),
  ROW('제일모직',   '삼성물산',    5.0, 'subsidiary_ownership',0),
  ROW('제일모직',   '삼성화재',   15.2, 'subsidiary_ownership',0),
  ROW('삼성생명',   '삼성전자',    7.21,'subsidiary_ownership',0),
  ROW('삼성물산',   '삼성전자',    4.06,'subsidiary_ownership',0),
  ROW('삼성화재',   '삼성전자',    1.26,'subsidiary_ownership',0),
  ROW('삼성전자',   '제일모직',    1.2, 'circular_loop',       1),
  ROW('삼성전자',   '삼성SDI',    20.4, 'subsidiary_ownership',0),
  ROW('삼성SDI',    '제일모직',    0.8, 'circular_loop',       1),
  ROW('삼성복지재단','삼성전자',   0.45,'foundation_ownership',0)
) AS vals(sname, tname, pct, etype, circ)
JOIN companies s ON s.group_id='samsung' AND s.name_ko=vals.sname
JOIN companies t ON t.group_id='samsung' AND t.name_ko=vals.tname
ON DUPLICATE KEY UPDATE ownership_pct=VALUES(ownership_pct);

-- ============================================================
-- shareholdings — 현대차
-- ============================================================
INSERT INTO shareholdings
  (group_id, source_company_id, target_company_id, ownership_pct, edge_type, is_circular, data_year, data_source)
SELECT 'hyundai', s.id, t.id, vals.pct, vals.etype, vals.circ, 2023, 'mock'
FROM (VALUES
  ROW('정의선 일가','현대글로비스', 23.29,'direct_ownership',    0),
  ROW('정의선 일가','현대모비스',    0.32,'direct_ownership',    0),
  ROW('현대모비스', '현대자동차',   21.43,'subsidiary_ownership',0),
  ROW('현대모비스', '기아',         16.96,'subsidiary_ownership',0),
  ROW('현대자동차', '기아',         33.88,'subsidiary_ownership',0),
  ROW('현대자동차', '현대모비스',   19.73,'circular_loop',       1),
  ROW('기아',       '현대모비스',   16.88,'circular_loop',       1),
  ROW('현대자동차', '현대제철',     33.98,'subsidiary_ownership',0),
  ROW('현대자동차', '현대위아',     38.65,'subsidiary_ownership',0),
  ROW('현대자동차', '현대건설',     31.47,'subsidiary_ownership',0),
  ROW('현대글로비스','현대모비스',   0.67,'subsidiary_ownership',0)
) AS vals(sname, tname, pct, etype, circ)
JOIN companies s ON s.group_id='hyundai' AND s.name_ko=vals.sname
JOIN companies t ON t.group_id='hyundai' AND t.name_ko=vals.tname
ON DUPLICATE KEY UPDATE ownership_pct=VALUES(ownership_pct);

-- ============================================================
-- shareholdings — LG
-- ============================================================
INSERT INTO shareholdings
  (group_id, source_company_id, target_company_id, ownership_pct, edge_type, is_circular, data_year, data_source)
SELECT 'lg', s.id, t.id, vals.pct, vals.etype, vals.circ, 2023, 'mock'
FROM (VALUES
  ROW('구광모 일가','(주)LG',          15.95,'direct_ownership',    0),
  ROW('구광모 일가','LG복지재단',      100.0,'control',             0),
  ROW('(주)LG',     'LG전자',          33.67,'subsidiary_ownership',0),
  ROW('(주)LG',     'LG화학',          33.49,'subsidiary_ownership',0),
  ROW('(주)LG',     'LG유플러스',      36.05,'subsidiary_ownership',0),
  ROW('(주)LG',     'LG디스플레이',    37.91,'subsidiary_ownership',0),
  ROW('LG화학',     'LG에너지솔루션',  80.02,'subsidiary_ownership',0),
  ROW('LG복지재단', '(주)LG',           2.78,'foundation_ownership',0)
) AS vals(sname, tname, pct, etype, circ)
JOIN companies s ON s.group_id='lg' AND s.name_ko=vals.sname
JOIN companies t ON t.group_id='lg' AND t.name_ko=vals.tname
ON DUPLICATE KEY UPDATE ownership_pct=VALUES(ownership_pct);

-- ============================================================
-- shareholdings — SK
-- ============================================================
INSERT INTO shareholdings
  (group_id, source_company_id, target_company_id, ownership_pct, edge_type, is_circular, data_year, data_source)
SELECT 'sk', s.id, t.id, vals.pct, vals.etype, vals.circ, 2023, 'mock'
FROM (VALUES
  ROW('최태원 일가','SK(주)',      18.45,'direct_ownership',    0),
  ROW('SK(주)',     'SK스퀘어',    40.06,'subsidiary_ownership',0),
  ROW('SK(주)',     'SK이노베이션',36.22,'subsidiary_ownership',0),
  ROW('SK(주)',     'SK네트웍스',  39.13,'subsidiary_ownership',0),
  ROW('SK스퀘어',  'SK하이닉스',  20.07,'subsidiary_ownership',0),
  ROW('SK스퀘어',  'SK텔레콤',    30.01,'subsidiary_ownership',0),
  ROW('SK이노베이션','SK온',      100.0,'subsidiary_ownership',0),
  ROW('SK텔레콤',  'SK스퀘어',     8.34,'circular_loop',       1)
) AS vals(sname, tname, pct, etype, circ)
JOIN companies s ON s.group_id='sk' AND s.name_ko=vals.sname
JOIN companies t ON t.group_id='sk' AND t.name_ko=vals.tname
ON DUPLICATE KEY UPDATE ownership_pct=VALUES(ownership_pct);

-- ============================================================
-- shareholdings — 롯데
-- ============================================================
INSERT INTO shareholdings
  (group_id, source_company_id, target_company_id, ownership_pct, edge_type, is_circular, data_year, data_source)
SELECT 'lotte', s.id, t.id, vals.pct, vals.etype, vals.circ, 2023, 'mock'
FROM (VALUES
  ROW('신동빈 일가','롯데지주',    10.47,'direct_ownership',    0),
  ROW('신동빈 일가','롯데장학재단',100.0,'control',             0),
  ROW('롯데지주',   '롯데쇼핑',    43.32,'subsidiary_ownership',0),
  ROW('롯데지주',   '롯데케미칼',  53.55,'subsidiary_ownership',0),
  ROW('롯데지주',   '롯데웰푸드',  50.31,'subsidiary_ownership',0),
  ROW('롯데지주',   '롯데호텔',    82.76,'subsidiary_ownership',0),
  ROW('롯데지주',   '롯데건설',    76.40,'subsidiary_ownership',0),
  ROW('롯데쇼핑',   '롯데지주',     3.25,'circular_loop',       1),
  ROW('롯데장학재단','롯데지주',    1.82,'foundation_ownership',0)
) AS vals(sname, tname, pct, etype, circ)
JOIN companies s ON s.group_id='lotte' AND s.name_ko=vals.sname
JOIN companies t ON t.group_id='lotte' AND t.name_ko=vals.tname
ON DUPLICATE KEY UPDATE ownership_pct=VALUES(ownership_pct);

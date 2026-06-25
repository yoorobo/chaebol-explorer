# 재벌 지분구조 시각화 시스템 — 업무 인수인계 문서

**작성일**: 2026-05-22  
**버전**: v1.0  
**프로젝트 경로**: `/home/cho-pc/dev_ws/stockMonitoring/`

---

## 1. 프로젝트 목적

한국 대기업집단(재벌)의 **순환출자 구조**와 **소유-지배 괴리도(Wedge)**를 시각화하고, Amazon Bedrock AI를 통해 경영권 리스크를 분석하는 웹 서비스입니다.

### 핵심 개념 (처음 접하는 분을 위한 설명)

| 용어 | 설명 |
|------|------|
| **순환출자** | A→B→C→A처럼 계열사끼리 서로 출자해 가공 자본을 만드는 구조. 공정거래법상 신규는 금지되나 기존 고리는 유지됨 |
| **소유-지배 괴리도 (Wedge)** | 총수 일가가 실제 보유한 지분(소유권)보다 훨씬 큰 의결권(지배권)을 행사하는 현상. 배수가 클수록 지배력 증폭이 큼 |
| **금산분리** | 금융계열사(보험·은행)가 비금융 계열사 의결권을 행사하는 것을 제한하는 원칙. 삼성생명→삼성전자 지분이 대표 사례 |

### 주요 타깃 사용자
- 외국인 투자자 (Korea Discount 분석)
- 지배구조 연구자
- 금융 규제 당국 참고 자료

---

## 2. 시스템 아키텍처

```
┌─────────────────────────────────────────────┐
│               사용자 브라우저                 │
│         http://localhost:5173               │
└──────────────────┬──────────────────────────┘
                   │ HTTP
┌──────────────────▼──────────────────────────┐
│         프론트엔드 (Vite + React + TS)        │
│  Cytoscape.js 네트워크 맵                     │
│  D3.js Wedge 분석 차트                       │
│  What-If 시뮬레이터                          │
│  Chord Diagram                             │
└──────────────────┬──────────────────────────┘
                   │ REST API (포트 3001)
┌──────────────────▼──────────────────────────┐
│         백엔드 (Express + TypeScript)         │
│  /api/groups  /api/groups/:id/network       │
│  /api/analyze  /api/sync-status             │
└──────┬──────────────────────┬───────────────┘
       │ SQL (mysql2)          │ HTTPS
┌──────▼──────┐    ┌──────────▼──────────────┐
│  MySQL 8.0  │    │   AWS Bedrock Nova       │
│ chaebol_db  │    │  Nova Lite / Nova Pro    │
│  19개 그룹  │    │  (키 설정 시 실동작)      │
└─────────────┘    └─────────────────────────┘
```

### 데이터 흐름 (Mock → 실데이터)

```
1순위: 백엔드 API → MySQL 실데이터
   ↓ 실패 시 자동 폴백
2순위: 프론트엔드 내장 Mock JSON (19개 그룹)
```

백엔드 서버가 없어도 Mock 데이터로 모든 기능이 동작합니다.

---

## 3. 기술 스택

### 프론트엔드 (`/`)
| 기술 | 버전 | 역할 |
|------|------|------|
| Vite | 8.x | 빌드 도구, HMR |
| React | 19.x | UI 프레임워크 |
| TypeScript | 6.x | 정적 타입 (`verbatimModuleSyntax` 활성화) |
| Cytoscape.js | 3.x | 지분 네트워크 방향 그래프 |
| D3.js | 7.x | Wedge 바 차트, Chord Diagram |

### 백엔드 (`/server`)
| 기술 | 버전 | 역할 |
|------|------|------|
| Node.js (NVM v20) | 20 LTS | 런타임 |
| Express | 5.x | REST API 서버 |
| TypeScript (ESM) | 6.x | 정적 타입 |
| mysql2/promise | 3.x | DB 커넥션 풀 |
| tsx | 4.x | TS 직접 실행 (개발용) |
| @aws-sdk/client-bedrock-runtime | 3.x | AWS Bedrock API |

### 데이터베이스
- MySQL 8.0, DB명: `chaebol_db`, 사용자: `root`, 비밀번호: `1`
- 7개 테이블 + 2개 뷰 (`schema.sql` 참조)

---

## 4. 디렉토리 구조

```
stockMonitoring/
├── src/                          # 프론트엔드 소스
│   ├── api/
│   │   ├── groupsApi.ts          # 백엔드 REST 호출
│   │   └── bedrockClient.ts      # AI 분석 API (백엔드 → fallback Mock)
│   ├── components/
│   │   ├── ChaebolNetworkMap.tsx # Cytoscape.js 메인 네트워크 맵
│   │   ├── SankeyWedgeAnalyzer.tsx # D3.js Wedge 분석 차트
│   │   ├── AIAnalysisPanel.tsx   # AI 분석 결과 패널
│   │   ├── ScrollyNav.tsx        # 좌측 스텝별 내비게이션 (동적)
│   │   ├── GroupSelector.tsx     # 그룹 선택 메뉴
│   │   ├── WhatIfSimulator.tsx   # 지분율 수동 수정 + AI 예측
│   │   └── ChordDiagram.tsx      # D3.js 원형 지분 흐름도
│   ├── data/groups/              # Mock JSON 데이터 (19개 그룹)
│   │   ├── index.ts              # 그룹 레지스트리
│   │   ├── samsung.json          # 삼성그룹 데이터
│   │   └── ... (18개 더)
│   ├── utils/
│   │   ├── types.ts              # 공통 인터페이스 정의
│   │   └── graphUtils.ts         # Wedge 계산, 노드 크기 계산
│   ├── styles/globals.css        # CSS 변수 (다크 테마)
│   ├── App.tsx                   # 최상위 컴포넌트
│   └── App.css                   # 레이아웃 + 컴포넌트 스타일
│
├── server/                       # 백엔드 소스
│   ├── src/
│   │   ├── api/
│   │   │   ├── bedrockAnalyzer.ts # AWS Bedrock Converse API 연동
│   │   │   ├── dartClient.ts      # DART OpenAPI 호출
│   │   │   ├── dartSync.ts        # DART 동기화 스크립트
│   │   │   ├── kftcClient.ts      # KFTC API 클라이언트
│   │   │   └── kftcSync.ts        # KFTC 동기화 스크립트
│   │   ├── db/
│   │   │   ├── pool.ts            # mysql2 커넥션 풀
│   │   │   └── groupRepo.ts       # DB CRUD (upsert, query)
│   │   └── index.ts               # Express 서버 진입점
│   ├── .env                       # API 키 설정 (Git 제외)
│   └── package.json
│
├── database/
│   ├── schema.sql                 # 테이블 DDL
│   ├── seed.sql                   # Mock 시드 데이터
│   └── backup/
│       ├── schema_backup_20260522.sql  # 스키마 백업
│       └── data_backup_20260522.sql    # 전체 데이터 백업
│
├── doc/                           # 문서 폴더
│   ├── README.md                  # 이 파일 (업무 인수인계)
│   ├── dev-notes.md               # 개발노트 (완료/미완료)
│   ├── api-key-setup.md           # API 키 발급 가이드
│   ├── user-guide.md              # 사용자 가이드
│   └── old/                       # 이전 버전 문서 보관
│
└── package.json                   # 루트 npm scripts (프론트엔드)
```

---

## 5. 로컬 개발 환경 설정 (처음 세팅하는 경우)

### 5-1. 사전 요구사항

```bash
# Node.js (NVM으로 관리)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
nvm install 20 && nvm use 20

# MySQL 8.0
sudo apt install mysql-server
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '1'; FLUSH PRIVILEGES;"
```

### 5-2. 프로젝트 클론 및 의존성 설치

```bash
git clone <repo-url> stockMonitoring
cd stockMonitoring

# 프론트엔드 의존성
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
npm install

# 백엔드 의존성
cd server && npm install && cd ..
```

### 5-3. 데이터베이스 초기화

```bash
# DB 생성 및 스키마 적용
mysql -u root -p1 -e "CREATE DATABASE IF NOT EXISTS chaebol_db CHARACTER SET utf8mb4;"
mysql -u root -p1 chaebol_db < database/schema.sql
mysql -u root -p1 chaebol_db < database/seed.sql
```

### 5-4. 환경변수 설정

```bash
# 서버 .env 파일 생성
cp server/.env.example server/.env   # 또는 직접 생성
# server/.env 내용은 doc/api-key-setup.md 참조
```

### 5-5. 개발 서버 실행

```bash
# 터미널 1: 프론트엔드 (포트 5173)
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
npm run dev

# 터미널 2: 백엔드 (포트 3001)
npm run server
```

브라우저에서 http://localhost:5173 접속

---

## 6. npm 명령어 요약

모든 명령어는 **프로젝트 루트** (`~/dev_ws/stockMonitoring`)에서 실행합니다.

```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"  # 항상 먼저 실행

npm run dev          # 프론트엔드 개발 서버 (포트 5173)
npm run server       # 백엔드 API 서버 (포트 3001)
npm run build        # 프론트엔드 프로덕션 빌드
npm run sync:dart    # DART 지분 데이터 동기화
npm run sync:kftc    # KFTC 기업집단 목록 동기화 (활용신청 승인 후)
```

---

## 7. 백엔드 API 엔드포인트

| Method | URL | 설명 |
|--------|-----|------|
| GET | `/health` | 서버 상태 확인 |
| GET | `/api/groups` | 전체 그룹 목록 |
| GET | `/api/groups/:id/network` | 특정 그룹 네트워크 (nodes + edges) |
| GET | `/api/groups/:id/circular-loops` | 순환출자 고리 목록 |
| GET | `/api/sync-status` | 최근 동기화 이력 |
| POST | `/api/analyze` | AI 분석 (Bedrock Nova) |

---

## 8. 데이터베이스 스키마 요약

```sql
chaebol_groups   -- 그룹 메타 (id, name_ko, owner_name, data_source)
companies        -- 계열사 (dart_corp_code, node_type, is_listed, stock_code)
shareholdings    -- 지분 관계 (source_company_id → target_company_id, ownership_pct)
wedge_cache      -- 계산된 Wedge 값 캐시
ai_analysis_cache -- Bedrock 응답 캐시
api_sync_logs    -- DART/KFTC 동기화 이력
dart_raw_staging -- DART 원본 임시 저장

VIEW: v_group_wedge_summary   -- 그룹별 평균 Wedge
VIEW: v_circular_loops         -- 순환출자 고리 자동 탐지
```

---

## 9. 현재 시스템 상태 (2026-05-22 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| 프론트엔드 | ✅ 동작 | 19개 그룹 Mock 데이터 |
| 백엔드 서버 | ✅ 동작 | MySQL 연결 필요 |
| MySQL DB | ✅ 동작 | 19개 그룹, 66개 계열사, 49개 지분 |
| DART API 연동 | ✅ 동작 | `npm run sync:dart` |
| KFTC API | ⚠️ 대기 | data.go.kr 활용신청 승인 필요 |
| AWS Bedrock | ⚠️ 미설정 | .env에 AWS 키 입력 필요 |

---

## 10. 담당자 및 이관 시 주의사항

- `server/.env` 파일은 Git에 포함되지 않습니다. 별도 관리 필요
- DART API 키는 https://opendart.fss.or.kr 에서 재발급 가능 (무료, 즉시)
- MySQL 비밀번호: `1` (root 계정 — 프로덕션 배포 시 반드시 변경)
- NVM 미로드 시 `npm` 명령이 동작하지 않음 → 항상 `source "$NVM_DIR/nvm.sh"` 먼저 실행

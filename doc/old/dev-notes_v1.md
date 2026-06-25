# 개발 노트 — 재벌 지분구조 시각화 시스템

**최종 업데이트**: 2026-05-22  
**프로젝트 경로**: `/home/cho-pc/dev_ws/stockMonitoring/`

---

## 1. 프로젝트 개요

한국 대기업집단(재벌)의 순환출자 구조와 소유-지배 괴리도(Wedge)를 시각화하고, Amazon Bedrock AI를 통해 경영권 리스크를 분석하는 웹 서비스.

**주요 타깃**: 외국인 투자자 및 지배구조 연구자  
**핵심 문제의식**: 총수 일가가 적은 직접지분으로 그룹 전체를 지배하는 구조 — 순환출자가 의결권 증폭 수단으로 사용됨

---

## 2. 기술 스택

### 프론트엔드

| 기술 | 버전 | 선택 이유 |
|------|------|---------|
| Vite + React + TypeScript | React 18, TS 5 | 빠른 HMR, 타입 안정성 |
| Cytoscape.js | 최신 | 대규모 방향 그래프 렌더링, concentric 레이아웃 |
| D3.js | 최신 | 커스텀 바 차트, Sankey 다이어그램 |
| CSS Variables | — | 다크모드 + Glassmorphism 테마 |

### 백엔드

| 기술 | 버전 | 선택 이유 |
|------|------|---------|
| Node.js (NVM v20.20.1) | 20 LTS | 안정성 |
| Express.js | 4.x | 경량 REST API |
| mysql2/promise | 최신 | async/await 지원 커넥션 풀 |
| TypeScript (ESM) | 5 | 타입 안정성, `verbatimModuleSyntax` 활성화 |

### 데이터 소스

| 소스 | 용도 | 상태 |
|------|------|------|
| Mock JSON (src/data/groups/) | 초기 프로토타입, 오프라인 fallback | 완성 |
| DART API (금감원) | 실제 지분율 데이터 | 연동 완료 |
| KFTC API (공정위) | 전체 대기업집단 목록 | 활용신청 대기 중 |
| AWS Bedrock Nova | AI 경영권 분석 | Mock 구현, 실연동 미완 |

---

## 3. 아키텍처 설계 결정

### Mock + Real 병행 구조

프론트엔드(`App.tsx`)가 백엔드 API를 먼저 호출하고, 실패 시 로컬 Mock JSON으로 자동 폴백.  
이 방식 덕분에 API 키 없이도 개발 및 데모가 가능하고, 실데이터 연동 후에도 UI 변경 없이 전환됨.

```
프론트엔드
 └─ fetchGroups() → GET /api/groups
      ├─ 성공: MySQL 실데이터 표시
      └─ 실패: src/data/groups/index.ts Mock 데이터 표시
```

### MySQL 7테이블 스키마

```
chaebol_groups   ← 그룹 정보 (삼성, 현대차 등)
companies        ← 계열사 (dart_corp_code 포함)
shareholdings    ← 지분 관계 엣지 (source → target, ownership_pct)
wedge_cache      ← 계산된 Wedge 값 캐시
ai_analysis_cache ← Bedrock 응답 캐시 (중복 API 호출 방지)
api_sync_logs    ← 동기화 이력
dart_raw_staging ← DART 원본 데이터 임시 저장
```

두 개의 View:
- `v_group_wedge_summary`: 그룹별 평균 Wedge
- `v_circular_loops`: 순환출자 루프 자동 탐지

### TypeScript ESM 주의사항

`tsconfig.json`에 `"verbatimModuleSyntax": true` 설정으로 인해, 타입만 import할 때는 반드시 `import type { ... }`을 사용해야 함. 일반 `import { SomeType }`은 TS1484 오류 발생.

---

## 4. 구현 완료 항목

### 프론트엔드 컴포넌트

| 컴포넌트 | 파일 | 기능 |
|---------|------|------|
| ChaebolNetworkMap | src/components/ | Cytoscape.js 순환출자 네트워크 (concentric 레이아웃) |
| SankeyWedgeAnalyzer | src/components/ | D3.js 폭포형 바 차트, Wedge 배수 계산 |
| AIAnalysisPanel | src/components/ | AI 분석 결과 표시 패널 |
| ScrollyNav | src/components/ | 4단계 스크롤리텔링 (IntersectionObserver) |
| GroupSelector | src/components/ | 그룹 선택 메뉴 (Mock/실데이터 섹션 분리) |
| WhatIfSimulator | src/components/ | 지분율 수동 수정 + Bedrock Nova 예측 |

### 백엔드 API

| 엔드포인트 | 설명 |
|-----------|------|
| GET /health | 서버 상태 확인 |
| GET /api/groups | 전체 그룹 목록 |
| GET /api/groups/:id/network | 특정 그룹 네트워크 (nodes + edges) |
| GET /api/groups/:id/circular-loops | 순환출자 루프 목록 |
| GET /api/sync-status | 마지막 동기화 시간 |

### 데이터 동기화

| 스크립트 | 명령 | 설명 |
|---------|------|------|
| DART 동기화 | `npm run sync:dart` | 21개 주요 계열사 지분율 수집 |
| KFTC 동기화 | `npm run sync:kftc` | 전체 대기업집단 목록 (활용신청 후 사용) |

---

## 5. 주요 해결 이력

### DART 법인코드 오류 수정 (2026-05-22)

초기 코드에 잘못된 dart_corp_code가 포함되어 "013: 조회된 데이터가 없습니다" 오류 다수 발생.

**해결 방법**:
1. DART API에서 `corpCode.xml.zip` (3.5MB) 다운로드
2. Python3로 XML 파싱, 회사명으로 코드 검색
3. 21개 계열사 전체 코드 재검증 후 `dartSync.ts`의 `DART_CODE_MAP` 업데이트

주요 정정 코드:
- 삼성생명: `00101624` → `00126256`
- 삼성화재: `00139214` (확인)
- LG디스플레이: `00227936` → `00105873`
- 현대글로비스: `00360595` (확인)

### KFTC API 오류 (미해결)

**증상**: HTTP 400 "등록되지 않은 서비스"

**원인**: data.go.kr에서 API 키 발급만으로는 부족하며, 사용할 각 서비스에 대해 별도 **활용신청** 후 승인을 받아야 함.

**임시 해결**: DART API 데이터만으로 5개 그룹 주요 계열사 지분 데이터 커버. KFTC 승인 후 `npm run sync:kftc` 실행하면 전체 대기업집단으로 확장됨.

### NVM 환경 변수 문제

신규 터미널에서 `npm` 명령이 "not found"로 나타나는 문제.

**원인**: NVM이 `.bashrc`에 등록되어 있으나 일부 터미널 환경에서 자동 로드 안 됨.

**해결**: npm 명령 실행 전 항상 NVM 로드:
```bash
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
```

### Cytoscape.js CSS 충돌

Cytoscape 노드 스타일에 `"box-shadow"` 속성 지정 시 TS2353 타입 오류 발생. Cytoscape는 CSS `box-shadow`를 지원하지 않음.

**해결**: `box-shadow` 제거. 노드 선택 시 시각 효과는 `border-width`, `border-color`, `shadow-blur` Cytoscape 전용 속성 사용.

---

## 6. 개발 환경 실행 방법

```bash
# 1. NVM 로드 (터미널마다)
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

# 2. 백엔드 서버 실행 (포트 3001)
cd /home/cho-pc/dev_ws/stockMonitoring/server
npm run dev

# 3. 프론트엔드 개발 서버 실행 (포트 5173) — 새 터미널에서
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
cd /home/cho-pc/dev_ws/stockMonitoring
npm run dev

# 4. 브라우저에서 확인
# http://localhost:5173
```

MySQL 서버가 실행 중이어야 합니다 (`DB: chaebol_db, user: root, pass: 1`).

---

## 7. 미완료 항목 (다음 단계)

| 우선순위 | 항목 | 설명 |
|---------|------|------|
| 높음 | KFTC 활용신청 완료 | data.go.kr에서 수동 승인 요청 후 `npm run sync:kftc` |
| 높음 | AWS Bedrock 실연동 | `server/.env`에 AWS 키 입력, `bedrockClient.ts` Mock 제거 |
| 중간 | 노드 엣지 지분율 레이블 | 네트워크 맵 엣지 위에 % 값 항상 표시 |
| 중간 | Chord Diagram | 순환출자 원형 시각화 (D3.js chord) |
| 낮음 | 로그인/인증 | 현재 인증 없음, 외부 배포 시 필요 |
| 낮음 | 모바일 반응형 | 현재 데스크탑 전용 |

---

## 8. 파일 구조 요약

```
stockMonitoring/
├── src/                          # 프론트엔드 (Vite + React)
│   ├── api/                      # API 클라이언트
│   │   ├── groupsApi.ts          # 백엔드 REST 호출
│   │   └── bedrockClient.ts      # Bedrock AI (현재 Mock)
│   ├── components/               # React 컴포넌트
│   ├── data/groups/              # Mock 데이터 (삼성·현대차·LG·SK·롯데)
│   ├── styles/globals.css        # CSS 변수 (다크 테마)
│   └── utils/
│       ├── types.ts              # 공통 인터페이스
│       └── graphUtils.ts         # Wedge 계산 로직
├── server/                       # 백엔드 (Express)
│   ├── src/
│   │   ├── api/
│   │   │   ├── dartClient.ts     # DART OpenAPI 호출
│   │   │   ├── dartSync.ts       # DART 동기화 스크립트
│   │   │   └── kftcClient.ts     # KFTC API (활용신청 대기)
│   │   ├── db/
│   │   │   ├── pool.ts           # mysql2 커넥션 풀
│   │   │   └── groupRepo.ts      # DB CRUD
│   │   └── index.ts              # Express 서버 진입점
│   └── .env                      # API 키 (Git 제외)
├── database/
│   ├── schema.sql                # 7테이블 + 2뷰 DDL
│   └── seed.sql                  # Mock 시드 데이터
└── doc/
    ├── api-key-setup.md          # API 키 발급 가이드
    ├── dev-notes.md              # 이 파일
    └── old/                      # 이전 버전 문서 보관
```

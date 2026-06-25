# 재벌탐색기 (Chaebol Governance Explorer)

한국 대기업집단(재벌)의 **순환출자 구조**와 **소유–지배 괴리도(Wedge)** 를 인터랙티브 그래프로 시각화하고, AWS Bedrock 기반 AI로 경영권 리스크를 해설하는 웹 애플리케이션입니다.

> ⚠️ **면책**: 포함된 지분 수치·네트워크는 공개 자료를 바탕으로 한 **교육·연구용 예시 재구성**입니다. 특정 시점의 공식 지분 현황을 보증하지 않으며, 투자 판단의 근거로 사용해서는 안 됩니다.

---

## 무엇을 보여주나

총수 일가 → 지주회사 → 계열사로 이어지는 출자 관계를 방향 그래프로 그리고, 다음을 한눈에 드러냅니다.

- **순환출자 고리** — A→B→C→A처럼 계열사끼리 서로 출자해 가공 자본을 만드는 구조 (공정거래법상 신규 금지)
- **소유–지배 괴리도(Wedge)** — 총수 일가가 실제 보유 지분(소유권)보다 훨씬 큰 의결권(지배권)을 행사하는 정도
- **금산분리 위험** — 금융계열사가 비금융 계열사 의결권에 영향을 주는 경로 (예: 삼성생명 → 삼성전자)

삼성·SK·현대차·LG 등 **19개 그룹**의 데이터가 내장되어 있어, 백엔드 없이도 모든 시각화가 동작합니다.

## 주요 기능

| 기능 | 설명 |
|------|------|
| 지분 네트워크 맵 | AntV G6 / Cytoscape 기반 방향 그래프. 노드 크기는 자산, 엣지 두께는 지분율 |
| Wedge 분석 (Sankey) | D3 Sankey로 소유권 대비 의결권 증폭을 분해 |
| Chord Diagram | 계열사 간 지분 흐름을 원형으로 표현 |
| What-If 시뮬레이터 | 지분율을 직접 바꿔 지배구조 변화를 예측 |
| AI 분석 패널 | AWS Bedrock으로 wedge·소액주주 리스크·규제 포인트 해설 (키 미설정 시 폴백) |
| 순환출자 자동 탐지 | 그래프에서 순환 고리를 검출해 강조 |

## 기술 스택

**프론트엔드** — Vite · React 19 · TypeScript · AntV G6 / Cytoscape.js · D3.js
**백엔드(선택)** — Node.js · Express 5 · TypeScript(ESM) · MySQL(mysql2)
**AI / 외부 데이터** — AWS Bedrock · DART OpenAPI · 공공데이터포털(공정위 기업집단)

데이터 흐름은 **백엔드 API → MySQL 실데이터**를 1순위로 하되, 실패 시 프론트엔드 내장 Mock JSON으로 자동 폴백합니다.

---

## 빠른 시작

가장 간단한 방법은 프론트엔드만 실행하는 것입니다. 내장 데이터로 모든 기능이 동작합니다.

```bash
git clone https://github.com/yoorobo/chaebol-explorer.git
cd chaebol-explorer
npm install
npm run dev          # http://localhost:5173
```

### 백엔드 + DB까지 (실데이터/AI 연동)

```bash
# 1) 백엔드 의존성
cd server && npm install && cd ..

# 2) 환경변수: 예시 파일을 복사한 뒤 값 채우기
cp server/.env.example server/.env
#   - DB_*           : MySQL 접속 정보
#   - DART_API_KEY   : https://opendart.fss.or.kr (무료)
#   - KFTC_API_KEY   : https://www.data.go.kr (공정위 기업집단)
#   - AWS_*          : AWS Bedrock 사용 시

# 3) MySQL 스키마/시드 적용 (DB_NAME 기본값: chaebol_db)
mysql -u <user> -p chaebol_db < database/schema.sql
mysql -u <user> -p chaebol_db < database/seed.sql

# 4) 실행 (터미널 2개)
npm run dev          # 프론트엔드  : http://localhost:5173
npm run server       # 백엔드 API : http://localhost:3001
```

### 외부 데이터 동기화

```bash
npm run sync:dart    # DART 지분 데이터 동기화
npm run sync:kftc    # 공정위 기업집단 목록 동기화 (활용신청 승인 후)
```

## 백엔드 API

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET  | `/health` | 서버 상태 확인 |
| GET  | `/api/groups` | 전체 그룹 목록 |
| GET  | `/api/groups/:id/network` | 특정 그룹 네트워크 (nodes + edges) |
| GET  | `/api/groups/:id/circular-loops` | 순환출자 고리 목록 |
| GET  | `/api/sync-status` | 최근 동기화 이력 |
| POST | `/api/analyze` | AI 분석 (Bedrock) |

## 프로젝트 구조

```
.
├── src/                  # 프론트엔드 (React + Vite)
│   ├── components/       # 네트워크 맵 · Sankey · Chord · 시뮬레이터 · AI 패널
│   ├── data/groups/      # 19개 그룹 내장 데이터 (Mock/폴백)
│   ├── api/              # 백엔드 REST 호출, Bedrock 클라이언트
│   └── utils/            # Wedge 계산, 순환출자 탐지, 그래프 유틸
├── server/               # 백엔드 (Express + MySQL)
│   └── src/{api,db}/     # DART/KFTC/Bedrock 연동, 커넥션 풀, 리포지토리
├── database/             # schema.sql · seed.sql
└── doc/                  # 개발 노트, API 키 발급 가이드, 사용자 가이드
```

---

## 환경변수

`server/.env.example`를 복사해 채웁니다. 실제 `.env`는 `.gitignore`로 저장소에서 제외됩니다.

| 키 | 용도 |
|----|------|
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASS` / `DB_NAME` | MySQL 접속 |
| `DART_API_KEY` | 금융감독원 DART OpenAPI |
| `KFTC_API_KEY` | 공공데이터포털(공정위 기업집단) |
| `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `BEDROCK_MODEL_ID` | AWS Bedrock |
| `PORT` | 백엔드 포트 (기본 3001) |

## 데이터 출처

- **금융감독원 DART** — 상장사 지분 공시
- **공공데이터포털 / 공정거래위원회** — 대규모기업집단 지정 현황

내장 Mock 데이터는 위 공개 자료를 바탕으로 재구성한 교육용 예시입니다.

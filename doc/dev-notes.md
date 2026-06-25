# 개발 노트 — 재벌 지분구조 시각화 시스템

**최종 업데이트**: 2026-05-22 17:10  
**현재 버전**: v1.3

---

## 1. 완료된 개발 항목

### 1-1. 프론트엔드

#### ChaebolNetworkMap (Cytoscape.js)
- **파일**: `src/components/ChaebolNetworkMap.tsx`
- `round-rectangle` 노드: 라벨이 노드 안에 표시, 글자 수에 맞게 너비 자동 조정
- `avoidOverlap: true`: 노드 겹침 자동 방지
- Concentric 레이아웃: 총수(중앙) → 지주사 → 금융 → 계열사 순
- 엣지에 지분율 % 레이블 (색상 = 엣지 색, 12px bold)
- 스텝별 하이라이트 (직접지분 / 1차계열사 / 전체 / 순환출자)
- 순환출자 고리 점멸 토글 버튼
- **더블클릭 지분율 수정**: 엣지 더블클릭 → 팝업창 → 입력 → Enter/적용
- **줌 % 표시**: 툴바에 현재 확대 비율(%) 실시간 표시
- **줌 컨트롤 버튼**: `−` / `＋` / `⊡(전체 맞춤)` 버튼
- **시작 시 130% 고정**: 레이아웃 완료 후 `cy.zoom(1.3)` 고정, `fit: false`로 자동 축소 없음 (`⊡` 버튼으로만 전체 맞춤 가능)
- 노드 크기: 최소 80×44px, 한글 1자 15px 기준 너비 자동 계산

#### SankeyWedgeAnalyzer (D3.js)
- **파일**: `src/components/SankeyWedgeAnalyzer.tsx`
- 폭포형 수평 바 차트 (직접/간접/재단 분리)
- Wedge 배수 강조 표시
- 노드 클릭 시 해당 계열사의 지분 분해도

#### AIAnalysisPanel
- **파일**: `src/components/AIAnalysisPanel.tsx`
- 백엔드 `/api/analyze` 호출 → 실패 시 내장 Mock
- **400ms 디바운스**: What-If 수치 변경 시 자동 재분석
- "⚡ 시뮬레이션" 태그: What-If 적용 중 표시

#### ScrollyNav
- **파일**: `src/components/ScrollyNav.tsx`
- **동적 콘텐츠**: 선택 그룹에 따라 총수명, 지분율, 순환출자 수 자동 변경
- IntersectionObserver 기반 4단계 스크롤 내비게이션

#### WhatIfSimulator
- **파일**: `src/components/WhatIfSimulator.tsx`
- 슬라이더 + 숫자 입력 지분율 수정
- 백엔드 Bedrock API 호출, 우측 AI 패널 연동

#### ChordDiagram
- **파일**: `src/components/ChordDiagram.tsx`
- D3.js chord layout 원형 지분 흐름도
- "◎ Chord 다이어그램" 버튼으로 오버레이 표시

---

### 1-2. 백엔드

#### Express API 서버
- **파일**: `server/src/index.ts`
- 7개 엔드포인트 (GET groups/network/circular-loops/sync-status + POST analyze)

#### AWS Bedrock 연동
- **파일**: `server/src/api/bedrockAnalyzer.ts`
- `@aws-sdk/client-bedrock-runtime`, `amazon.nova-lite-v1:0` 사용
- AWS 키 미설정 시 자동 Mock 응답 (키만 넣으면 즉시 전환)

#### DART 데이터 연동
- **파일**: `server/src/api/dartSync.ts`
- 21개 계열사 DART 법인코드 검증 완료 (`DART_CODE_MAP`)
- `npm run sync:dart` → MySQL 자동 적재

---

### 1-3. 데이터 (Mock JSON — 19개 그룹)

| 그룹 | 파일 | 순환출자 |
|------|------|---------|
| 삼성 | samsung.json | 3개 |
| 현대차 | hyundai.json | 3각 순환 |
| LG | lg.json | 없음 |
| SK | sk.json | 1개 |
| 롯데 | lotte.json | 1개 |
| 한화 | hanwha.json | 2개 |
| POSCO | posco.json | 없음 |
| GS | gs.json | 없음 |
| HD현대 | hd_hyundai.json | 없음 |
| 신세계 | shinsegae.json | 없음 |
| CJ | cj.json | 없음 |
| 한진 | hanjin.json | 1개 |
| 카카오 | kakao.json | 없음 |
| 두산 | doosan.json | 없음 |
| LS | ls.json | 없음 |
| 효성 | hyosung.json | 없음 |
| 코오롱 | kolon.json | 없음 |
| 네이버 | naver.json | 없음 |
| KT | kt.json | 없음 |

---

### 1-4. DB 현황 (2026-05-22 기준)

| 테이블 | 레코드 수 |
|--------|---------|
| chaebol_groups | 19개 |
| companies | 66개 |
| shareholdings | 49개 |

**백업 파일** (`database/backup/`):
- `schema_backup_20260522_1634.sql` — DDL 스키마만
- `data_backup_20260522_1634.sql` — 전체 데이터 포함

---

### 1-5. npm Scripts (프로젝트 루트에서 실행)

```bash
npm run dev          # 프론트엔드 (포트 5173)
npm run server       # 백엔드 (포트 3001)
npm run build        # 프로덕션 빌드
npm run sync:dart    # DART 동기화
npm run sync:kftc    # KFTC 동기화 (활용신청 승인 후)
```

---

## 2. 미완료 / 향후 개발 항목

### 2-1. 외부 승인 대기 (코드 완성)

#### AWS Bedrock 실 AI 응답
- **남은 작업**: `server/.env`에 AWS 키 3개 입력
  ```
  AWS_ACCESS_KEY_ID=실제키
  AWS_SECRET_ACCESS_KEY=실제시크릿
  AWS_REGION=ap-northeast-2
  ```
- **발급**: `doc/api-key-setup.md` 참조

#### KFTC 전체 기업집단 목록
- **남은 작업**: data.go.kr "대규모기업집단 소속회사" 서비스 활용신청 승인 → `npm run sync:kftc`
- **상태**: HTTP 400 오류 (서비스 활용신청 미완료)

---

### 2-2. 코드 개발 필요

| 우선순위 | 기능 | 설명 |
|---------|------|------|
| 높음 | 노드 재무정보 팝업 | 클릭 시 매출·자산·시가총액 표시 (DART fnlttSinglAcnt API) |
| 높음 | 타임라인 슬라이더 | 연도별 지분 변화 재생 (2015~2023) |
| 중간 | 모바일 반응형 | 768px 이하 단일 컬럼 레이아웃 |
| 중간 | 로그인/인증 | JWT 또는 Google OAuth (외부 배포 시) |
| 낮음 | 프로덕션 배포 | Nginx + PM2 또는 Docker 구성 |

---

## 3. 버그 수정 이력

| 날짜 | 버그 | 해결 |
|------|------|------|
| 2026-05-22 | DART corpCode 21개 오류 | corpCode.xml Python 파싱으로 재검증 |
| 2026-05-22 | npm not found | NVM 로드 / 루트 npm scripts 추가 |
| 2026-05-22 | 그룹 변경 시 좌측 내용 고정 | ScrollyNav 동적 생성으로 교체 |
| 2026-05-22 | 노드 겹침 / 레이블 겹침 | round-rectangle + avoidOverlap |
| 2026-05-22 | 노드 너무 작음 | 라벨 기반 자동 너비, fit 최대화 |
| 2026-05-22 | Cytoscape box-shadow 타입 오류 | 속성 제거 |
| 2026-05-22 | TS1484 verbatimModuleSyntax | 전체 `import type` 교체 |
| 2026-05-22 | 시작 줌 자동 축소 문제 | `fit: false` + `cy.zoom(1.3)` 고정으로 변경 |

---

## 4. 개발 환경

```
OS      : Ubuntu Linux 6.17.0-29-generic
Node.js : v20.20.1 (NVM 관리)
MySQL   : 8.0 / root / 1
IDE     : VS Code + Claude Code CLI
TS설정  : verbatimModuleSyntax=true → 타입은 반드시 import type
모듈    : ESM (package.json "type":"module") → require() 사용 불가
```

# API 키 발급 및 설정 가이드

**프로젝트**: 재벌 지분구조 시각화 시스템  
**최종 업데이트**: 2026-05-22

---

## 필요한 API 목록

| API | 용도 | 비용 | 상태 |
|-----|------|------|------|
| 금융감독원 DART | 지분율 실데이터 | 무료 | ✅ 정상 동작 |
| 공정거래위원회 KFTC | 대기업집단 목록 | 무료 | ⚠️ 활용신청 필요 |
| AWS Bedrock | AI 경영권 분석 | 유료(토큰 과금) | 미설정 |

---

## 1. DART API (금융감독원)

**용도**: 계열사 간 지분율, 최대주주 현황, 기업 기본정보  
**일일 한도**: 10,000건  

### 발급 방법

1. [https://opendart.fss.or.kr](https://opendart.fss.or.kr) 접속
2. 상단 메뉴 **Open DART → 인증키 신청/관리**
3. **인증키 신청** 탭 → 이용약관 동의 → 이메일 입력
4. 이메일 인증 링크 클릭 → 즉시 발급 (심사 없음)
5. 발급된 **40자리 키** 복사

```
예시: 7b71569002db7d8fcf00152fbf2aad62b2134dbb
```

### 주요 API 엔드포인트

| 엔드포인트 | 설명 |
|-----------|------|
| `/api/company.json` | 기업 기본정보 (대표자, 결산월, 주식코드 등) |
| `/api/majorstock.json` | 최대주주 현황 (5% 이상 주주, 지분율) |
| `/api/elestock.json` | 5% 이상 주주 현황 |
| `/api/corpCode.xml` (ZIP) | 전체 법인 코드 목록 (3.5MB, 하루 1회 권장) |

### 현재 연동 상태

- `npm run sync:dart` 실행 시 삼성·현대차·LG·SK·롯데 21개 계열사 지분 데이터 자동 수집
- 2024년 사업보고서 기준 (전년도 자동 선택)
- 법인코드(dart_corp_code) 검증 완료: `server/src/api/dartSync.ts`의 `DART_CODE_MAP` 참조

---

## 2. KFTC API (공정거래위원회)

**용도**: 대규모기업집단 지정 현황, 전체 소속 계열사 목록  
**일일 한도**: 10,000건  
**⚠️ 주의**: 키 발급 후 **별도 서비스 활용신청**이 필수입니다.

### Step 1. 공공데이터포털 키 발급

1. [https://www.data.go.kr](https://www.data.go.kr) 접속 → 회원가입 (이메일 인증)
2. **마이페이지 → 인증키 관리** → 일반 인증키 발급
3. 발급된 **64자리 키** 복사

### Step 2. 서비스 활용신청 (반드시 필요)

> 이 단계를 생략하면 API 호출 시 "등록되지 않은 서비스" 오류가 발생합니다.

1. [data.go.kr](https://www.data.go.kr) 검색창에 **"대규모기업집단 소속회사 참여업종"** 검색
2. 검색 결과 중 **공정거래위원회** 제공 서비스 클릭
3. **활용신청** 버튼 → 활용목적 작성 (예: "기업집단 지배구조 분석 연구")
4. 신청 후 **1~3 영업일** 내 승인 이메일 수신
5. 승인 후 `npm run sync:kftc` 실행

### 현재 상태

- KFTC API 키는 발급 완료 (`server/.env`에 설정됨)
- 서비스 활용신청이 미완료 상태 → 현재 `sync:kftc` 실행 시 400 오류 발생
- **임시 해결**: DART API만으로 주요 21개 계열사 지분 데이터 수집 가능

---

## 3. AWS Bedrock (AI 분석)

**용도**: 경영권 리스크 AI 분석, What-If 시뮬레이션 미래 예측  
**모델**: Amazon Nova Lite (빠른 분석), Amazon Nova Pro (심층 분석)  
**비용**: Nova Lite 입력 $0.06/1M 토큰, 출력 $0.24/1M 토큰

### 발급 방법

1. [https://aws.amazon.com](https://aws.amazon.com) → AWS 콘솔 로그인
2. **IAM → 사용자 → 사용자 추가**
3. 권한 정책: `AmazonBedrockFullAccess` (최소권한: `bedrock:InvokeModel`)
4. **액세스 키 ID**와 **시크릿 액세스 키** 생성 후 복사
5. **Amazon Bedrock → 모델 액세스** → `Amazon Nova Lite`, `Amazon Nova Pro` 활성화 요청 (즉시 승인)

### 현재 상태

- 현재 Mock 응답으로 동작 중 (`server/src/api/bedrockClient.ts`)
- 실제 Bedrock 연동 시 `server/.env`에 AWS 키 입력 후 `npm run dev` 재시작

---

## 4. .env 파일 설정

API 키 발급 후 아래 파일에 입력합니다.

**파일 위치**: `server/.env`

```env
# ── MySQL ────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=1
DB_NAME=chaebol_db

# ── DART (금감원) — 40자리 ─────────────────────
DART_API_KEY=여기에_DART_40자리_키_입력

# ── KFTC (공정위) — 64자리, 활용신청 승인 후 사용
KFTC_API_KEY=여기에_KFTC_64자리_키_입력

# ── AWS Bedrock ──────────────────────────────────
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=여기에_AWS_액세스_키
AWS_SECRET_ACCESS_KEY=여기에_AWS_시크릿_키

# ── 서버 포트 ────────────────────────────────────
PORT=3001
```

> `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다.

---

## 5. 데이터 동기화 실행 순서

```bash
# NVM 로드 (새 터미널에서 매번 필요)
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

cd /home/cho-pc/dev_ws/stockMonitoring/server

# Step 1: DART 동기화 (기업정보 + 최대주주 지분율)
npm run sync:dart

# Step 2: KFTC 동기화 — 활용신청 승인 후 실행
npm run sync:kftc

# Step 3: 백엔드 서버 실행
npm run dev
```

동기화 완료 후 프론트엔드 그룹 선택 메뉴에 실데이터 기반 기업집단이 표시됩니다.

---

## 6. API 요청 한도

| API | 일일 한도 | 초과 시 대응 |
|-----|----------|------------|
| DART | 10,000건 | HTTP 429, 다음 날 자동 초기화 |
| KFTC | 10,000건 | 운영계정 전환으로 증설 요청 가능 |
| AWS Bedrock | 계정별 Quota | AWS 콘솔에서 증설 요청 |

- DART `corpCode.xml`은 하루 1회만 다운로드 권장
- 동기화 스크립트에 API 호출 간 **300ms 딜레이** 적용됨

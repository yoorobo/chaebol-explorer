# API 키 발급 및 설정 가이드

> 재벌 지분구조 시각화 시스템의 실데이터 연동에 필요한 API 키 발급 절차입니다.

---

## 1. 금융감독원 DART API 키 (지분율 실데이터)

**용도**: 계열사 간 지분율, 최대주주 현황, 5% 이상 주주 현황  
**비용**: 무료  
**일일 한도**: 10,000건  

### 발급 절차

1. [https://opendart.fss.or.kr](https://opendart.fss.or.kr) 접속
2. 상단 메뉴 **Open DART → 인증키 신청/관리** 클릭
3. **인증키 신청** 탭 → 이용약관 동의 → 이메일 입력
4. 이메일로 발송된 인증 링크 클릭 → **즉시 발급** (심사 없음)
5. 발급된 40자리 키 복사 (예: `7b71569002db7d8fcf00152fbf2aad62b2134dbb`)

### 주요 제공 API

| API | 설명 | 엔드포인트 |
|-----|------|-----------|
| 기업 기본정보 | 종목코드, 대표자, 결산월 등 | `/api/company.json` |
| 최대주주 현황 | 5% 이상 주주, 지분율 | `/api/majorstock.json` |
| 전체 기업 코드 | 전체 상장/비상장 법인 목록 | `/api/corpCode.xml` (ZIP) |
| 주식 총수 현황 | 발행주식수, 자사주 수 | `/api/stocktotqy.json` |

---

## 2. 공정거래위원회 KFTC API 키 (대기업집단 목록)

**용도**: 대규모기업집단 지정 현황, 소속 계열사 목록  
**비용**: 무료  
**일일 한도**: 10,000건  
**⚠️ 주의**: 키 발급 후 **해당 서비스를 별도 활용신청** 해야 합니다.

### 발급 절차

**Step 1. 공공데이터포털 회원가입 및 키 발급**
1. [https://www.data.go.kr](https://www.data.go.kr) 접속
2. 우상단 **회원가입** → 이메일 인증
3. 로그인 후 **마이페이지 → 인증키 관리** → 일반 인증키 발급
4. 발급된 64자리 키 복사

**Step 2. 서비스 활용신청 (이 단계를 반드시 해야 합니다)**
1. 검색창에 **"대규모기업집단 소속회사 참여업종"** 검색
2. 검색 결과 중 **공정거래위원회** 제공 서비스 선택
3. **활용신청** 버튼 클릭 → 활용목적 작성 (예: "기업집단 지배구조 분석 연구")
4. 신청 후 **1~3 영업일** 이내 승인 이메일 수신
5. 승인 후 해당 서비스의 엔드포인트 URL을 **마이페이지 → 활용 현황**에서 확인

> **현재 상태**: KFTC API 키는 발급되었으나 서비스 활용신청이 필요한 상태입니다.  
> DART API 키는 정상 동작 중입니다.

---

## 3. AWS Bedrock 키 (AI 분석 — Nova Lite/Pro)

**용도**: 경영권 리스크 AI 분석, What-If 시뮬레이션 미래 예측  
**비용**: 토큰 기반 과금 (Nova Lite: 입력 $0.06/1M, 출력 $0.24/1M)

### 발급 절차

1. [https://aws.amazon.com](https://aws.amazon.com) → **AWS 콘솔 로그인**
2. **IAM → 사용자 → 사용자 추가**
3. 권한 정책: `AmazonBedrockFullAccess` (또는 최소권한으로 `bedrock:InvokeModel`)
4. **액세스 키 ID**와 **시크릿 액세스 키** 생성 후 복사
5. AWS 콘솔 → **Amazon Bedrock → 모델 액세스** → `Amazon Nova Lite`, `Amazon Nova Pro` **활성화** 요청 (즉시 승인)

---

## 4. .env 파일 설정

API 키를 발급받은 후 아래 파일에 입력합니다.

```bash
# 파일 경로: /home/cho-pc/dev_ws/stockMonitoring/server/.env
```

```env
# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=1
DB_NAME=chaebol_db

# DART (금감원) — 40자리
DART_API_KEY=여기에_DART_키_입력

# KFTC (공정위) — 64자리, 활용신청 승인 후 사용
KFTC_API_KEY=여기에_KFTC_키_입력

# AWS Bedrock
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=여기에_AWS_액세스_키
AWS_SECRET_ACCESS_KEY=여기에_AWS_시크릿_키

PORT=3001
```

---

## 5. 동기화 실행 순서

```bash
# 터미널에서 NVM 로드 후 실행
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

cd /home/cho-pc/dev_ws/stockMonitoring/server

# Step 1: DART 동기화 (기업 기본정보 + 최대주주 지분율)
npm run sync:dart

# Step 2: KFTC 동기화 (전체 대기업집단 목록) — 활용신청 승인 후
npm run sync:kftc

# Step 3: API 서버 실행
npm run dev
```

동기화 완료 후 프론트엔드 그룹 선택 메뉴에 **실데이터 기반 전체 대기업집단**이 표시됩니다.

---

## 6. API 요청 한도 및 주의사항

| API | 일일 한도 | 초과 시 |
|-----|----------|---------|
| DART | 10,000건 | HTTP 429, 다음 날 자동 초기화 |
| KFTC (data.go.kr) | 10,000건 | 운영계정 전환 요청으로 증설 가능 |
| AWS Bedrock | 계정 별 Quota | AWS 콘솔에서 증설 요청 |

- DART `corpCode.xml`은 하루 1회만 다운로드 권장 (용량 3.5MB)
- 동기화 스크립트에 API 간 **300ms 딜레이** 적용됨
- `.env` 파일을 **절대 Git에 커밋하지 마세요** (`.gitignore`에 포함됨)

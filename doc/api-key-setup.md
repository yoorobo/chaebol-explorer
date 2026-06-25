# API 키 발급 및 설정 가이드

**최종 업데이트**: 2026-05-22

---

## 필요한 API 목록

| API | 용도 | 비용 | 현재 상태 |
|-----|------|------|---------|
| 금융감독원 DART | 계열사 지분율 실데이터 | 무료 | ✅ 키 발급·동작 완료 |
| 공정거래위원회 KFTC | 대기업집단 목록 | 무료 | ⚠️ 활용신청 승인 대기 |
| AWS Bedrock | AI 경영권 분석 | 유료(토큰) | ⚠️ 키 미입력 |

---

## 1. DART API (금융감독원 전자공시)

**용도**: 최대주주 현황, 5% 이상 주주, 기업 기본정보  
**일일 한도**: 10,000건  

### 발급 방법
1. https://opendart.fss.or.kr 접속
2. 상단 **Open DART → 인증키 신청/관리**
3. 이메일 입력 → 인증 링크 클릭 → **즉시 발급** (심사 없음)
4. 발급된 **40자리** 키 복사

### 주요 엔드포인트
| 엔드포인트 | 설명 |
|-----------|------|
| `/api/company.json` | 기업 기본정보 |
| `/api/majorstock.json` | 최대주주 현황 |
| `/api/corpCode.xml` (ZIP) | 전체 법인 코드 (3.5MB) |

---

## 2. KFTC API (공정거래위원회 공공데이터)

**용도**: 대규모기업집단 지정 현황, 전체 소속 계열사 목록  
**일일 한도**: 10,000건

### ⚠️ 반드시 2단계 모두 완료해야 합니다

**Step 1. 공공데이터포털 키 발급**
1. https://www.data.go.kr 접속 → 회원가입
2. **마이페이지 → 인증키 관리 → 일반 인증키 발급**
3. **64자리** 키 복사

**Step 2. 서비스 활용신청 (이 단계 없으면 HTTP 400 오류)**
1. data.go.kr 검색창에 **"대규모기업집단 소속회사 참여업종"** 검색
2. **공정거래위원회** 제공 서비스 선택
3. **활용신청** 클릭 → 활용목적 입력 (예: "기업집단 지배구조 분석")
4. 신청 후 **1~3 영업일** 내 승인 이메일 수신

---

## 3. AWS Bedrock (AI 분석)

**모델**: Amazon Nova Lite (빠른 분석) / Nova Pro (심층)  
**비용**: Nova Lite 입력 $0.06/1M 토큰, 출력 $0.24/1M 토큰

### 발급 방법
1. https://aws.amazon.com → 콘솔 로그인
2. **IAM → 사용자 추가** → 권한: `AmazonBedrockFullAccess`
3. **액세스 키 ID** + **시크릿 액세스 키** 생성
4. **Amazon Bedrock → 모델 액세스** → `Amazon Nova Lite`, `Nova Pro` 활성화

---

## 4. .env 파일 설정

**파일 경로**: `server/.env`

```env
# ── MySQL ────────────────────────────────────────
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=1
DB_NAME=chaebol_db

# ── DART (금감원) — 40자리 ─────────────────────
DART_API_KEY=여기에_40자리_키_입력

# ── KFTC (공정위) — 64자리, 활용신청 승인 후 사용
KFTC_API_KEY=여기에_64자리_키_입력

# ── AWS Bedrock ──────────────────────────────────
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=여기에_액세스_키
AWS_SECRET_ACCESS_KEY=여기에_시크릿_키

# ── 서버 포트 ────────────────────────────────────
PORT=3001
```

> `.env` 파일은 `.gitignore`에 포함되어 Git에 커밋되지 않습니다.

---

## 5. 데이터 동기화 실행 순서

```bash
# NVM 로드 (터미널 열 때마다)
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"

cd ~/dev_ws/stockMonitoring

# Step 1: DART 동기화 (기업정보 + 최대주주 지분율)
npm run sync:dart

# Step 2: KFTC 동기화 (활용신청 승인 후)
npm run sync:kftc

# Step 3: 서버 실행
npm run server   # 터미널 2에서
npm run dev      # 터미널 1에서
```

---

## 6. API 한도 및 주의사항

| API | 일일 한도 | 초과 시 |
|-----|----------|--------|
| DART | 10,000건 | HTTP 429, 다음 날 자동 초기화 |
| KFTC | 10,000건 | 운영계정 전환 요청으로 증설 가능 |
| AWS Bedrock | 계정별 Quota | AWS 콘솔에서 증설 요청 |

- DART `corpCode.xml`은 하루 1회만 다운로드 권장
- 동기화 스크립트 내 API 호출 간 300ms 딜레이 적용됨

# 한국 대기업(재벌) 지분구조 시각화 및 AI 분석 시스템 개발 지침
## (Claude CLI / Claude Code 가이드라인)

이 문서는 한국 대기업(재벌)의 복잡한 지분구조, 순환출자 고리, 그리고 소유-지배 괴리도(Wedge)를 직관적으로 시각화하고, Amazon Bedrock(Nova 모델)을 통해 AI 기반의 경영권 리스크 내러티브를 자동 생성하는 웹 서비스를 개발하기 위한 Claude CLI 전용 프롬프트 및 구현 지침입니다.

---

## 1. 아키텍처 및 기술 스택 (Architecture & Tech Stack)

### 프론트엔드 (Frontend)
- **프레임워크**: React (Vite 기반, TypeScript 권장)
- **시각화 라이브러리**:
  - **Cytoscape.js**: 수십~수백 개의 계열사 네트워크 렌더링, 순환출자 루프(Circular Loop) 탐색 및 애니메이션 처리.
  - **D3.js (Sankey Diagram)**: 특정 노드 클릭 시 소유권(현금흐름권)과 의결권(통제권)의 괴리도(Wedge)를 시각화하는 우측 상세 패널.
- **스타일링**: CSS Variables 기반의 모던 다크 모드 (Sleek Dark Mode) 및 Glassmorphism 디자인.
- **UX 패턴**: 스크롤리텔링(Scrollytelling) 도입 (좌측 해설 텍스트 스크롤에 따라 우측 네트워크 노드/엣지 하이라이트 인터랙션 동기화).

### 백엔드 및 AI (Backend & AI)
- **인프라**: AWS Serverless 아키텍처
  - **AWS Amplify**: 프론트엔드 호스팅 및 배포
  - **Amazon Cognito**: 사용자 인증 및 JWT 발급
  - **Amazon API Gateway + AWS Lambda**: 서버리스 REST API 엔드포인트 및 비즈니스 로직 실행
  - **Amazon DynamoDB**: 이전 대화 내역, 사용자 세션 상태 및 지분 데이터 캐시 저장
- **AI 추론 엔진**: Amazon Bedrock Converse API
  - **Amazon Nova Lite**: 대화형 챗봇, 클릭한 노드/엣지에 대한 즉각적인 상황 인지형 AI 툴팁(Context-aware AI Tooltip) 요약 리포트 생성 (가성비 최적화: 입력 $0.06/1M, 출력 $0.24/1M)
  - **Amazon Nova Pro**: 복잡한 지배구조 리스크 심층 진단 및 What-If 시뮬레이션 결과에 대한 고도화된 추론 보고서 생성 (입력 $0.80/1M, 출력 $3.20/1M)
  - **보안 설정**: IAM 최소 권한(Least Privilege) 원칙 적용. Lambda가 지정된 Bedrock Nova 모델군만 호출할 수 있도록 엄격히 제한.

### 데이터 파이프라인 (Data Pipeline)
- **노드(Node) 수집**: 공공데이터포털(data.go.kr) - 공정거래위원회(KFTC)의 '대규모기업집단 소속회사 참여업종 정보 조회 서비스' OpenAPI (REST형, XML 반환) 연동하여 계열사 목록 및 메타데이터 추출.
- **엣지(Edge) 수집**: 금융감독원 전자공시시스템(DART) OpenAPI 연동. 계열사 간 상호 지분율 및 총수 일가 지분율 교차 검증 데이터 파싱.
- **데이터 저장**: 최종 데이터는 JSON/Graph 형식으로 정규화하여 데이터베이스(GraphDB 또는 캐싱된 DynamoDB 테이블)에 적재.

---

## 2. 단계별 구현 요구사항 (Step-by-Step Implementation Instructions)

### 1단계: 개발용 모의 데이터(Mock Data) 설계
Claude CLI는 외부 API 연결 전에 즉시 테스트 가능한 모의 데이터를 먼저 구축해야 합니다.
- **대상**: 삼성그룹(2015년 합병 당시 순환출자 구조) 또는 현대자동차그룹 지분구조.
- **노드 데이터 포맷 (nodes.json)**:
  ```json
  [
    {"id": "owner", "label": "총수 일가 (동일인)", "type": "individual", "asset": 0},
    {"id": "corp_A", "label": "제일모직", "type": "holding_like", "asset": 5000000000000, "listed": true},
    {"id": "corp_B", "label": "삼성생명", "type": "financial", "asset": 200000000000000, "listed": true},
    {"id": "corp_C", "label": "삼성물산", "type": "affiliate", "asset": 8000000000000, "listed": true},
    {"id": "corp_D", "label": "삼성전자", "type": "cash_cow", "asset": 300000000000000, "listed": true}
  ]
  ```
- **엣지 데이터 포맷 (edges.json)**:
  ```json
  [
    {"source": "owner", "target": "corp_A", "weight": 42.17, "type": "direct_ownership"},
    {"source": "corp_A", "target": "corp_B", "weight": 19.3, "type": "subsidiary_ownership"},
    {"source": "corp_B", "target": "corp_D", "weight": 7.21, "type": "subsidiary_ownership"},
    {"source": "corp_A", "target": "corp_C", "weight": 5.0, "type": "subsidiary_ownership"},
    {"source": "corp_C", "target": "corp_D", "weight": 4.06, "type": "subsidiary_ownership"},
    {"source": "corp_D", "target": "corp_A", "weight": 1.2, "type": "circular_loop"}
  ]
  ```

### 2단계: Cytoscape.js 기반 순환출자 네트워크 뷰 구현
- **레이아웃**: 태양계(Solar System) 또는 방사형(Radial Force-directed) 레이아웃 적용. 동일인(총수)을 중앙에 배치하고, 외곽 궤도에 계열사들을 자산 규모(노드 크기)에 비례하여 배치.
- **색상 테마**:
  - 금융계열사(금산분리 규제 대상)는 붉은색 보더.
  - 상장사는 선명한 Neon Blue, 비상장사는 어두운 Slate Gray.
- **순환출자 고리 하이라이트 (Highlight Circular Loops)**:
  - 사용자가 상단 "Highlight Loops" 토글 시, 일반 지분선은 투명도를 낮추고(Fade out), 순환출자를 형성하는 엣지(A -> B -> C -> A)들만 형광색(Neon Green)으로 점멸 애니메이션(Pulse) 처리.

### 3단계: D3.js 기반 소유-지배 괴리도 샌키 다이어그램 구현
- **트리거**: 사용자가 네트워크 뷰에서 특정 노드(예: corp_D)를 클릭 시 작동.
- **시각화 흐름**:
  - 좌측(Source): 총수 가문의 직접 소유 지분율 (매우 얇은 흐름).
  - 중간(Path): 계열사 지분, 우회 지분, 공익재단, 자사주 등이 합류하여 흐름이 두꺼워짐.
  - 우측(Target): 최종 지배 대상(corp_D)에 도달했을 때의 합산 '의결권(Voting Power)' (매우 두꺼운 흐름).
- **시각적 목표**: 가느다란 현금흐름권이 계열사 출자를 통해 거대한 의결권으로 증폭되는 괴리(Wedge)를 단 한 번에 인지할 수 있도록 면적 대비를 극대화할 것.

### 4단계: 스크롤리텔링(Scrollytelling) 내비게이션 구축
- 화면 좌측에 이야기 흐름(Story Narrative)이 담긴 카드형 텍스트를 배치하고, 우측에 시각화 영역을 고정(Sticky).
- 사용자가 마우스 스크롤을 내릴 때마다 이벤트(Intersection Observer)를 감지하여:
  1. **초기 화면**: 총수 일가 노드와 직접 지분만 하이라이트.
  2. **1단계 스크롤**: 지주회사 및 1차 핵심 자회사로 시야 확장.
  3. **2단계 스크롤**: 복잡한 전체 계열사 출자망 렌더링.
  4. **3단계 스크롤**: 순환출자 고리 점멸 애니메이션 가동 및 문제점 텍스트 하이라이트.

### 5단계: Amazon Bedrock (Nova) API 연동 및 상황 인지 AI 툴팁 구현
- 사용자가 노드 또는 엣지를 클릭하거나 상세 분석 버튼을 누르면 백엔드 Lambda 함수를 통해 Amazon Bedrock Converse API를 호출.
- **시스템 프롬프트 (System Prompt for Amazon Nova)**:
  ```text
  You are an expert on South Korean corporate governance (Chaebol structures). 
  Analyze the provided network shareholding data (JSON format containing ownership percentages, wedge details, and loop configurations).
  Generate a concise, professional briefing in English or Korean detailing:
  1. How the controlling family leverages indirect shares to command this company (Wedge analysis).
  2. The specific risks this structure poses to minority shareholders (Agency problems, tunneling risk).
  3. Relevant South Korean regulations (e.g., Separation of banking and commerce, holding company debt limits).
  Keep it under 3 short paragraphs. Tone: Analytical, Objective, and Clear for foreign investors.
  ```
- **비용 최적화**: API Gateway와 Lambda 레이어에 캐싱(Caching)을 적용하여, 동일한 노드/구조 분석 요청은 Bedrock을 재호출하지 않고 DynamoDB에서 즉시 리턴하도록 설계.

### 6단계: What-If 가상 스트레스 테스트 시뮬레이터 구현
- 사용자가 특정 엣지(지분선)를 마우스로 우클릭하여 '지분 매각(Sell-off)' 또는 '연결 해제'를 시뮬레이션할 수 있는 UI 제공.
- **인터랙션 피드백**:
  - 지분선 단절 시, Cytoscape.js의 물리 엔진이 동작하여 총수의 지배력 밖으로 벗어난 계열사 노드가 궤도 밖으로 튕겨져 나가는(Orbit departure) 연출 구현.
  - 우측 패널 of 소유-지배 괴리도 및 의결권 수치가 동적으로 감소하여 차트가 실시간 재렌더링되도록 구현.
  - Amazon Nova Lite가 "지분 해소 시 그룹의 총 의결권 변동 영향 및 순환출자 해소 효과"를 즉석에서 요약 서술하도록 비동기 호출 처리.

---

## 3. Claude CLI 실행용 프롬프트 템플릿 (Copy & Paste Prompt)

이 지침을 바탕으로 Claude CLI에게 개발을 시작하라고 명령할 때 사용할 수 있는 프롬프트 모음입니다.

### 프롬프트 1: 프로젝트 뼈대 및 모의 데이터 생성
> "Vite + React + TypeScript 환경의 프로젝트를 `./` 경로에 생성해 줘. 그리고 한국 재벌의 지분구조 시각화를 테스트하기 위한 mock data 파일인 `nodes.json`과 `edges.json`을 만들어 줘. 데이터는 삼성그룹의 2015년 합병 전후 구조를 모방하여 총수 일가, 제일모직, 삼성생명, 삼성물산, 삼성전자가 포함되도록 구성하고, 지분율(weight)과 지분 유형(direct_ownership, subsidiary_ownership, circular_loop)을 명시해 줘."

### 프롬프트 2: Cytoscape.js 시각화 컴포넌트 작성
> "`nodes.json`과 `edges.json` 데이터를 읽어들여 화면에 방사형 네트워크 그래프를 그리는 `ChaebolNetworkMap.tsx` 컴포넌트를 Cytoscape.js를 사용해 작성해 줘. 동일인(총수)이 중앙에 오고 계열사들이 주변에 배치되는 레이아웃이어야 해. 상단에 '순환출자 고리 하이라이트(Highlight Loops)' 버튼을 만들어서, 클릭 시 순환구조를 가진 엣지만 Neon Green 색상으로 깜빡거리게 만들고 다른 노드는 흐리게 처리해 줘. 디자인은 다크 모드 기반의 세련된 스타일을 적용해 줘."

### 프롬프트 3: D3.js 샌키 다이어그램 컴포넌트 작성
> "특정 계열사 노드를 클릭했을 때 해당 기업을 타겟으로 하여 소유-지배 괴리도(Wedge)를 보여주는 D3.js 기반의 샌키 다이어그램 컴포넌트 `SankeyWedgeAnalyzer.tsx`를 구현해 줘. 좌측에는 총수의 아주 얇은 직접 지분율이 표시되고, 계열사들의 지분이 합쳐져 우측 최종 타겟 노드에 도달할 때는 두꺼운 의결권 흐름으로 확장되는 형태여야 해."

### 프롬프트 4: AWS Lambda + Bedrock Nova 연동 API 작성
> "Amazon Bedrock Converse API를 사용하여 특정 기업 지분 분석 요약본을 받아오는 AWS Lambda 함수 코드(`index.js` or `handler.py`)를 작성해 줘. Amazon Nova Lite 모델을 호출해야 하고, 입력으로 노드와 엣지 정보를 받아 총수가 적은 지분으로 어떻게 해당 기업을 지배하는지(Wedge 분석)와 소수 주주 리스크를 3문장 이내의 전문적인 영어/한국어로 요약해 주는 시스템 프롬프트를 작성해 줘. API Gateway 연동에 대응하도록 CORS 헤더와 JSON 응답 규격을 맞춰 줘."

### 프롬프트 5: What-If 시뮬레이터 기능 추가
> "프론트엔드 대시보드에 What-If 시뮬레이션 기능을 구현해 줘. 사용자가 특정 지분율 연결선을 끊으면, Cytoscape.js가 물리 계산을 다시 수행하여 영향력을 잃은 계열사 노드가 중심에서 멀어지는 애니메이션을 보여주고, D3.js 샌키 다이어그램의 의결권 합산 수치가 실시간으로 재계산되어야 해. 이 변경 사항을 백엔드 AI 분석 API로 보내 즉각적인 경영권 변화 영향 리포트를 받아와 화면 하단에 렌더링해 줘."

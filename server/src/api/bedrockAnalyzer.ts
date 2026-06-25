/**
 * AWS Bedrock Converse API 연동
 * server/.env에 AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION 설정 후 동작
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import "dotenv/config";

const hasAwsKeys =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_ACCESS_KEY_ID !== "your_aws_access_key" &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.AWS_SECRET_ACCESS_KEY !== "your_aws_secret_key";

let client: BedrockRuntimeClient | null = null;

if (hasAwsKeys) {
  client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION ?? "ap-northeast-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export interface AnalyzeRequest {
  nodeLabel: string;
  groupName: string;
  directOwnership: number;
  totalVotingPower: number;
  nodeType: string;
  connectedEdges: { fromLabel: string; toLabel: string; pct: number; type: string }[];
  mode: "node" | "whatif";
  whatifChanges?: string;
  wedgeDelta?: number;
}

export interface AnalyzeResult {
  wedgeAnalysis: string;
  minorityRisk: string;
  regulations: string;
  usedRealAI: boolean;
}

export async function analyzeWithBedrock(req: AnalyzeRequest): Promise<AnalyzeResult> {
  if (!client) {
    return buildMockResponse(req);
  }

  const wedgeMultiplier =
    req.directOwnership > 0
      ? (req.totalVotingPower / req.directOwnership).toFixed(1)
      : "∞";

  const prompt =
    req.mode === "whatif"
      ? buildWhatIfPrompt(req, wedgeMultiplier)
      : buildNodePrompt(req, wedgeMultiplier);

  try {
    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID ?? "us.amazon.nova-lite-v1:0",
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 800, temperature: 0.3 },
    });

    const response = await client.send(command);
    const text =
      response.output?.message?.content?.[0]?.text ?? "";

    return parseBedrockResponse(text, true);
  } catch (err) {
    console.warn("[Bedrock] API 오류, Mock 응답 사용:", (err as Error).message);
    return buildMockResponse(req);
  }
}

function buildNodePrompt(req: AnalyzeRequest, wedgeMultiplier: string): string {
  const edges = req.connectedEdges
    .map((e) => `  - ${e.fromLabel} → ${e.toLabel}: ${e.pct.toFixed(2)}% (${e.type})`)
    .join("\n");

  return `당신은 한국 재벌 지배구조 전문 애널리스트입니다.
아래 기업 정보를 분석하고 JSON 형식으로 응답하세요.

기업: ${req.nodeLabel} (${req.groupName})
유형: ${req.nodeType}
직접 소유 지분: ${req.directOwnership.toFixed(2)}%
총 실질 의결권: ${req.totalVotingPower.toFixed(2)}%
지배력 증폭 배수: ${wedgeMultiplier}×

관련 지분 관계:
${edges}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "wedgeAnalysis": "Wedge 분석 내용 (2-3문장, 구체적 수치 포함)",
  "minorityRisk": "소수주주 리스크 분석 (2문장)",
  "regulations": "관련 규제 분석 (1-2문장)"
}`;
}

function buildWhatIfPrompt(req: AnalyzeRequest, wedgeMultiplier: string): string {
  return `당신은 한국 재벌 지배구조 전문 애널리스트입니다.
지분율 변경 시나리오를 분석하고 JSON 형식으로 응답하세요.

그룹: ${req.groupName}
지분 변경 내역: ${req.whatifChanges}
의결권 변화: ${req.wedgeDelta && req.wedgeDelta > 0 ? "▲" : "▼"} ${Math.abs(req.wedgeDelta ?? 0).toFixed(2)}%p
변경 후 지배력 증폭 배수: ${wedgeMultiplier}×

{
  "wedgeAnalysis": "시나리오 분석 — 지배구조 변화 영향 (2-3문장)",
  "minorityRisk": "이 변경이 소수주주에게 미치는 영향 (2문장)",
  "regulations": "공정거래법·금산분리법 관점 검토 (1-2문장)"
}`;
}

function parseBedrockResponse(text: string, usedRealAI: boolean): AnalyzeResult {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        wedgeAnalysis: parsed.wedgeAnalysis ?? "",
        minorityRisk: parsed.minorityRisk ?? "",
        regulations: parsed.regulations ?? "",
        usedRealAI,
      };
    }
  } catch {
    // JSON 파싱 실패 시 전체 텍스트를 wedgeAnalysis에
  }
  return {
    wedgeAnalysis: text,
    minorityRisk: "",
    regulations: "",
    usedRealAI,
  };
}

function buildMockResponse(req: AnalyzeRequest): AnalyzeResult {
  const wedgeMultiplier =
    req.directOwnership > 0
      ? (req.totalVotingPower / req.directOwnership).toFixed(1)
      : "∞";

  if (req.mode === "whatif") {
    const isIncrease = (req.wedgeDelta ?? 0) > 0;
    return {
      wedgeAnalysis: `${req.groupName} 지분 변경 시나리오: ${req.whatifChanges}. 이 변경으로 총 의결권이 ${Math.abs(req.wedgeDelta ?? 0).toFixed(2)}%p ${isIncrease ? "증가" : "감소"}하며 지배력 증폭 배수는 ${wedgeMultiplier}×가 됩니다.`,
      minorityRisk: isIncrease
        ? "지배주주의 의결권 강화로 소수주주 이익과의 충돌 가능성이 높아집니다. 내부거래 및 터널링 리스크를 면밀히 모니터링해야 합니다."
        : "지배력 분산으로 소수주주 권익 보호가 강화될 가능성이 있습니다. ESG 평가 개선 및 코리아 디스카운트 해소에 긍정적입니다.",
      regulations: isIncrease
        ? "공정거래법상 계열사 간 출자 규제 및 대규모 내부거래 의무 공시 대상이 됩니다."
        : "자발적 순환출자 해소는 공정거래법상 긍정적으로 평가되며 규제 당국의 호의적 검토를 받을 수 있습니다.",
      usedRealAI: false,
    };
  }

  return {
    wedgeAnalysis: `${req.nodeLabel}(${req.groupName})의 직접 지분 ${req.directOwnership.toFixed(2)}% 대비 실질 의결권 ${req.totalVotingPower.toFixed(2)}%로 지배력 증폭 배수 ${wedgeMultiplier}×를 기록합니다. 계열사 간 연쇄 출자를 통해 소유보다 큰 지배력을 행사하는 전형적인 재벌 구조입니다.`,
    minorityRisk: `소유-지배 괴리도가 ${wedgeMultiplier}×에 달해 지배주주와 소수주주 간 이해 충돌 가능성이 존재합니다. 내부거래 및 계열사 지원에서 소수주주 이익이 침해될 수 있습니다.`,
    regulations: `공정거래법상 대규모기업집단 지정 요건 적용 대상이며, 금융계열사 포함 시 금산분리법 추가 규제를 받습니다.`,
    usedRealAI: false,
  };
}

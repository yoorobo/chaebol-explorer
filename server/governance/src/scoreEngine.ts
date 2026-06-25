export interface ScoreInput {
  cfr: number;
  vr: number;
  wedge: number;
  circularIntensity?: number;
  minorityExposure?: number;
}

export interface ScoreResult {
  draft: true;
  methodologyVersion: "governance-score-v1.0-draft";
  scoreMethod: "deduction_rules_plus_zscore";
  rawScore: number;
  finalScore: number;
  deductions: Array<{ reason: string; points: number }>;
  disclaimer: string;
}

const DISCLAIMER =
  "This score uses a draft methodology and is provided for informational purposes only. It is not investment advice, legal advice, or a regulatory rating.";

export function computeDraftScore(input: ScoreInput): ScoreResult {
  const deductions: Array<{ reason: string; points: number }> = [];
  if (input.wedge > 0.25) deductions.push({ reason: "High wedge", points: 18 });
  else if (input.wedge > 0.1) deductions.push({ reason: "Medium wedge", points: 10 });
  else if (input.wedge > 0) deductions.push({ reason: "Low wedge", points: 4 });

  if ((input.circularIntensity ?? 0) > 0.25) deductions.push({ reason: "Circular intensity", points: 8 });
  if ((input.minorityExposure ?? 0) > 0.2) deductions.push({ reason: "Minority exposure", points: 6 });

  const rawScore = Math.max(0, 100 - deductions.reduce((s, d) => s + d.points, 0));

  return {
    draft: true,
    methodologyVersion: "governance-score-v1.0-draft",
    scoreMethod: "deduction_rules_plus_zscore",
    rawScore,
    finalScore: rawScore,
    deductions,
    disclaimer: DISCLAIMER,
  };
}

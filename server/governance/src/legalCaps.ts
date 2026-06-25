import type { GovernanceEdge } from "./types";

export interface LegalCapsInput {
  edge: GovernanceEdge;
  agendaType?: "general" | "core";
  applyCircularRestriction?: boolean;
  closingEdgeId?: string;
}

export interface LegalCapsResult {
  adjustedVotingRights: number;
  warnings: string[];
  assumptions: string[];
}

export function applyLegalCaps(input: LegalCapsInput): LegalCapsResult {
  const warnings = ["This model is not legal advice."];
  const assumptions: string[] = [];
  const base = input.edge.rawVotingRights > 1 ? input.edge.rawVotingRights / 100 : input.edge.rawVotingRights;
  let adjusted = base;

  const isFinancialCapTarget =
    input.edge.isFinancialOrInsuranceHolder && input.edge.isDomesticNonFinancialAffiliateTarget;
  const isFoundationCapTarget =
    input.edge.isPublicInterestFoundationHolder && input.edge.isDomesticNonFinancialAffiliateTarget;

  if (isFinancialCapTarget || isFoundationCapTarget) {
    if ((input.agendaType ?? "general") === "general") {
      adjusted = 0;
      assumptions.push("general agenda: voting rights treated as 0 for capped holder-target pair");
    } else {
      adjusted = Math.min(adjusted, 0.15);
      assumptions.push("core agenda: 15% cap applied");
    }
  }

  if (input.applyCircularRestriction) {
    if (input.closingEdgeId && input.closingEdgeId === input.edge.edgeId) {
      adjusted = 0;
      assumptions.push("explicit closing edge restriction applied by option");
    } else {
      warnings.push("circular restriction option on, but closingEdgeId not matched; no auto deduction");
    }
  } else {
    warnings.push("circular voting restriction is off by default without formation timing data");
  }

  return { adjustedVotingRights: adjusted, warnings, assumptions };
}

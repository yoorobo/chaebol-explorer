import type { Methodology } from "./types";

export function getMethodologyRegistry(): Methodology {
  return {
    methodologyVersion: "governance-score-v1.0-draft",
    cfrMethod: "brioschi_integrated_ownership_matrix (Y = A(I-A)^-1)",
    vrMethod: "weakest_link_sum_with_legal_caps",
    scoreMethod: "deduction_rules_plus_zscore",
    draft: true,
    disclaimers: [
      "not investment advice",
      "not legal advice",
      "not regulatory rating",
    ],
  };
}

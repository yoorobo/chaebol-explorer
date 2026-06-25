export interface WedgeResult {
  wedge: number;
  controlLeverage: number | null;
  highLeverageFlag: boolean;
}

export function computeWedge(cfr: number, vr: number, epsilon = 1e-6): WedgeResult {
  const wedge = vr - cfr;
  if (cfr === 0) {
    return { wedge, controlLeverage: null, highLeverageFlag: true };
  }
  const highLeverageFlag = cfr < epsilon;
  return {
    wedge,
    controlLeverage: vr / cfr,
    highLeverageFlag,
  };
}

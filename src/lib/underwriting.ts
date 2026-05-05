export type UnderwritingMetrics = {
  annualRent: number;
  estExpenses: number;
  netOperating: number;
  monthlyCashflow: number;
  annualCashflow: number;
  grossYield: number | null;
  capRate: number | null;
  roi: number | null;
};

export function calculateUnderwriting(input: {
  purchasePrice: number | null;
  estRent: number;
  expenseRatio?: number;
}): UnderwritingMetrics {
  const purchasePrice = Number(input.purchasePrice || 0) || null;
  const estRent = Number(input.estRent || 0);
  const expenseRatio = Number.isFinite(input.expenseRatio) ? Number(input.expenseRatio) : 0.35;
  const annualRent = Math.round(estRent * 12);
  const estExpenses = Math.round(annualRent * expenseRatio);
  const netOperating = Math.round(annualRent - estExpenses);
  const monthlyCashflow = Math.round(netOperating / 12);
  const annualCashflow = netOperating;
  const grossYield = purchasePrice ? Number(((annualRent / purchasePrice) * 100).toFixed(2)) : null;
  const capRate = purchasePrice ? Number(((netOperating / purchasePrice) * 100).toFixed(2)) : null;
  const roi = purchasePrice ? Number(((annualCashflow / purchasePrice) * 100).toFixed(2)) : null;

  return {
    annualRent,
    estExpenses,
    netOperating,
    monthlyCashflow,
    annualCashflow,
    grossYield,
    capRate,
    roi,
  };
}
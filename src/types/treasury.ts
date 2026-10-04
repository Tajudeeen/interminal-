export interface OpportunityCost {
  idleUsdc: number;
  apy: number;
  annualYieldBps: number;
  annualYieldUsd: number;
  annualForfeited: number;
  monthlyYieldUsd: number;
  monthlyForfeited: number;
  dailyYieldUsd: number;
  dailyForfeited: number;
  dailyBps: number;
}

export interface YieldSweep {
  sweepAmount: number;
  recommended: boolean;
  bufferKept: number;
  annualExtraYield: number;
}

export interface JitUnwindParams {
  tradeAmountUsd: number;
  liquidUsdc?: number;
  usycBalance?: number;
  usycPriceUsd?: number;
  slippageBps?: number;
}

export interface JitUnwindResult {
  needed: boolean;
  deficit: number;
  shortfall?: number;
  usycToRedeem: number;
  canCover: boolean;
  remainingUsyc: number;
}

export interface FxParityResult {
  price: number;
  benchmarkRate: number;
  fedRate: number;
  fedFundsRate: number;
  ecbRate: number;
  ecbDepositRate: number;
  rateSpreadBps: number;
  carrySpreadBps: number;
  pipSize: number;
  pipSpread: number;
  spreadBps: number;
  pipsFromParity: number;
  longUsdCarryAnnual: number;
  longEurCarryAnnual: number;
  carryDirection: string;
  isWithinParityBand: boolean;
}

export interface PortfolioSnapshotRow {
  sym: string;
  qty: number;
  px: number;
  value: number;
  chg: number;
  alloc: number;
}

export interface PortfolioSnapshot {
  total: number;
  stables: number;
  largest: PortfolioSnapshotRow | null;
  pnlDay: number;
  pnlDayPct: number;
  rows: PortfolioSnapshotRow[];
}

export interface RiskMetrics {
  concentration: string;
  concentrationPct: number;
  liquidity: string;
  stableBuffer: string;
  stablePct: number;
  largest: PortfolioSnapshotRow | null;
  volatility: string;
  volScore: number;
  drawdown: number;
}

import { PAIRS } from "../../constants/pairs";
import { PortfolioSnapshot, RiskMetrics } from "../../types/treasury";
import { tokenPrice } from "./quotes";

export function portfolioSnapshot(
  balances: Record<string, number>,
  isLivePortfolio = false,
  customPairs: Record<string, any> = {}
): PortfolioSnapshot {
  const rows = Object.entries(balances)
    .map(([sym, qty]) => {
      const px = tokenPrice(sym, customPairs);
      const value = qty * px;
      return {
        sym,
        qty,
        px,
        value,
        chg: PAIRS[`${sym}/USDC`]?.change ?? customPairs[`${sym}/USDC`]?.change ?? 0,
        alloc: 0,
      };
    })
    .filter((r) => r.value > 0.5);

  const total = rows.reduce((s, r) => s + r.value, 0);
  rows.forEach((r) => {
    r.alloc = total ? (r.value / total) * 100 : 0;
  });
  rows.sort((a, b) => b.value - a.value);

  const stables = rows
    .filter((r) => r.sym === "USDC" || r.sym === "EURC" || r.sym === "USYC")
    .reduce((s, r) => s + r.alloc, 0);

  const largest = rows[0] || null;
  const pnlDay = isLivePortfolio ? 0 : total * 0.0317;
  const pnlDayPct = isLivePortfolio ? 0 : 3.17;

  return { rows, total, stables, largest, pnlDay, pnlDayPct };
}

export function riskMetrics(snapshot: PortfolioSnapshot): RiskMetrics {
  const conc = snapshot.largest ? snapshot.largest.alloc : 0;
  const vol = snapshot.rows.reduce((s, r) => s + (Math.abs(r.chg) * r.alloc) / 100, 0);

  return {
    concentration: conc > 55 ? "High" : conc > 40 ? "Medium" : "Low",
    concentrationPct: conc,
    liquidity: "Low",
    stableBuffer: snapshot.stables >= 25 ? "Healthy" : snapshot.stables >= 10 ? "Tight" : "Thin",
    stablePct: snapshot.stables,
    largest: snapshot.largest,
    volatility: vol > 2.5 ? "Elevated" : "Normal",
    volScore: vol,
    drawdown: 4.2,
  };
}

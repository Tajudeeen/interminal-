import { USYC_APY } from "../../constants/arc";
import { OpportunityCost, YieldSweep, JitUnwindParams, JitUnwindResult } from "../../types/treasury";

export function calculateOpportunityCost(idleUsdc: number, apy = USYC_APY): OpportunityCost {
  if (!Number.isFinite(idleUsdc) || idleUsdc < 0) throw new Error("Invalid idle USDC balance");
  const effApy = apy > 1 ? apy / 100 : apy;
  const dailyYieldRate = effApy / 365;
  const dailyForfeited = idleUsdc * dailyYieldRate;
  const monthlyForfeited = idleUsdc * (effApy / 12);
  const annualForfeited = idleUsdc * effApy;
  const dailyBps = dailyYieldRate * 10000;

  return {
    idleUsdc,
    apy: effApy,
    annualYieldBps: Math.round(effApy * 10000),
    annualYieldUsd: Math.round(annualForfeited * 100) / 100,
    annualForfeited,
    monthlyYieldUsd: Math.round(monthlyForfeited * 100) / 100,
    monthlyForfeited,
    dailyYieldUsd: Math.round(dailyForfeited * 1000) / 1000,
    dailyForfeited,
    dailyBps,
  };
}

export function calculateJitUnwind({
  tradeAmountUsd,
  liquidUsdc = 0,
  usycBalance = 0,
  slippageBps = 0,
}: JitUnwindParams): JitUnwindResult {
  if (!Number.isFinite(tradeAmountUsd) || tradeAmountUsd <= 0) throw new Error("Invalid trade amount");
  const liquid = Math.max(0, Number(liquidUsdc) || 0);
  const usyc = Math.max(0, Number(usycBalance) || 0);

  if (tradeAmountUsd <= liquid) {
    return {
      needed: false,
      deficit: 0,
      shortfall: 0,
      usycToRedeem: 0,
      canCover: true,
      remainingUsyc: usyc,
    };
  }

  const deficit = tradeAmountUsd - liquid;
  const slipMultiplier = 1 + (Number(slippageBps) || 0) / 10000;
  const usycToRedeem = Math.ceil(deficit * slipMultiplier * 100) / 100;
  const canCover = (liquid + usyc) >= tradeAmountUsd && usyc >= usycToRedeem;
  const remainingUsyc = Math.max(0, usyc - usycToRedeem);

  return {
    needed: true,
    deficit,
    shortfall: deficit,
    usycToRedeem,
    canCover,
    remainingUsyc,
  };
}

export function calculateYieldSweep(
  liquidOrObj: number | { liquidUsdc?: number; reserveBufferUsd?: number } = 0,
  reserveBufferUsd = 500
): YieldSweep {
  const liquid = typeof liquidOrObj === "object" && liquidOrObj !== null
    ? Math.max(0, Number(liquidOrObj.liquidUsdc) || 0)
    : Math.max(0, Number(liquidOrObj) || 0);

  const buffer = typeof liquidOrObj === "object" && liquidOrObj !== null
    ? Math.max(0, Number(liquidOrObj.reserveBufferUsd ?? 500))
    : Math.max(0, Number(reserveBufferUsd) || 0);

  if (liquid <= buffer) {
    return { sweepAmount: 0, recommended: false, bufferKept: liquid, annualExtraYield: 0 };
  }

  const sweepAmount = Math.floor((liquid - buffer) * 100) / 100;
  const annualExtraYield = Math.round(sweepAmount * USYC_APY * 100) / 100;
  return { sweepAmount, recommended: true, bufferKept: buffer, annualExtraYield };
}

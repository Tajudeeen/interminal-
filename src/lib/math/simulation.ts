import { calculateJitUnwind } from "./treasury";
import type { TradeSide } from "../../types/trade";

// All simulation actions conserve input assets. Never create purchasing power.
export function simulateTrade(
  balances: Record<string, number>,
  base: string,
  side: TradeSide,
  amountUsd: number,
  price: number,
  received: number,
  usycPrice: number,
  slippageBps: number,
) {
  if (
    ![amountUsd, price, received, usycPrice].every(Number.isFinite) ||
    amountUsd <= 0 ||
    price <= 0 ||
    received <= 0 ||
    usycPrice <= 0
  )
    throw new Error("Invalid simulation quote");
  const next = { ...balances };
  if (side === "buy") {
    const jit = calculateJitUnwind({
      tradeAmountUsd: amountUsd,
      liquidUsdc: next.USDC || 0,
      usycBalance: next.USYC || 0,
      usycPriceUsd: usycPrice,
      slippageBps,
    });
    if (!jit.canCover) throw new Error("Insufficient simulated liquidity");
    if (jit.needed) next.USYC = jit.remainingUsyc;
    next.USDC = Math.max(0, (next.USDC || 0) - amountUsd);
    next[base] = (next[base] || 0) + received;
  } else {
    const input = amountUsd / price;
    if ((next[base] || 0) < input)
      throw new Error("Insufficient simulated token balance");
    next[base] = (next[base] || 0) - input;
    next.USDC = (next.USDC || 0) + received;
  }
  return next;
}

export function simulateTreasury(
  balances: Record<string, number>,
  amountIn: number,
  direction: "sweep" | "unwind",
  nav: number,
) {
  if (
    !Number.isFinite(amountIn) ||
    amountIn <= 0 ||
    !Number.isFinite(nav) ||
    nav <= 0
  )
    throw new Error("Invalid treasury input");
  const input = direction === "sweep" ? "USDC" : "USYC";
  if (amountIn > (balances[input] || 0))
    throw new Error("Treasury input exceeds available balance");
  return direction === "sweep"
    ? {
        ...balances,
        USDC: (balances.USDC || 0) - amountIn,
        USYC: (balances.USYC || 0) + amountIn / nav,
      }
    : {
        ...balances,
        USYC: (balances.USYC || 0) - amountIn,
        USDC: (balances.USDC || 0) + amountIn * nav,
      };
}

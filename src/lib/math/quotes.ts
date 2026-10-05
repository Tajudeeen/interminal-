import { PAIRS } from "../../constants/pairs";
import { TradeQuote, TradeSide } from "../../types/trade";

export const HEX_QTY_RE = /^0x([0-9a-fA-F]+)?$/;
export const SIDE_ALLOW = new Set<TradeSide>(["buy", "sell"]);

export function clamp(n: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, n));
}

export function formatUnits(hex: string | null | undefined, decimals: number): number {
  if (hex == null || hex === "0x") hex = "0x0";
  if (typeof hex !== "string" || !HEX_QTY_RE.test(hex) || hex.length > 66) return 0;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) return 0;
  try {
    const n = BigInt(hex);
    const base = 10n ** BigInt(decimals);
    const whole = n / base;
    const frac = n % base;
    const fracStr = frac.toString().padStart(decimals, "0").slice(0, 8);
    return Number(whole) + Number("0." + (fracStr.replace(/0+$/, "") || "0"));
  } catch {
    return 0;
  }
}

export function parseUnits(val: string | number | bigint | null | undefined, decimals = 18): bigint {
  if (val == null || !Number.isInteger(decimals) || decimals < 0 || decimals > 36) return 0n;
  let str = typeof val === "string" ? val.trim() : String(val);
  if (str.length > 128) return 0n;
  if (!str || str === "NaN" || str === "Infinity" || str === "-Infinity") return 0n;
  if (/[eE]/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) return 0n;
    str = num.toFixed(decimals);
  }
  if (!/^[0-9]+(\.[0-9]+)?$/.test(str)) return 0n;
  const [whole, frac = ""] = str.split(".");
  const paddedFrac = frac.slice(0, decimals).padEnd(decimals, "0");
  const wholeBig = BigInt(whole || "0");
  const fracBig = BigInt(paddedFrac || "0");
  return wholeBig * (10n ** BigInt(decimals)) + fracBig;
}

export function tokenPrice(sym: string, customPairs: Record<string, any> = {}): number {
  if (sym === "USDC") return 1;
  if (sym === "EURC") return PAIRS["EURC/USDC"]?.price ?? 1.0845;
  if (sym === "USYC") return PAIRS["USYC/USDC"]?.price ?? 1.0000;
  if (sym === "WETH" || sym === "ETH") return PAIRS["ETH/USDC"]?.price ?? 2481.42;
  if (sym === "cirBTC" || sym === "BTC") return PAIRS["BTC/USDC"]?.price ?? 64210;
  if (PAIRS[`${sym}/USDC`]) return PAIRS[`${sym}/USDC`].price;
  if (customPairs[`${sym}/USDC`]) return customPairs[`${sym}/USDC`].price || 0;
  const key = Object.keys(PAIRS).find((k) => PAIRS[k].base === sym);
  return key ? PAIRS[key].price : 0;
}

export interface QuoteTradeParams {
  side: TradeSide;
  amountUsd: number;
  price: number;
  slippageBps?: number;
}

export function quoteTrade({ side, amountUsd, price, slippageBps = 50 }: QuoteTradeParams): TradeQuote {
  if (!SIDE_ALLOW.has(side)) throw new Error("Invalid side");
  if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 1_000_000_000) throw new Error("Invalid amount");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price");
  if (!Number.isFinite(slippageBps) || slippageBps < 1 || slippageBps > 500) throw new Error("Invalid slippage");

  const slip = slippageBps / 10000;
  const impact = clamp(amountUsd / 2_500_000, 0.0004, 0.018);
  const effective = side === "buy" ? price * (1 + slip * 0.4 + impact) : price * (1 - slip * 0.4 - impact);
  const received = side === "buy" ? amountUsd / effective : amountUsd * (effective / price);
  const minReceived = received * (1 - slip);

  return {
    price,
    effective,
    received,
    minReceived,
    impact,
    slippageBps,
    rate: effective,
    gasUsd: 0.0012,
    expiresAt: Date.now() + 20_000,
  };
}

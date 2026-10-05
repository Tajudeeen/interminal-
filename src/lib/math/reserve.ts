import { parseUnits } from "./quotes";

/** App-level protection. The deployed contract does not enforce this reserve. */
export function assertCashReserve(liquidRaw: bigint, spendRaw: bigint, reserveUsd: number) {
  if (!Number.isFinite(reserveUsd) || reserveUsd < 0 || liquidRaw < 0n || spendRaw < 0n) {
    throw new Error("Invalid cash reserve or balance");
  }
  // Round the reserve up to USDC precision rather than silently weakening it.
  const reserveRaw = parseUnits((Math.ceil(reserveUsd * 1e6) / 1e6).toFixed(6), 6);
  if (spendRaw > liquidRaw || liquidRaw - spendRaw < reserveRaw) {
    throw new Error(`Cash reserve protected. Keep $${reserveUsd.toLocaleString()} USDC liquid or explicitly lower your reserve before reviewing.`);
  }
}

export function readWalletReserve(address: string | null, fallback: number): number {
  if (!address) return fallback;
  try {
    const raw = localStorage.getItem(`interminal_reserve_v1:5042:${address.toLowerCase()}`);
    if (raw == null) return fallback;
    const value = Number(raw);
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  } catch { return fallback; }
}
export function saveWalletReserve(address: string, reserve: number): boolean {
  try { localStorage.setItem(`interminal_reserve_v1:5042:${address.toLowerCase()}`, String(reserve)); return true; }
  catch { return false; }
}

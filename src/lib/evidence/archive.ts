import type { TradeReceipt } from "../../types/receipt";
import { verifyReceiptIntegrity } from "../crypto/eip712";
import { ARC } from "../../constants/arc";

export const ARCHIVE_KEY = "interminal_receipts_v1";
const LIMIT = 200;
const MAX_BYTES = 2_000_000;
type StorageLike = Pick<Storage, "getItem" | "setItem">;
const hash = /^0x[\da-f]{64}$/i;
export function parseReceipt(value: unknown): TradeReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected a receipt JSON object");
  const r = value as TradeReceipt;
  if (!verifyReceiptIntegrity(r) || typeof r.receiptId !== "string" || r.receiptId.length > 100 ||
      !["mainnet", "simulation"].includes(r.mode) || r.chainId !== ARC.chainId ||
      !/^0x[\da-f]{40}$/i.test(r.trader) || !["buy", "sell"].includes(r.side) ||
      !Number.isSafeInteger(r.blockNumber) || r.blockNumber < 0 ||
      !Number.isFinite(r.amountUsd) || r.amountUsd <= 0 ||
      !Number.isFinite(r.minReceived) || r.minReceived < 0 ||
      !Number.isFinite(r.actualReceived ?? 0) ||
      typeof r.timestamp !== "string" || !Number.isFinite(Date.parse(r.timestamp)) ||
      typeof r.pair !== "string" || typeof r.baseSymbol !== "string" || typeof r.quoteSymbol !== "string") {
    throw new Error("Invalid receipt schema or certificate digest");
  }
  if (r.mode === "mainnet" && (!hash.test(r.transactionHash || "") || !hash.test(r.executionReceiptHash || "") || r.blockNumber === 0)) {
    throw new Error("Mainnet receipts require transaction and settlement evidence");
  }
  return r;
}
export function parseReceiptFile(content: string): TradeReceipt {
  if (content.length > MAX_BYTES) throw new Error("Receipt exceeds 2 MB");
  return parseReceipt(JSON.parse(content));
}
export function readArchive(storage?: StorageLike): TradeReceipt[] {
  try {
    const raw = (storage ?? localStorage).getItem(ARCHIVE_KEY);
    if (!raw || raw.length > MAX_BYTES) return [];
    const saved = JSON.parse(raw);
    if (saved.version !== 1 || !Array.isArray(saved.receipts)) return [];
    return saved.receipts.slice(0, LIMIT).flatMap((r: unknown) => {
      try { return [parseReceipt(r)]; } catch { return []; }
    });
  } catch { return []; }
}
export function mergeReceipts(current: TradeReceipt[], incoming: TradeReceipt[]) {
  // Chain transaction identity prevents imported duplicates with rewritten IDs.
  const key = (r: TradeReceipt) => r.mode === "mainnet" ? `${r.chainId}:${r.transactionHash?.toLowerCase()}` : r.receiptId;
  return [...new Map([...current, ...incoming].map(r => [key(r), r])).values()].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp)).slice(0, LIMIT);
}
export function saveArchive(receipts: TradeReceipt[], storage?: StorageLike): boolean {
  try {
    const valid = receipts.flatMap(r => { try { return [parseReceipt(r)]; } catch { return []; } });
    const content = JSON.stringify({ version: 1, receipts: mergeReceipts(readArchive(storage), valid) });
    if (content.length > MAX_BYTES) return false;
    (storage ?? localStorage).setItem(ARCHIVE_KEY, content);
    return true;
  } catch { return false; }
}

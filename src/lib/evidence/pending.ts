const KEY = "interminal_pending_settlements_v1";
const valid = (value: unknown): value is string => typeof value === "string" && /^0x[\da-f]{64}$/i.test(value);
export function readPending(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(list) ? [...new Set(list.filter(valid))].slice(0, 50) : [];
  } catch { return []; }
}
export function writePending(hashes: string[]): boolean {
  try { localStorage.setItem(KEY, JSON.stringify(hashes.filter(valid))); return true; }
  catch { return false; }
}

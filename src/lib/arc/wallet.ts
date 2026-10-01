export function isAddress(val: any): boolean {
  return typeof val === "string" && /^0x[0-9a-fA-F]{40}$/.test(val);
}

export function normalizeAddress(val: any): string {
  if (!isAddress(val)) throw new Error("Invalid EVM address: " + val);
  return val.toLowerCase();
}

export function shortAddr(addr: string | null | undefined): string {
  if (!addr) return "—";
  if (addr.length < 12) return addr;
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

export function padAddr(addr: string): string {
  return addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function pad32(val: bigint | number | string): string {
  if (typeof val === "bigint" || typeof val === "number") {
    return BigInt(val).toString(16).padStart(64, "0");
  }
  return String(val || "").replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

export function getInjected(): any {
  if (typeof window === "undefined") return null;
  const eth = (window as any).ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length) {
    return eth.providers.find((p: any) => p.isMetaMask && !p.isBraveWallet) || eth.providers[0];
  }
  return eth;
}

export function providerName(eth: any): string {
  if (!eth) return "No wallet";
  if (eth.isRabby) return "Rabby";
  if (eth.isCoinbaseWallet) return "Coinbase Wallet";
  if (eth.isRainbow) return "Rainbow";
  if (eth.isOkxWallet || eth.isOKExWallet) return "OKX Wallet";
  if (eth.isMetaMask) return "MetaMask";
  return "Injected wallet";
}

export async function walletRpc(method: string, params: any[] = []): Promise<any> {
  const eth = getInjected();
  if (!eth) throw new Error("No EVM wallet found");
  return eth.request({ method, params });
}

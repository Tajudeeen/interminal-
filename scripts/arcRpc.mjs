import { ethers } from "ethers";

export const ARC_RPC = "https://rpc.mainnet.arc.io";
export async function arcRpc(method, params = []) {
  const response = await fetch(ARC_RPC, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Arc RPC HTTP ${response.status}`);
  const data = await response.json();
  if (data.error || data.result == null) throw new Error(data.error?.message || "Arc RPC returned no result");
  return data.result;
}

// Use Node's fetch transport so the verifier uses the same HTTP path as the app.
export class ArcReadProvider extends ethers.JsonRpcProvider {
  async _send(payload) {
    const response = await fetch(this._getConnection().url, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Arc RPC HTTP ${response.status}`);
    const result = await response.json();
    return Array.isArray(result) ? result : [result];
  }
}

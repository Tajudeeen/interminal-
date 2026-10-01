import { ARC, RPC_ALLOW, TOKEN_ALLOW, isTokenAllowed } from "../../constants/arc";
import { formatUnits } from "../math/quotes";
import { isAddress, normalizeAddress, padAddr, walletRpc } from "./wallet";

export async function publicRpc(method: string, params: any[] = [], retries = 2): Promise<any> {
  if (!RPC_ALLOW.has(method)) throw new Error("RPC method blocked");
  if (method === "eth_getBalance") {
    if (!isAddress(params[0])) throw new Error("Invalid balance address");
  }
  if (method === "eth_getCode") {
    if (!isAddress(params[0]) || (!TOKEN_ALLOW.has(params[0].toLowerCase()) && !isTokenAllowed(params[0]))) {
      throw new Error("eth_getCode target blocked");
    }
  }
  if (method === "eth_call") {
    const to = params[0]?.to;
    if (!isAddress(to) || (!TOKEN_ALLOW.has(to.toLowerCase()) && !isTokenAllowed(to))) {
      throw new Error("eth_call target blocked");
    }
    const data = params[0]?.data;
    const isErc20Balance = typeof data === "string" && data.startsWith("0x70a08231") && data.length === 74;
    const isErc20Meta =
      typeof data === "string" &&
      (data === "0x06fdde03" || // name()
        data === "0x95d89b41" || // symbol()
        data === "0x313ce567"); // decimals()
    const isSettlementQuery =
      typeof data === "string" &&
      ((data.startsWith("0x9815336b") && data.length === 74) || // isReceiptAnchored(bytes32)
        (data.startsWith("0x506ee1ef") && data.length === 74) || // traderNonces(address)
        (data.startsWith("0x3f40b75a") && data.length === 74) || // mandateNonces(address)
        (data.startsWith("0x5ac3de83") && data.length === 74) || // mandateCumulativeSpend(bytes32)
        (data.startsWith("0x3644e515") && data.length === 10)); // DOMAIN_SEPARATOR()

    if (!isErc20Balance && !isErc20Meta && !isSettlementQuery) {
      throw new Error("eth_call data blocked");
    }
  }

  let attempt = 0;
  while (true) {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 12000) : null;
    try {
      const res = await fetch(ARC.rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: Date.now() + attempt, method, params }),
        signal: ctrl?.signal,
      });
      if (!res.ok) {
        if (attempt < retries && (res.status === 429 || res.status >= 500)) {
          attempt++;
          await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
          continue;
        }
        throw new Error("RPC HTTP " + res.status);
      }
      const json = await res.json();
      if (json.error) throw new Error(json.error.message || "RPC error");
      return json.result;
    } catch (err: any) {
      if (
        attempt < retries &&
        (err?.name === "AbortError" ||
          String(err?.message || "").includes("fetch") ||
          String(err?.message || "").includes("network"))
      ) {
        attempt++;
        await new Promise((r) => setTimeout(r, 350 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export async function readChainId(): Promise<{ hex: string; id: number }> {
  const hex = await walletRpc("eth_chainId");
  return { hex: hex.toLowerCase(), id: parseInt(hex, 16) };
}

export async function ensureArcNetwork(): Promise<boolean> {
  const { id } = await readChainId();
  if (id === ARC.chainId) return true;
  try {
    await walletRpc("wallet_switchEthereumChain", [{ chainId: ARC.chainIdHex }]);
    return true;
  } catch (err: any) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code === 4902 || String(err?.message || "").includes("Unrecognized chain")) {
      await walletRpc("wallet_addEthereumChain", [
        {
          chainId: ARC.chainIdHex,
          chainName: "Arc",
          nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
          rpcUrls: [ARC.rpc],
          blockExplorerUrls: [ARC.explorer],
        },
      ]);
      await walletRpc("wallet_switchEthereumChain", [{ chainId: ARC.chainIdHex }]);
      return true;
    }
    throw err;
  }
}

export async function erc20Balance(token: { address: string; decimals: number }, owner: string): Promise<number> {
  const data = "0x70a08231" + padAddr(owner);
  try {
    const hex = await publicRpc("eth_call", [{ to: token.address, data }, "latest"]);
    return formatUnits(hex, token.decimals);
  } catch {
    return 0;
  }
}

export async function loadOnchainPortfolio(address: string): Promise<Record<string, number>> {
  const safe = normalizeAddress(address);
  const nativeHex = await publicRpc("eth_getBalance", [safe, "latest"]);
  const nativeUsdc = formatUnits(nativeHex, ARC.nativeDecimals);
  const erc20Usdc = await erc20Balance({ address: ARC.usdcErc20, decimals: 6 }, safe);

  const next: Record<string, number> = {
    USDC: erc20Usdc > 0 ? erc20Usdc : nativeUsdc,
    ETH: 0,
    WETH: 0,
    EURC: 0,
    USYC: 0,
    cirBTC: 0,
    ARC: 0,
    BTC: 0,
    SOL: 0,
    AVAX: 0,
    LINK: 0,
    SUI: 0,
    ARB: 0,
    OP: 0,
    NEAR: 0,
    AAVE: 0,
    UNI: 0,
  };
  await Promise.all(
    Object.entries(ARC.tokens).map(async ([sym, meta]) => {
      next[sym] = await erc20Balance(meta, safe);
    })
  );
  return next;
}

export async function verifyArcLive(): Promise<{
  chainId: number;
  chainOk: boolean;
  rows: Array<{ id: string; ok: boolean; detail: string; block?: number; empty?: boolean }>;
}> {
  const rows: Array<{ id: string; ok: boolean; detail: string; block?: number; empty?: boolean }> = [];
  const chainHex = await publicRpc("eth_chainId");
  const chainId = parseInt(chainHex, 16);
  rows.push({
    id: "chain",
    ok: chainId === ARC.chainId,
    detail: `eth_chainId -> ${chainHex} (${chainId}). Required ${ARC.chainId}.`,
  });

  const blockHex = await publicRpc("eth_blockNumber");
  const block = parseInt(blockHex, 16);
  rows.push({
    id: "head",
    ok: Number.isFinite(block) && block > 0,
    detail: `eth_blockNumber -> ${block.toLocaleString()}`,
    block,
  });

  const tokens: Array<[string, string]> = [
    ["USDC", ARC.usdcErc20],
    ...Object.entries(ARC.tokens).map(([sym, meta]) => [sym, meta.address] as [string, string]),
  ];

  for (const [sym, addr] of tokens) {
    const code = await publicRpc("eth_getCode", [addr, "latest"]);
    const hasCode = typeof code === "string" && code !== "0x" && code.length > 2;
    rows.push({
      id: "code-" + sym,
      ok: true,
      detail: hasCode
        ? `${sym} ${addr} has bytecode (${code.length} chars)`
        : `${sym} ${addr} returned empty code (precompile or EOA-shaped). Recorded, not invented.`,
      empty: !hasCode,
    });
  }

  return { chainId, chainOk: chainId === ARC.chainId, rows };
}

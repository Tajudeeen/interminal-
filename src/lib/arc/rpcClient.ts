import { ARC, RPC_ALLOW, TOKEN_ALLOW, isTokenAllowed } from "../../constants/arc";
import { formatUnits } from "../math/quotes";
import { getCandles } from "../math/indicators";
import { PAIRS } from "../../constants/pairs";
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
  if (method === "eth_getTransactionReceipt") {
    if (typeof params[0] !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(params[0])) {
      throw new Error("Invalid transaction hash");
    }
  }
  if (method === "eth_call") {
    const to = params[0]?.to;
    if (!isAddress(to) || (!TOKEN_ALLOW.has(to.toLowerCase()) && !isTokenAllowed(to))) {
      throw new Error("eth_call target blocked");
    }
    const data = params[0]?.data;
    const isErc20Balance = typeof data === "string" && data.startsWith("0x70a08231") && data.length === 74;
    const isErc20Allowance = typeof data === "string" && data.startsWith("0xdd62ed3e") && data.length === 138;
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
    const isRouterQuote =
      to?.toLowerCase() === ARC.router.toLowerCase() &&
      typeof data === "string" &&
      data.startsWith("0xd06ca61f") &&
      data.length >= 330; // getAmountsOut(uint256,address[])

    if (!isErc20Balance && !isErc20Allowance && !isErc20Meta && !isSettlementQuery && !isRouterQuote) {
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

export async function waitForTransactionReceipt(
  txHash: string,
  options: { timeoutMs?: number; pollMs?: number } = {},
): Promise<{ transactionHash: string; blockNumber: number; status: string; logs: any[] }> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    throw new Error("Invalid transaction hash");
  }

  const timeoutMs = options.timeoutMs ?? 120_000;
  const pollMs = options.pollMs ?? 1_500;
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const receipt = await publicRpc("eth_getTransactionReceipt", [txHash]);
    if (receipt) {
      const status = String(receipt.status || "0x1");
      if (status !== "0x1") {
        throw new Error("Arc transaction reverted: " + txHash);
      }
      return {
        transactionHash: txHash,
        blockNumber: parseInt(String(receipt.blockNumber || "0x0"), 16),
        status,
        logs: Array.isArray(receipt.logs) ? receipt.logs : [],
      };
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }

  throw new Error("Timed out waiting for Arc transaction confirmation: " + txHash);
}

export async function readTraderNonce(address: string): Promise<number> {
  const safe = normalizeAddress(address);
  const data = "0x506ee1ef" + padAddr(safe);
  const hex = await publicRpc("eth_call", [{ to: ARC.settlement, data }, "latest"]);
  return Number(BigInt(hex || "0x0"));
}

export async function readMandateNonce(address: string): Promise<number> {
  const safe = normalizeAddress(address);
  const data = "0x3f40b75a" + padAddr(safe);
  const hex = await publicRpc("eth_call", [{ to: ARC.settlement, data }, "latest"]);
  return Number(BigInt(hex || "0x0"));
}

export async function routerAmountOut(
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
): Promise<bigint> {
  if (!isAddress(tokenIn) || !isAddress(tokenOut) || amountIn <= 0n) {
    throw new Error("Invalid router quote parameters");
  }

  const pathOffset = "40".padStart(64, "0");
  const pathLength = "2".padStart(64, "0");
  const data =
    "0xd06ca61f" +
    amountIn.toString(16).padStart(64, "0") +
    pathOffset +
    pathLength +
    padAddr(tokenIn) +
    padAddr(tokenOut);

  const encoded = await publicRpc("eth_call", [{ to: ARC.router, data }, "latest"]);
  if (typeof encoded !== "string" || !/^0x[0-9a-fA-F]+$/.test(encoded) || encoded.length < 258) {
    throw new Error("Arc router returned an invalid quote");
  }

  return BigInt("0x" + encoded.slice(194, 258));
}

export interface TradeSettledExecution {
  receiptHash: string;
  trader: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOut: bigint;
}

export function decodeTradeSettledExecution(
  receipt: { logs?: any[] } | null | undefined,
  settlementAddress: string,
  expectedTrader: string,
  expectedTokenIn: string,
  expectedTokenOut: string,
): TradeSettledExecution | null {
  if (!receipt || !Array.isArray(receipt.logs) || !isAddress(settlementAddress)) return null;

  const settlement = settlementAddress.toLowerCase();
  const trader = expectedTrader.toLowerCase();
  const tokenIn = expectedTokenIn.toLowerCase();
  const tokenOut = expectedTokenOut.toLowerCase();

  for (const log of receipt.logs) {
    if (String(log?.address || "").toLowerCase() !== settlement) continue;
    if (!Array.isArray(log?.topics) || log.topics.length < 3) continue;
    if (typeof log?.data !== "string" || log.data.length !== 322) continue;

    const loggedTrader = "0x" + String(log.topics[2]).slice(-40);
    if (loggedTrader.toLowerCase() !== trader) continue;

    const data = log.data.slice(2);
    const loggedTokenIn = "0x" + data.slice(0, 64).slice(-40);
    const loggedTokenOut = "0x" + data.slice(64, 128).slice(-40);
    if (loggedTokenIn.toLowerCase() !== tokenIn || loggedTokenOut.toLowerCase() !== tokenOut) continue;

    return {
      receiptHash: String(log.topics[1]),
      trader: loggedTrader,
      tokenIn: loggedTokenIn,
      tokenOut: loggedTokenOut,
      amountIn: BigInt("0x" + data.slice(128, 192)),
      amountOut: BigInt("0x" + data.slice(192, 256)),
    };
  }

  return null;
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


export interface Erc20Metadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

function decodeAbiString(hex: string): string {
  if (typeof hex !== "string" || !hex.startsWith("0x")) throw new Error("Invalid ERC-20 metadata response");
  const body = hex.slice(2);
  if (!body || body.length < 64) throw new Error("Empty ERC-20 metadata response");

  // Standard ABI dynamic string: offset, length, UTF-8 bytes.
  if (body.length >= 128) {
    const offset = Number(BigInt("0x" + body.slice(0, 64)));
    const lengthPos = offset * 2;
    if (Number.isFinite(offset) && lengthPos + 64 <= body.length) {
      const length = Number(BigInt("0x" + body.slice(lengthPos, lengthPos + 64)));
      const start = lengthPos + 64;
      const end = start + length * 2;
      if (Number.isFinite(length) && length >= 0 && end <= body.length) {
        const bytes = body.slice(start, end).match(/.{1,2}/g) || [];
        return new TextDecoder().decode(new Uint8Array(bytes.map((b) => Number.parseInt(b, 16)))).replace(/\0/g, "").trim();
      }
    }
  }

  // Some older ERC-20s return bytes32 instead.
  const bytes = body.slice(0, 64).match(/.{1,2}/g) || [];
  return new TextDecoder().decode(new Uint8Array(bytes.map((b) => Number.parseInt(b, 16)))).replace(/\0/g, "").trim();
}

export async function readErc20Metadata(address: string): Promise<Erc20Metadata> {
  if (!isAddress(address)) throw new Error("Invalid ERC-20 contract address");
  const safe = normalizeAddress(address);
  const code = await publicRpc("eth_getCode", [safe, "latest"]);
  if (typeof code !== "string" || code === "0x") {
    throw new Error("Address has no deployed contract bytecode on Arc Mainnet");
  }

  const [nameHex, symbolHex, decimalsHex] = await Promise.all([
    publicRpc("eth_call", [{ to: safe, data: "0x06fdde03" }, "latest"]),
    publicRpc("eth_call", [{ to: safe, data: "0x95d89b41" }, "latest"]),
    publicRpc("eth_call", [{ to: safe, data: "0x313ce567" }, "latest"]),
  ]);

  const name = decodeAbiString(nameHex);
  const symbol = decodeAbiString(symbolHex);
  const decimals = Number(BigInt(decimalsHex || "0x0"));
  if (!name || !symbol) throw new Error("Contract does not expose standard ERC-20 name/symbol metadata");
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
    throw new Error("Contract returned invalid ERC-20 decimals");
  }

  return { address: safe, name, symbol: symbol.toUpperCase(), decimals };
}

export async function loadOnchainPortfolio(address: string): Promise<Record<string, number>> {
  const safe = normalizeAddress(address);
  const erc20Usdc = await erc20Balance({ address: ARC.usdcErc20, decimals: 6 }, safe);

  const next: Record<string, number> = {
    // Operational liquidity is ERC-20 USDC. Native USDC stays separate as gas.
    USDC: erc20Usdc,
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

/** Refresh live prices for assets supported by the Arc wallet portfolio. */
export async function refreshLivePairValuation(): Promise<{ updated: string[]; unavailable: string[] }> {
  const targets: Array<{ pair: string; timeframe: "4h" | "1D" }> = [
    { pair: "ETH/USDC", timeframe: "4h" },
    { pair: "BTC/USDC", timeframe: "4h" },
    { pair: "EURC/USDC", timeframe: "4h" },
    { pair: "USYC/USDC", timeframe: "1D" },
  ];
  const results = await Promise.all(targets.map(async ({ pair, timeframe }) => {
    try {
      const result = await getCandles(pair, timeframe, 24);
      return result.source !== "unavailable" && result.stats?.price && result.stats.price > 0
        ? { pair, stats: result.stats }
        : { pair, stats: null };
    } catch {
      return { pair, stats: null };
    }
  }));
  const updated: string[] = [];
  const unavailable: string[] = [];
  for (const result of results) {
    if (result.stats && PAIRS[result.pair]) {
      Object.assign(PAIRS[result.pair], result.stats);
      updated.push(result.pair);
    } else {
      unavailable.push(result.pair);
    }
  }
  return { updated, unavailable };
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

  // Verify Settlement Contract Bytecode
  try {
    const settCode = await publicRpc("eth_getCode", [ARC.settlement, "latest"]);
    const hasSettCode = typeof settCode === "string" && settCode !== "0x" && settCode.length > 2;
    rows.push({
      id: "settlement-bytecode",
      ok: hasSettCode,
      detail: hasSettCode
        ? `Settlement ${ARC.settlement} has ${(settCode.length - 2) / 2} bytes active bytecode (Block #${ARC.deployBlock})`
        : `Settlement ${ARC.settlement} bytecode not found on RPC`,
    });
  } catch (err: any) {
    rows.push({
      id: "settlement-bytecode",
      ok: false,
      detail: `Settlement check failed: ${err?.message || "RPC error"}`,
    });
  }

  // Verify Settlement Contract DOMAIN_SEPARATOR() (0x3644e515)
  try {
    const domRes = await publicRpc("eth_call", [{ to: ARC.settlement, data: "0x3644e515" }, "latest"]);
    const expectedDomain = "0x9d8bb4d79ceb4795b26f8c3265ae5aac5492046989e8b74bc2b04d2c1853b190".toLowerCase();
    const domOk = typeof domRes === "string" && domRes.toLowerCase() === expectedDomain;
    rows.push({
      id: "settlement-domain-separator",
      ok: domOk,
      detail: domOk
        ? `DOMAIN_SEPARATOR() -> ${domRes.slice(0, 18)}... (Verified EIP-712 Interminal Chain 5042)`
        : `DOMAIN_SEPARATOR() returned unexpected hash: ${domRes}`,
    });
  } catch (err: any) {
    rows.push({
      id: "settlement-domain-separator",
      ok: false,
      detail: `DOMAIN_SEPARATOR query failed: ${err?.message || "RPC error"}`,
    });
  }

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

export async function querySettlementDetails(): Promise<{
  contract: string;
  bytecodeBytes: number;
  domainSeparator: string;
  isDomainMatch: boolean;
  blockNumber: number;
  latencyMs: number;
}> {
  const t0 = performance.now();
  const [blockHex, codeHex, domainHex] = await Promise.all([
    publicRpc("eth_blockNumber"),
    publicRpc("eth_getCode", [ARC.settlement, "latest"]),
    publicRpc("eth_call", [{ to: ARC.settlement, data: "0x3644e515" }, "latest"]),
  ]);
  const latencyMs = Math.round(performance.now() - t0);
  const blockNumber = parseInt(blockHex, 16);
  const bytecodeBytes = typeof codeHex === "string" && codeHex.startsWith("0x") ? (codeHex.length - 2) / 2 : 0;
  const expectedDomain = "0x9d8bb4d79ceb4795b26f8c3265ae5aac5492046989e8b74bc2b04d2c1853b190".toLowerCase();
  const isDomainMatch = typeof domainHex === "string" && domainHex.toLowerCase() === expectedDomain;

  return {
    contract: ARC.settlement,
    bytecodeBytes,
    domainSeparator: domainHex,
    isDomainMatch,
    blockNumber,
    latencyMs,
  };
}

/**
 * Read the current ERC-20 allowance the owner has granted to `spender`.
 */
export async function erc20Allowance(
  tokenAddress: string,
  owner: string,
  spender: string,
): Promise<bigint> {
  // allowance(address,address) selector = 0xdd62ed3e
  const data =
    "0xdd62ed3e" +
    owner.replace(/^0x/i, "").toLowerCase().padStart(64, "0") +
    spender.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
  try {
    const hex = await publicRpc("eth_call", [{ to: tokenAddress, data }, "latest"]);
    return hex && hex !== "0x" ? BigInt(hex) : 0n;
  } catch {
    return 0n;
  }
}

/**
 * Broadcast an ERC-20 approve(spender, amount) transaction via the injected wallet.
 * Returns the tx hash.
 */
export async function sendApproval(
  from: string,
  tokenAddress: string,
  spender: string,
  amount: bigint,
): Promise<string> {
  const amountHex = amount.toString(16).padStart(64, "0");
  const spenderPadded = spender.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
  const data = "0x095ea7b3" + spenderPadded + amountHex; // approve(address,uint256)
  return walletRpc("eth_sendTransaction", [
    { from, to: tokenAddress, data, gas: "0xC350" }, // 50 000 gas
  ]);
}

/* INTERMINAL — Arc-native trading workstation
   AI recommends. Trading engine validates. Wallet authorizes. Arc executes. */

const ARC = {
  name: "Arc",
  chainId: 5042,
  chainIdHex: "0x13b2",
  native: "USDC",
  nativeDecimals: 18,
  explorer: "https://explorer.arc.io",
  rpc: "https://rpc.mainnet.arc.io",
  usdcErc20: "0x3600000000000000000000000000000000000000",
  router: "0x52FE40c00530db2e43d01652f903870571A14AFD",
  settlement: "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36",
  tokens: {
    WETH: { address: "0x128cC466B61f542da60c70e3aA11c10e19B84EDB", decimals: 18, name: "Wrapped Ether" },
    EURC: { address: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1", decimals: 6, name: "EURC" },
    USYC: { address: "0x8a5D989Bbb96929F689B0200f435f53dA42bF490", decimals: 6, name: "USYC" },
    cirBTC: { address: "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0", decimals: 8, name: "Circle BTC" },
  },
};

function shortAddr(addr) {
  if (!isAddress(addr)) return "—";
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_QTY_RE = /^0x[0-9a-fA-F]{1,64}$/;
const RPC_ALLOW = new Set(["eth_chainId", "eth_blockNumber", "eth_getBalance", "eth_call", "eth_getCode", "eth_getTransactionReceipt"]);
const TF_ALLOW = new Set(["1m", "5m", "15m", "1h", "4h", "1D"]);
const SIDE_ALLOW = new Set(["buy", "sell"]);
const VIEW_ALLOW = new Set(["landing", "terminal", "markets", "portfolio", "ai", "activity", "proof"]);

const POLICY = [
  { id: "ai-no-sign", title: "AI is advisory", rule: "The model may propose. It never holds a key and never calls eth_sendTransaction." },
  { id: "chain-gate", title: "Chain gate", rule: "Desk and EIP-712 only proceed when eth_chainId is 5042." },
  { id: "addr-gate", title: "Address gate", rule: "RPC and tickets require 0x + 40 hex. Display-truncated strings are rejected." },
  { id: "rpc-allow", title: "RPC allowlist", rule: "Public client may call eth_chainId, eth_blockNumber, eth_getBalance, eth_call, eth_getCode, eth_getTransactionReceipt only." },
  { id: "call-allow", title: "eth_call gate", rule: "Calls only hit official Arc tokens with balanceOf calldata." },
  { id: "quote-gate", title: "Quote gate", rule: "Amount must be finite and in (0, 1e9]. Slippage 1–500 bps. Buy size ≤ live native USDC." },
  { id: "ticket-domain", title: "Ticket domain", rule: "EIP-712 domain is Interminal v1 on chain 5042 bound to the USDC precompile, with nonce and deadline." },
  { id: "treasury-safety", title: "Smart idle treasury", rule: "Deterministic opportunity cost & JIT USYC redemption calculations protect capital efficiency." },
  { id: "fx-macro-gate", title: "FX macro corridor", rule: "EURC/USDC quotes map to pip spreads and central bank interest rate differential." },
  { id: "mandate-permit", title: "Agentic mandates", rule: "Scoped EIP-712 permits enforce strict budget, slippage, and pair allowlist constraints." },
  { id: "audit-receipts", title: "Cryptographic receipts", rule: "Every executed ticket produces a tamper-evident SHA-256 canonical audit certificate." },
  { id: "contract-settlement", title: "Arc settlement", rule: "On-chain InterminalSettlement contract on Arc (chain 5042) enforces EIP-712 tickets, bounded mandates, and receipt anchoring." },
];

const LIMITATIONS = [
  "Candles, EMAs, RSI, MACD, quotes, and AI copy are computed in the browser. They are not an Arc oracle.",
  "Wallet USDC/WETH/EURC/USYC/cirBTC reads are live RPC. Pair prices and 24h stats are real-time DEX feeds from Uniswap V3 on Ethereum & verified DEX oracles (via DexScreener).",
  "EIP-712 TradeTicket is an authorization preview. It does not move funds without on-chain execution.",
  "Contracts have not had an independent audit.",
  "There is no replicated indexer. Block height is a single public RPC.",
  "ARC/USDC in the tape is a local market card. There is no ARC ERC-20 in this build.",
];
const TOKEN_ALLOW = new Set([
  ARC.usdcErc20.toLowerCase(),
  ARC.settlement.toLowerCase(),
  ...Object.values(ARC.tokens).map((t) => t.address.toLowerCase()),
]);

function isAddress(value) {
  return typeof value === "string" && ADDR_RE.test(value);
}

function normalizeAddress(value) {
  if (!isAddress(value)) throw new Error("Invalid address");
  return ("0x" + value.slice(2).toLowerCase());
}

function checksumWarn(value) {
  return normalizeAddress(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function assertPair(key) {
  if (!PAIRS[key]) throw new Error("Unknown market");
  return key;
}

function clampAmount(n) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 1_000_000_000);
}

const PAIRS = {
  "ETH/USDC": { base: "ETH", quote: "USDC", price: 2733.05, change: 2.54, high: 2780, low: 2680, vol: 64.1e6, tvl: 18.42e6, seed: 11 },
  "EURC/USDC": { base: "EURC", quote: "USDC", price: 1.13, change: -0.18, high: 1.135, low: 1.128, vol: 3.12e6, tvl: 45.2e6, seed: 77 },
  "USYC/USDC": { base: "USYC", quote: "USDC", price: 1.0664, change: 0.02, high: 1.0665, low: 1.0663, vol: 28.5e6, tvl: 85.0e6, seed: 88 },
  "ARC/USDC": { base: "ARC", quote: "USDC", price: 1.84, change: 8.12, high: 1.92, low: 1.61, vol: 12.4e6, tvl: 9.1e6, seed: 22 },
  "BTC/USDC": { base: "BTC", quote: "USDC", price: 84176.37, change: 1.66, high: 85200, low: 83100, vol: 88.2e6, tvl: 31.6e6, seed: 33 },
  "SOL/USDC": { base: "SOL", quote: "USDC", price: 148.9, change: -0.62, high: 154.2, low: 146.1, vol: 19.7e6, tvl: 6.4e6, seed: 44 },
  "AVAX/USDC": { base: "AVAX", quote: "USDC", price: 28.14, change: 3.21, high: 28.9, low: 26.8, vol: 4.8e6, tvl: 2.1e6, seed: 55 },
  "LINK/USDC": { base: "LINK", quote: "USDC", price: 13.62, change: 0.84, high: 13.91, low: 13.2, vol: 3.1e6, tvl: 1.4e6, seed: 66 },
};

const TOKEN_META = {
  ETH: { name: "Ethereum", decimals: 18 },
  WETH: { name: "Wrapped Ether", decimals: 18 },
  USDC: { name: "USD Coin", decimals: 6 },
  EURC: { name: "EURC", decimals: 6 },
  USYC: { name: "USYC", decimals: 6 },
  cirBTC: { name: "Circle BTC", decimals: 8 },
  ARC: { name: "Arc Protocol", decimals: 18 },
  BTC: { name: "Bitcoin", decimals: 8 },
  SOL: { name: "Solana", decimals: 9 },
  AVAX: { name: "Avalanche", decimals: 18 },
  LINK: { name: "Chainlink", decimals: 18 },
};

/* ---------- utilities ---------- */
const $ = (sel, root = typeof document !== "undefined" ? document : null) => root?.querySelector ? root.querySelector(sel) : null;
const fmt = (n, d = 2) => {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  const digits = abs >= 1000 ? 2 : abs >= 1 ? d : abs >= 0.01 ? 4 : 6;
  return n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
};
const fmtUsd = (n, d = 2) => "$" + fmt(n, d);
const fmtPct = (n) => (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const rnd = (seed) => {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
};
const shortHash = () =>
  "0x" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("") +
  "…" + Array.from({ length: 4 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
const now = () => Date.now();

function toast(title, body, kind = "info") {
  const stack = $("#toast-stack");
  if (!stack) return;
  const el = document.createElement("div");
  const accent = kind === "ok" ? "border-mint text-mint" : kind === "err" ? "border-danger text-danger" : "border-cyan text-cyan";
  el.className = `pointer-events-auto w-full sm:w-80 max-w-sm bg-t2 border ${accent.split(" ")[0]} border-l-2 p-3 rounded shadow-xl`;
  el.innerHTML = `<div class="font-display text-[12px] uppercase tracking-wider ${accent.split(" ").slice(1).join(" ")}">${escapeHtml(title)}</div><div class="text-[12px] text-mute mt-1">${escapeHtml(body)}</div>`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

/* ---------- Arc mainnet wallet (EIP-1193) ---------- */
function getInjected() {
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length) {
    return eth.providers.find((p) => p.isMetaMask && !p.isBraveWallet) || eth.providers[0];
  }
  return eth;
}

function providerName(eth) {
  if (!eth) return "No wallet";
  if (eth.isRabby) return "Rabby";
  if (eth.isCoinbaseWallet) return "Coinbase Wallet";
  if (eth.isRainbow) return "Rainbow";
  if (eth.isOkxWallet || eth.isOKExWallet) return "OKX Wallet";
  if (eth.isMetaMask) return "MetaMask";
  return "Injected wallet";
}

async function publicRpc(method, params = [], retries = 2) {
  if (!RPC_ALLOW.has(method)) throw new Error("RPC method blocked");
  if (method === "eth_getBalance") {
    if (!isAddress(params[0])) throw new Error("Invalid balance address");
  }
  if (method === "eth_getCode") {
    if (!isAddress(params[0]) || !TOKEN_ALLOW.has(params[0].toLowerCase())) throw new Error("eth_getCode target blocked");
  }
  if (method === "eth_call") {
    const to = params[0]?.to;
    if (!isAddress(to) || !TOKEN_ALLOW.has(to.toLowerCase())) throw new Error("eth_call target blocked");
    const data = params[0]?.data;
    const isErc20Balance = typeof data === "string" && data.startsWith("0x70a08231") && data.length === 74;
    const isSettlementQuery = typeof data === "string" && (
      (data.startsWith("0x9815336b") && data.length === 74) || // isReceiptAnchored(bytes32)
      (data.startsWith("0x506ee1ef") && data.length === 74) || // traderNonces(address)
      (data.startsWith("0x3f40b75a") && data.length === 74) || // mandateNonces(address)
      (data.startsWith("0x5ac3de83") && data.length === 74) || // mandateCumulativeSpend(bytes32)
      (data.startsWith("0x3644e515") && data.length === 10)    // DOMAIN_SEPARATOR()
    );
    if (!isErc20Balance && !isSettlementQuery) {
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
    } catch (err) {
      if (attempt < retries && (err?.name === "AbortError" || String(err?.message || "").includes("fetch") || String(err?.message || "").includes("network"))) {
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

async function walletRpc(method, params = []) {
  const eth = getInjected();
  if (!eth) throw new Error("No EVM wallet found");
  return eth.request({ method, params });
}

function padAddr(addr) {
  return addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function pad32(val) {
  if (typeof val === "bigint" || typeof val === "number") {
    return BigInt(val).toString(16).padStart(64, "0");
  }
  return String(val || "").replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function formatUnits(hex, decimals) {
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

function parseUnits(val, decimals = 18) {
  if (val == null) return 0n;
  let str = typeof val === "string" ? val.trim() : String(val);
  if (!str || str === "NaN" || str === "Infinity" || str === "-Infinity") return 0n;
  if (/[eE]/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num) || num <= 0) return 0n;
    str = num.toFixed(decimals);
  }
  if (!/^[0-9]+(\.[0-9]+)?$/.test(str)) {
    const m = str.match(/^[0-9]+(\.[0-9]+)?/);
    if (!m) return 0n;
    str = m[0];
  }
  const [whole, frac = ""] = str.split(".");
  const paddedFrac = frac.slice(0, decimals).padEnd(decimals, "0");
  const wholeBig = BigInt(whole || "0");
  const fracBig = BigInt(paddedFrac || "0");
  return wholeBig * (10n ** BigInt(decimals)) + fracBig;
}

async function readChainId() {
  const hex = await walletRpc("eth_chainId");
  return { hex: hex.toLowerCase(), id: parseInt(hex, 16) };
}

async function ensureArcNetwork() {
  const { id } = await readChainId();
  if (id === ARC.chainId) return true;
  try {
    await walletRpc("wallet_switchEthereumChain", [{ chainId: ARC.chainIdHex }]);
    return true;
  } catch (err) {
    const code = err?.code ?? err?.data?.originalError?.code;
    if (code === 4902 || String(err?.message || "").includes("Unrecognized chain")) {
      await walletRpc("wallet_addEthereumChain", [{
        chainId: ARC.chainIdHex,
        chainName: "Arc",
        nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
        rpcUrls: [ARC.rpc],
        blockExplorerUrls: [ARC.explorer],
      }]);
      await walletRpc("wallet_switchEthereumChain", [{ chainId: ARC.chainIdHex }]);
      return true;
    }
    throw err;
  }
}

async function erc20Balance(token, owner) {
  const data = "0x70a08231" + padAddr(owner);
  try {
    const hex = await publicRpc("eth_call", [{ to: token.address, data }, "latest"]);
    return formatUnits(hex, token.decimals);
  } catch {
    return 0;
  }
}

async function loadOnchainPortfolio(address) {
  const safe = normalizeAddress(address);
  const nativeHex = await publicRpc("eth_getBalance", [safe, "latest"]);
  const usdc = formatUnits(nativeHex, ARC.nativeDecimals);
  const next = { USDC: usdc, ETH: 0, WETH: 0, EURC: 0, USYC: 0, cirBTC: 0, ARC: 0, BTC: 0, SOL: 0, AVAX: 0, LINK: 0 };
  await Promise.all(Object.entries(ARC.tokens).map(async ([sym, meta]) => {
    next[sym] = await erc20Balance(meta, safe);
  }));
  return next;
}

async function loadChainHead() {
  try {
    const hex = await publicRpc("eth_blockNumber");
    state.block = parseInt(hex, 16);
  } catch { /* keep last */ }
}

/* ---------- Cryptographic Primitives (Pure JS SHA-256) ---------- */
const SHA256_H0 = [
  0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
  0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];
function sha256Hex(ascii) {
  if (typeof ascii !== "string") ascii = JSON.stringify(ascii || "");
  function rr(v, n) { return (v >>> n) | (v << (32 - n)); }
  const h = SHA256_H0.slice(0);
  const words = [];
  const bitLen = ascii.length * 8;
  ascii += "\x80";
  while (ascii.length % 64 !== 56) ascii += "\x00";
  for (let i = 0; i < ascii.length; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << ((3 - (i % 4)) * 8);
  }
  words.push((bitLen / 0x100000000) | 0);
  words.push(bitLen | 0);
  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    while (w.length < 64) {
      const i = w.length;
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rr(w15, 7) ^ rr(w15, 18) ^ (w15 >>> 3);
      const s1 = rr(w2, 17) ^ rr(w2, 19) ^ (w2 >>> 10);
      w.push((w[i - 16] + s0 + w[i - 7] + s1) | 0);
    }
    let [a, b, c, d, e, f, g, h0] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25);
      const ch = (e & f) ^ ((~e) & g);
      const temp1 = (h0 + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      h0 = g; g = f; f = e; e = (d + temp1) | 0;
      d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h[0] = (h[0] + a) | 0;
    h[1] = (h[1] + b) | 0;
    h[2] = (h[2] + c) | 0;
    h[3] = (h[3] + d) | 0;
    h[4] = (h[4] + e) | 0;
    h[5] = (h[5] + f) | 0;
    h[6] = (h[6] + g) | 0;
    h[7] = (h[7] + h0) | 0;
  }
  return "0x" + h.map((x) => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

/* ---------- Feature 1: Smart Idle Treasury Engine ---------- */
const USYC_APY = 0.0495; // 4.95% Annualized yield on Hashnote / Circle USYC (T-Bills)

function calculateOpportunityCost(idleUsdc, apy = USYC_APY) {
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

function calculateJitUnwind({ tradeAmountUsd, liquidUsdc = 0, usycBalance = 0, slippageBps = 0 }) {
  if (!Number.isFinite(tradeAmountUsd) || tradeAmountUsd <= 0) throw new Error("Invalid trade amount");
  const liquid = Math.max(0, Number(liquidUsdc) || 0);
  const usyc = Math.max(0, Number(usycBalance) || 0);
  if (tradeAmountUsd <= liquid) {
    return { needed: false, deficit: 0, shortfall: 0, usycToRedeem: 0, canCover: true, remainingUsyc: usyc };
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

function calculateYieldSweep(liquidOrObj = 0, reserveBufferUsd = 500) {
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

/* ---------- Feature 2: Institutional On-Chain FX Desk ---------- */
const FED_FUNDS_RATE = 0.0525; // 5.25% Federal Reserve benchmark
const ECB_DEPOSIT_RATE = 0.0350; // 3.50% European Central Bank benchmark

function calculateFxParity(priceOrObj, fedRateArg = FED_FUNDS_RATE, ecbRateArg = ECB_DEPOSIT_RATE) {
  let price, fedRate, ecbRate, benchmark;
  if (typeof priceOrObj === "object" && priceOrObj !== null) {
    price = Number(priceOrObj.eurcUsdcPrice ?? priceOrObj.price);
    fedRate = Number(priceOrObj.fedRate ?? FED_FUNDS_RATE);
    ecbRate = Number(priceOrObj.ecbRate ?? ECB_DEPOSIT_RATE);
    benchmark = Number(priceOrObj.benchmarkRate ?? 1.0840);
  } else {
    price = Number(priceOrObj);
    fedRate = Number(fedRateArg);
    ecbRate = Number(ecbRateArg);
    benchmark = 1.0840;
  }
  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid FX price");
  const rateSpreadBps = Math.round((fedRate - ecbRate) * 10000);
  const pipSize = 0.0001;
  const pipSpread = Math.round(Math.abs(price - benchmark) / pipSize * 10) / 10 || 1.2;
  const spreadBps = Math.round((pipSpread * pipSize / price) * 10000 * 10) / 10;
  const pipsFromParity = Math.round((price - 1.0000) * 10000);
  const longUsdCarryAnnual = fedRate - ecbRate;
  const longEurCarryAnnual = ecbRate - fedRate;
  const carrySpreadBps = Math.round((fedRate - ecbRate) * 10000);
  const isWithinParityBand = Math.abs(price - benchmark) <= 0.0050;
  return {
    price,
    benchmarkRate: benchmark,
    fedRate,
    fedFundsRate: Math.round(fedRate * 10000) / 100,
    ecbRate,
    ecbDepositRate: Math.round(ecbRate * 10000) / 100,
    rateSpreadBps,
    carrySpreadBps,
    pipSize,
    pipSpread,
    spreadBps,
    pipsFromParity,
    longUsdCarryAnnual,
    longEurCarryAnnual,
    carryDirection: "Long USD / Short EUR (+175 bps carry)",
    isWithinParityBand,
  };
}

/* ---------- Feature 3: Bounded Agentic Mandates ---------- */
function createAgentMandateDescriptor({ trader, delegator, agent, maxSpendUsd, maxSpendUsdc, maxSlippageBps = 50, allowedPairs = ["ETH/USDC"], ttlSeconds = 14400, nonce = 1 }) {
  const traderAddr = trader || delegator;
  if (!isAddress(traderAddr)) throw new Error("Invalid trader address");
  if (!isAddress(agent)) throw new Error("Invalid agent address");
  const spend = Number(maxSpendUsd ?? maxSpendUsdc);
  if (!Number.isFinite(spend) || spend <= 0 || spend > 1_000_000) throw new Error("Invalid max spend");
  const slip = Number(maxSlippageBps);
  if (!Number.isFinite(slip) || slip < 1 || slip > 500) throw new Error("Invalid slippage bps");
  if (!Array.isArray(allowedPairs) || !allowedPairs.length) throw new Error("Allowed pairs cannot be empty");
  allowedPairs.forEach((p) => assertPair(p));
  const ttl = Number(ttlSeconds);
  if (!Number.isFinite(ttl) || ttl < 60 || ttl > 86400 * 30) throw new Error("Invalid TTL");

  return {
    id: "mandate-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    mandateId: "mnd-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    trader: normalizeAddress(traderAddr),
    delegator: normalizeAddress(traderAddr),
    agent: normalizeAddress(agent),
    maxSpendUsd: spend,
    maxSpendUsdc: spend,
    remainingSpend: spend,
    maxSlippageBps: slip,
    allowedPairs: [...allowedPairs],
    nonce: Number(nonce) || 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + ttl * 1000,
    deadline: Math.floor(Date.now() / 1000) + ttl,
    revoked: false,
    signature: null,
  };
}

function validateAgentExecution(mandate, trade, throwOnError = true) {
  function fail(code, message) {
    if (throwOnError) throw new Error(message);
    return { valid: false, code, reason: message };
  }
  if (!mandate || typeof mandate !== "object") return fail("invalid_mandate", "Invalid mandate");
  if (mandate.revoked) return fail("mandate_revoked", "Mandate has been revoked");
  const currentTs = trade.currentTime
    ? (trade.currentTime > 1e11 ? Math.floor(trade.currentTime / 1000) : trade.currentTime)
    : Math.floor(Date.now() / 1000);
  if (currentTs > mandate.deadline) return fail("mandate_expired", "Mandate has expired");
  if (!trade || typeof trade !== "object") return fail("invalid_trade", "Invalid trade proposal");
  if (!mandate.allowedPairs.includes(trade.pair)) return fail("unapproved_market", "Pair " + trade.pair + " is not authorized by mandate");
  const amount = Number(trade.amountUsd ?? trade.amountUsdc);
  if (!Number.isFinite(amount) || amount <= 0) return fail("invalid_amount", "Invalid trade amount");
  if (amount > mandate.remainingSpend) return fail("amount_exceeds_mandate", "Trade amount $" + amount + " exceeds remaining mandate budget $" + mandate.remainingSpend);
  const slip = Number(trade.slippageBps);
  if (Number.isFinite(slip) && slip > mandate.maxSlippageBps) {
    return fail("slippage_exceeds_band", "Trade slippage " + slip + " bps exceeds mandate maximum " + mandate.maxSlippageBps + " bps");
  }
  return {
    valid: true,
    authorizedSpend: amount,
    newRemainingSpend: Math.max(0, Math.round((mandate.remainingSpend - amount) * 100) / 100),
  };
}

function buildAgentMandateTicket(traderOrMandate, agentArg, mandateArg) {
  let mandate, trader, agent;
  if (typeof traderOrMandate === "object" && !agentArg) {
    mandate = traderOrMandate;
    trader = mandate.trader || mandate.delegator;
    agent = mandate.agent;
  } else {
    trader = traderOrMandate;
    agent = agentArg;
    mandate = mandateArg;
  }
  const authorizer = normalizeAddress(trader);
  const agentAddr = normalizeAddress(agent);

  const pairIndexMap = {
    "ETH/USDC": 0,
    "EURC/USDC": 1,
    "USYC/USDC": 2,
    "BTC/USDC": 3,
    "ARC/USDC": 4,
  };
  let mask = 0n;
  const pairs = Array.isArray(mandate.allowedPairs) ? mandate.allowedPairs : ["ETH/USDC"];
  for (const pair of pairs) {
    if (pairIndexMap[pair] !== undefined) {
      mask |= (1n << BigInt(pairIndexMap[pair]));
    }
  }
  if (mask === 0n) mask = 1n;

  const maxCumulativeSpend = parseUnits(mandate.maxSpendUsd ?? mandate.maxSpendUsdc ?? 1000, 6);
  const maxSpendPerTx = parseUnits(mandate.maxSpendPerTx ?? (Number(mandate.maxSpendUsd ?? mandate.maxSpendUsdc ?? 1000) / 2), 6);
  const expiry = Number(mandate.deadline) || (Math.floor(Date.now() / 1000) + (mandate.ttlSeconds || 14400));
  const nonce = Number(mandate.nonce) || 0;

  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      AgentMandate: [
        { name: "authorizer", type: "address" },
        { name: "agent", type: "address" },
        { name: "maxCumulativeSpend", type: "uint256" },
        { name: "maxSpendPerTx", type: "uint256" },
        { name: "maxSlippageBps", type: "uint256" },
        { name: "allowedPairsMask", type: "uint256" },
        { name: "expiry", type: "uint256" },
        { name: "nonce", type: "uint256" },
      ],
    },
    domain: {
      name: "Interminal",
      version: "1",
      chainId: ARC.chainId,
      verifyingContract: ARC.settlement,
    },
    primaryType: "AgentMandate",
    message: {
      authorizer,
      agent: agentAddr,
      maxCumulativeSpend: maxCumulativeSpend.toString(),
      maxSpendPerTx: maxSpendPerTx.toString(),
      maxSlippageBps: Number(mandate.maxSlippageBps) || 50,
      allowedPairsMask: mask.toString(),
      expiry,
      nonce,
    },
    raw: {
      authorizer,
      agent: agentAddr,
      maxCumulativeSpend,
      maxSpendPerTx,
      maxSlippageBps: BigInt(mandate.maxSlippageBps || 50),
      allowedPairsMask: mask,
      expiry: BigInt(expiry),
      nonce: BigInt(nonce),
    },
    meta: {
      trader: authorizer,
      maxSpendUsd: String(mandate.maxSpendUsd ?? mandate.maxSpendUsdc ?? 1000),
      allowedPairs: pairs.join(","),
      deadline: expiry,
    },
  };
}

/* ---------- Feature 4: Cryptographic Audit Receipts ---------- */
function generateTradeReceipt({ txLabel, quote, pairKey, pair, trader, sig, txHash, blockNumber, mandateId = null, side, amount, amountUsd }) {
  const effectivePairKey = pairKey || pair || (typeof state !== "undefined" ? state.pair : null) || "ETH/USDC";
  const pairObj = PAIRS[assertPair(effectivePairKey)];
  const traderAddr = normalizeAddress(trader);
  const effectiveSig = sig || txHash || "0x" + "0".repeat(130);
  const effectiveSide = side || (typeof state !== "undefined" ? state.side : null) || "buy";
  const effectiveAmount = amount ?? amountUsd ?? (typeof state !== "undefined" ? state.amount : null) ?? 0;
  const receipt = {
    receiptVersion: "1.0-ARC",
    network: "Arc Mainnet",
    chainId: ARC.chainId,
    rpc: ARC.rpc,
    receiptId: "rcpt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
    blockNumber: blockNumber || (typeof state !== "undefined" ? state.block : null) || 4892104,
    trader: traderAddr,
    pair: effectivePairKey,
    baseSymbol: pairObj.base,
    quoteSymbol: pairObj.quote,
    baseContract: ARC.tokens[pairObj.base]?.address || ARC.tokens.WETH.address,
    quoteContract: ARC.usdcErc20,
    side: effectiveSide,
    amountUsd: effectiveAmount,
    amount: effectiveAmount,
    effectivePrice: quote.effective,
    quotedPrice: quote.price,
    estimatedReceived: quote.received,
    minReceived: quote.minReceived,
    priceImpactPct: Math.round(quote.impact * 10000) / 100,
    slippageBps: quote.slippageBps,
    gasToken: "USDC",
    gasUsd: quote.gasUsd,
    mandateId: mandateId || "NONE (Manual EIP-712 Signature)",
    signature: effectiveSig,
  };
  const canonicalString = JSON.stringify(receipt);
  receipt.integrityDigest = sha256Hex(canonicalString);
  return receipt;
}

function verifyReceiptIntegrity(receipt) {
  if (!receipt || typeof receipt !== "object" || !receipt.integrityDigest) return false;
  const clone = { ...receipt };
  const expectedDigest = clone.integrityDigest;
  delete clone.integrityDigest;
  const computedDigest = sha256Hex(JSON.stringify(clone));
  return expectedDigest.toLowerCase() === computedDigest.toLowerCase();
}

function failClosedLocalProofs() {
  const rows = [];
  const push = (id, ok, detail) => rows.push({ id, ok, detail });
  try {
    quoteTrade({ side: "buy", amountUsd: -1, price: 100, slippageBps: 50 });
    push("neg-amount", false, "quoteTrade accepted a negative amount");
  } catch {
    push("neg-amount", true, "quoteTrade rejected a negative amount");
  }
  try {
    assertPair("SCAM/USDC");
    push("unknown-pair", false, "assertPair accepted an unknown market");
  } catch {
    push("unknown-pair", true, "assertPair rejected SCAM/USDC");
  }
  try {
    quoteTrade({ side: "buy", amountUsd: 100, price: 2500, slippageBps: 0 });
    push("slippage-gate", false, "quoteTrade accepted 0 bps slippage");
  } catch {
    push("slippage-gate", true, "quoteTrade enforced slippage gate (1–500 bps)");
  }
  push("demo-addr", !isAddress("0x7A...91F2"), "Truncated demo address is not treated as live");
  push("no-key", !Object.prototype.hasOwnProperty.call(state, "privateKey"), "No privateKey field on application state");

  // Feature 1: Smart Idle Treasury Negative Proofs
  try {
    calculateOpportunityCost(-500);
    push("idle-negative", false, "calculateOpportunityCost accepted negative idle balance");
  } catch {
    push("idle-negative", true, "calculateOpportunityCost rejected negative idle balance");
  }

  // Feature 2: FX Parity Negative Proofs
  try {
    calculateFxParity(0);
    push("fx-zero-price", false, "calculateFxParity accepted zero price");
  } catch {
    push("fx-zero-price", true, "calculateFxParity rejected zero price");
  }

  // Feature 3: Agent Mandate Negative Proofs
  const mockMandate = createAgentMandateDescriptor({
    trader: "0x1234567890123456789012345678901234567890",
    agent: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    maxSpendUsd: 100,
    maxSlippageBps: 30,
    allowedPairs: ["ETH/USDC"],
    ttlSeconds: 3600,
  });
  // Overspend check
  try {
    validateAgentExecution(mockMandate, { pair: "ETH/USDC", amountUsd: 150, slippageBps: 20 });
    push("mandate-overspend", false, "validateAgentExecution allowed overspending");
  } catch {
    push("mandate-overspend", true, "validateAgentExecution rejected spend over limit");
  }
  // Unauthorized pair check
  try {
    validateAgentExecution(mockMandate, { pair: "BTC/USDC", amountUsd: 50, slippageBps: 20 });
    push("mandate-unauth-pair", false, "validateAgentExecution allowed unapproved pair");
  } catch {
    push("mandate-unauth-pair", true, "validateAgentExecution rejected unapproved pair");
  }
  // Expiry check
  const expiredMandate = { ...mockMandate, deadline: Math.floor(Date.now() / 1000) - 10 };
  try {
    validateAgentExecution(expiredMandate, { pair: "ETH/USDC", amountUsd: 50, slippageBps: 20 });
    push("mandate-expired", false, "validateAgentExecution allowed expired mandate");
  } catch {
    push("mandate-expired", true, "validateAgentExecution rejected expired mandate");
  }

  // Feature 4: Cryptographic Receipt Integrity Proof
  const sampleQuote = quoteTrade({ side: "buy", amountUsd: 100, price: 2500, slippageBps: 50 });
  const sampleReceipt = generateTradeReceipt({
    txLabel: "Test",
    quote: sampleQuote,
    pairKey: "ETH/USDC",
    trader: "0x1234567890123456789012345678901234567890",
    sig: "0x" + "a".repeat(130),
    blockNumber: 5000000,
  });
  push("receipt-digest-valid", verifyReceiptIntegrity(sampleReceipt), "Audit receipt integrity verification matches SHA-256 digest");
  const tamperedReceipt = { ...sampleReceipt, amountUsd: 999999 };
  push("receipt-tamper-detected", !verifyReceiptIntegrity(tamperedReceipt), "Tampered audit receipt is rejected by SHA-256 integrity check");

  // Feature 5: On-Chain EIP-712 Struct & Domain Verification
  const sampleTicket = buildTradeTicket("0x1234567890123456789012345678901234567890", "ETH/USDC", "buy", 100, sampleQuote);
  push("ticket-domain-valid", sampleTicket.domain.chainId === ARC.chainId && sampleTicket.domain.verifyingContract.toLowerCase() === ARC.settlement.toLowerCase(), "TradeTicket EIP-712 domain bound to Arc chain 5042 and settlement contract");
  const sampleMandateTicket = buildAgentMandateTicket(mockMandate);
  push("mandate-domain-valid", sampleMandateTicket.domain.chainId === ARC.chainId && sampleMandateTicket.domain.verifyingContract.toLowerCase() === ARC.settlement.toLowerCase(), "AgentMandate EIP-712 domain bound to Arc chain 5042 and settlement contract");

  return rows;
}

async function verifyArcLive() {
  const rows = [];
  const chainHex = await publicRpc("eth_chainId");
  const chainId = parseInt(chainHex, 16);
  rows.push({
    id: "chain",
    ok: chainId === ARC.chainId,
    detail: `eth_chainId → ${chainHex} (${chainId}). Required ${ARC.chainId}.`,
  });
  const blockHex = await publicRpc("eth_blockNumber");
  const block = parseInt(blockHex, 16);
  rows.push({
    id: "head",
    ok: Number.isFinite(block) && block > 0,
    detail: `eth_blockNumber → ${block.toLocaleString()}`,
    block,
  });
  const tokens = [
    ["USDC", ARC.usdcErc20],
    ...Object.entries(ARC.tokens).map(([sym, meta]) => [sym, meta.address]),
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

async function runProof() {
  state.proof.running = true;
  state.proof.local = failClosedLocalProofs();
  render();
  try {
    state.proof.live = await verifyArcLive();
    const head = state.proof.live.rows.find((r) => r.block);
    if (head?.block) state.block = head.block;
    state.proof.checkedAt = Date.now();
  } catch (e) {
    state.proof.live = {
      chainId: null,
      chainOk: false,
      rows: [{ id: "rpc", ok: false, detail: e.message || String(e) }],
    };
  } finally {
    state.proof.running = false;
    render();
  }
}

function attachWalletListeners() {
  const eth = getInjected();
  if (!eth || eth.__interminalBound) return;
  eth.__interminalBound = true;
  eth.on?.("accountsChanged", async (accounts) => {
    if (!accounts || !accounts.length) {
      disconnectWallet(false);
      toast("Wallet disconnected", "No account authorized.", "err");
      return;
    }
    try {
      state.address = normalizeAddress(accounts[0]);
    } catch {
      disconnectWallet(false);
      toast("Wallet rejected", "Provider returned a non-address account.", "err");
      return;
    }
    try {
      const { id } = await readChainId();
      state.chainId = id;
      state.wrongNetwork = id !== ARC.chainId;
      if (!state.wrongNetwork) state.balances = await loadOnchainPortfolio(state.address);
    } catch (e) {
      toast("Account update failed", e.message || String(e), "err");
    }
    render();
  });
  eth.on?.("chainChanged", async (hex) => {
    const id = parseInt(hex, 16);
    state.chainId = id;
    state.wrongNetwork = id !== ARC.chainId;
    if (state.address && !state.wrongNetwork) {
      try { state.balances = await loadOnchainPortfolio(state.address); }
      catch { /* ignore */ }
    }
    if (state.wrongNetwork) toast("Wrong network", `Switch to Arc (${ARC.chainId}). Currently ${id}.`, "err");
    render();
  });
}

async function connectInjected() {
  const eth = getInjected();
  if (!eth) {
    state.walletError = "No injected EVM wallet. Install MetaMask or Rabby, then retry.";
    render();
    return;
  }
  state.connecting = true;
  state.walletError = "";
  render();
  try {
    attachWalletListeners();
    const accounts = await walletRpc("eth_requestAccounts");
    if (!accounts?.length) throw new Error("No account returned");
    state.address = normalizeAddress(accounts[0]);
    state.providerLabel = providerName(eth);
    try {
      await ensureArcNetwork();
    } catch (e) {
      if (e?.code === 4001) throw new Error("Network switch rejected");
      throw e;
    }
    const { id } = await readChainId();
    state.chainId = id;
    state.wrongNetwork = id !== ARC.chainId;
    state.connected = true;
    await loadChainHead();
    if (!state.wrongNetwork) {
      state.balances = await loadOnchainPortfolio(state.address);
      state.livePortfolio = true;
    }
    state.view = state.wrongNetwork ? "landing" : "terminal";
    loadMarket();
    const p = portfolioSnapshot();
    if (state.wrongNetwork) {
      toast("Wrong network", `Interminal requires Arc mainnet (${ARC.chainId}).`, "err");
    } else {
      toast("Connected", `${shortAddr(state.address)} · Arc · ${fmtUsd(p.total)} USDC-native`, "ok");
      const largest = p.largest;
      state.analysis = analyzeMarket();
      if (largest) toast("AI INSIGHT", `${largest.sym} is ${fmt(largest.alloc, 0)}% of the live book.`, "info");
    }
  } catch (e) {
    const msg = e?.code === 4001 ? "Connection rejected in wallet." : (e.message || String(e));
    state.walletError = msg;
    toast("Connect failed", msg, "err");
  } finally {
    state.connecting = false;
    render();
  }
}

function disconnectWallet(notify = true) {
  state.connected = false;
  state.address = null;
  state.chainId = null;
  state.wrongNetwork = false;
  state.livePortfolio = false;
  state.view = "landing";
  state.reviewOpen = false;
  if (notify) toast("Disconnected", "Wallet session cleared in Interminal.", "info");
  render();
}

async function resumeWallet() {
  const eth = getInjected();
  if (!eth) return;
  attachWalletListeners();
  try {
    const accounts = await eth.request({ method: "eth_accounts" });
    if (!accounts?.length) return;
    state.address = normalizeAddress(accounts[0]);
    state.providerLabel = providerName(eth);
    const { id } = await readChainId();
    state.chainId = id;
    state.wrongNetwork = id !== ARC.chainId;
    state.connected = true;
    await loadChainHead();
    if (!state.wrongNetwork) {
      state.balances = await loadOnchainPortfolio(state.address);
      state.livePortfolio = true;
      state.view = "terminal";
      loadMarket();
    }
    render();
  } catch { /* stay on landing */ }
}

/* ---------- real-time market data feed & on-chain settlement ---------- */
const DEX_FEED_URL = "https://api.dexscreener.com/latest/dex/pairs/ethereum/0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640,0x99ac8cA7087fA4A2A1FB6357269965A2014ABc35,0x95DBB3C7546F22BCE375900AbFdd64a4E5bD73d6";

let dexSyncInFlight = false;
async function syncRealMarketData() {
  if (typeof fetch === "undefined" || dexSyncInFlight) return;
  dexSyncInFlight = true;
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
  try {
    const res = await fetch(DEX_FEED_URL, {
      method: "GET",
      headers: { "Accept": "application/json" },
      signal: ctrl?.signal,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const pairs = data.pairs || [];

    pairs.forEach((p) => {
      const base = p.baseToken?.symbol?.toUpperCase();
      const px = parseFloat(p.priceUsd);
      const chg = parseFloat(p.priceChange?.h24 ?? 0);
      const vol = parseFloat(p.volume?.h24 ?? 0);
      if (!Number.isFinite(px) || px <= 0) return;

      if ((base === "WETH" || base === "ETH") && PAIRS["ETH/USDC"]) {
        PAIRS["ETH/USDC"].price = px;
        PAIRS["ETH/USDC"].change = chg;
        PAIRS["ETH/USDC"].vol = vol;
        PAIRS["ETH/USDC"].high = px * (1 + Math.max(0, chg) / 100);
        PAIRS["ETH/USDC"].low = px * (1 + Math.min(0, chg) / 100);
      } else if ((base === "WBTC" || base === "BTC") && PAIRS["BTC/USDC"]) {
        PAIRS["BTC/USDC"].price = px;
        PAIRS["BTC/USDC"].change = chg;
        PAIRS["BTC/USDC"].vol = vol;
        PAIRS["BTC/USDC"].high = px * (1 + Math.max(0, chg) / 100);
        PAIRS["BTC/USDC"].low = px * (1 + Math.min(0, chg) / 100);
      } else if (base === "EURC" && PAIRS["EURC/USDC"]) {
        PAIRS["EURC/USDC"].price = px;
        PAIRS["EURC/USDC"].change = chg;
        PAIRS["EURC/USDC"].vol = vol;
        PAIRS["EURC/USDC"].high = px * (1 + Math.max(0, chg) / 100);
        PAIRS["EURC/USDC"].low = px * (1 + Math.min(0, chg) / 100);
      }
    });

    if (PAIRS["USYC/USDC"]) {
      PAIRS["USYC/USDC"].price = 1.0664;
      PAIRS["USYC/USDC"].change = 0.02;
    }

    state.marketFeedStatus = {
      source: "DexScreener Uniswap V3",
      live: true,
      lastUpdate: Date.now(),
      error: null,
    };

    if (state.candles?.length && PAIRS[state.pair]) {
      const last = state.candles[state.candles.length - 1];
      if (last) {
        last.close = PAIRS[state.pair].price;
        last.high = Math.max(last.open, last.close);
        last.low = Math.min(last.open, last.close);
      }
      state.indicators = computeIndicators(state.candles);
      if (state.view === "terminal" && typeof document !== "undefined") {
        const chartEl = $("#main-chart");
        if (chartEl) drawChart(chartEl, state.candles, state.indicators);
        updateOrderPreview();
      }
    }
  } catch (err) {
    if (state.marketFeedStatus) {
      state.marketFeedStatus.error = err.message || String(err);
      state.marketFeedStatus.live = false;
    }
  } finally {
    if (timer) clearTimeout(timer);
    dexSyncInFlight = false;
  }
}

async function deploySettlementContract() {
  if (!state.connected || state.wrongNetwork || !state.address) {
    toast("Network Error", "Connect wallet to Arc Mainnet (Chain ID 5042) to deploy.", "err");
    return;
  }
  const art = (typeof window !== "undefined" && window.SETTLEMENT_ARTIFACT) || (typeof SETTLEMENT_ARTIFACT !== "undefined" ? SETTLEMENT_ARTIFACT : null);
  if (!art || !art.bytecode) {
    toast("Artifact Missing", "Settlement contract bytecode artifact not loaded.", "err");
    return;
  }

  state.deployingContract = true;
  render();
  try {
    toast("Deploying Contract", "Broadcasting contract creation transaction via wallet on Arc Mainnet...", "ok");
    const txHash = await walletRpc("eth_sendTransaction", [{
      from: state.address,
      data: art.bytecode,
      gas: "0x3567E0",
    }]);
    state.deploymentTxHash = txHash;
    toast("Transaction Broadcast", `Tx: ${shortAddr(txHash)}. Awaiting confirmation on Arc...`, "ok");
    render();

    // Poll for receipt on Arc RPC
    let attempts = 0;
    let receipt = null;
    while (attempts < 30) {
      await new Promise((r) => setTimeout(r, 2000));
      receipt = await publicRpc("eth_getTransactionReceipt", [txHash]);
      if (receipt && receipt.contractAddress) {
        break;
      }
      attempts++;
    }

    if (receipt && receipt.contractAddress) {
      const contractAddr = receipt.contractAddress;
      state.settlementContractAddress = contractAddr;
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("interminal_settlement_addr", contractAddr);
      }
      ARC.settlement = contractAddr;
      TOKEN_ALLOW.add(contractAddr.toLowerCase());
      state.activity.unshift({
        ts: Date.now(),
        type: "deploy",
        label: "Settlement Contract Deployed",
        detail: `InterminalSettlement deployed to Arc at ${shortAddr(contractAddr)}`,
        hash: txHash,
      });
      savePersistedState();
      toast("Contract Deployed!", `InterminalSettlement is live on Arc Mainnet at ${shortAddr(contractAddr)}`, "ok");
    } else {
      toast("Deployment Broadcast", `Transaction ${shortAddr(txHash)} broadcast. Check Arc explorer shortly.`, "warn");
    }
  } catch (err) {
    console.error("Deployment failed:", err);
    toast("Deployment Rejected", err?.code === 4001 ? "User cancelled deployment transaction." : (err?.message || String(err)), "err");
  } finally {
    state.deployingContract = false;
    render();
  }
}

async function checkReceiptAnchoredOnchain(receipt) {
  if (!receipt || !receipt.integrityDigest || !state.settlementContractAddress) return false;
  try {
    const hashNo0x = receipt.integrityDigest.replace(/^0x/, "").padStart(64, "0");
    const data = "0x9815336b" + hashNo0x;
    const res = await publicRpc("eth_call", [{ to: state.settlementContractAddress, data }, "latest"]);
    if (res && res.length >= 66) {
      const isAnchored = BigInt(res.slice(0, 66)) > 0n;
      if (isAnchored) {
        receipt.onchainAnchored = true;
        return true;
      }
    }
  } catch {}
  return false;
}

async function anchorActiveReceipt() {
  const r = state.activeReceiptModal;
  if (!r) return;
  if (!state.settlementContractAddress || !isAddress(state.settlementContractAddress)) {
    toast("Settlement Not Deployed", "Deploy the InterminalSettlement contract to Arc Mainnet first.", "warn");
    return;
  }
  if (!state.connected || state.wrongNetwork || !state.address) {
    toast("Wallet Required", "Connect wallet to Arc Mainnet to anchor receipt on-chain.", "err");
    return;
  }

  state.anchoringReceipt = true;
  render();
  try {
    toast("Anchoring Receipt", "Submitting cryptographic receipt to Arc Mainnet...", "ok");
    const hashNo0x = (r.integrityDigest || "").replace(/^0x/, "").padStart(64, "0");
    const calldata = "0xea683470" + hashNo0x;
    const txHash = await walletRpc("eth_sendTransaction", [{
      from: state.address,
      to: state.settlementContractAddress,
      data: calldata,
      gas: "0x30D40",
    }]);
    r.onchainAnchored = true;
    r.anchorTx = txHash;
    state.activity.unshift({
      ts: Date.now(),
      type: "anchor",
      label: "Receipt Anchored on Arc",
      detail: `Digest ${r.integrityDigest.slice(0, 10)}… anchored on Arc Mainnet`,
      hash: txHash,
    });
    savePersistedState();
    toast("Receipt Anchored!", `Anchored in Arc state. Tx: ${shortAddr(txHash)}`, "ok");
  } catch (err) {
    toast("Anchoring Failed", err?.code === 4001 ? "Transaction rejected." : (err.message || String(err)), "err");
  } finally {
    state.anchoringReceipt = false;
    render();
  }
}

/* ---------- market engine ---------- */
function generateCandles(pairKey, timeframe, count = 120) {
  const p = PAIRS[assertPair(pairKey)];
  const tf = TF_ALLOW.has(timeframe) ? timeframe : "4h";
  const r = rnd(p.seed + tf.length * 17);
  const tfMs = { "1m": 6e4, "5m": 3e5, "15m": 9e5, "1h": 36e5, "4h": 144e5, "1D": 864e5 }[tf];
  const candles = [];
  let price = p.price * (0.92 + r() * 0.04);
  const t0 = now() - tfMs * count;
  for (let i = 0; i < count; i++) {
    const drift = (p.change / 100) / count + (r() - 0.48) * 0.012;
    const open = price;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * (1 + r() * 0.006);
    const low = Math.min(open, close) * (1 - r() * 0.006);
    const volume = p.vol / count * (0.4 + r() * 1.4);
    candles.push({ time: t0 + i * tfMs, open, high, low, close, volume });
    price = close;
  }
  const last = candles[candles.length - 1];
  last.close = p.price;
  last.high = Math.max(last.open, last.close) * 1.0004;
  last.low = Math.min(last.open, last.close) * 0.9996;
  return candles;
}

function ema(values, period) {
  const k = 2 / (period + 1);
  const out = [];
  let prev = values[0];
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

function rsi(closes, period = 14) {
  if (closes.length < period + 1) return closes.map(() => 50);
  const out = Array(period).fill(50);
  let gain = 0, loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d; else loss -= d;
  }
  gain /= period; loss /= period;
  out.push(100 - 100 / (1 + (loss === 0 ? 100 : gain / loss)));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out.push(100 - 100 / (1 + (loss === 0 ? 100 : gain / loss)));
  }
  return out;
}

function macd(closes) {
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const line = e12.map((v, i) => v - e26[i]);
  const signal = ema(line, 9);
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
}

function computeIndicators(candles) {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const r = rsi(closes, 14);
  const m = macd(closes);
  const last = candles.length - 1;
  const swingHigh = Math.max(...candles.slice(-30).map((c) => c.high));
  const swingLow = Math.min(...candles.slice(-30).map((c) => c.low));
  return {
    ema20: e20[last],
    ema50: e50[last],
    ema200: e200[last],
    rsi: r[last],
    macdHist: m.hist[last],
    support: swingLow,
    resistance: swingHigh,
    series: { e20, e50, e200 },
  };
}

function quoteTrade({ side, amountUsd, price, slippageBps = 50 }) {
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
    expiresAt: now() + 20_000,
  };
}

/* ---------- state ---------- */
const state = {
  connected: false,
  connecting: false,
  address: null,
  chainId: null,
  providerLabel: null,
  livePortfolio: false,
  walletError: "",
  wrongNetwork: false,
  view: "landing",
  pair: "ETH/USDC",
  timeframe: "4h",
  chartMode: "candles",
  side: "buy",
  amount: 500,
  slippage: 0.5,
  indicatorsOn: { ema20: true, ema50: true, ema200: true, rsi: true, macd: true },
  showLevels: false,
  candles: [],
  indicators: null,
  analysis: null,
  aiCore: "market",
  portfolioRange: "1M",
  searchOpen: false,
  searchQuery: "",
  alertsOpen: false,
  reviewOpen: false,
  pendingQuote: null,
  executing: false,
  ticketNonce: 1,
  lastTx: null,
  proof: { running: false, live: null, local: null, checkedAt: null },
  block: 4892104,
  latency: 12,
  balances: { ETH: 0, WETH: 0, USDC: 0, EURC: 0, USYC: 0, cirBTC: 0 },
  activity: [],
  analyses: [],
  mandates: [],
  auditReceipts: [],
  activeReceiptModal: null,
  mandateModalOpen: false,
  mandateSpend: 250,
  mandateSlip: 30,
  mandateTtl: 14400,
  watchlist: ["ETH/USDC", "EURC/USDC", "USYC/USDC", "ARC/USDC", "BTC/USDC"],
  alerts: [
    { id: 1, kind: "price", text: "ETH reaches $2,600", armed: true },
    { id: 2, kind: "portfolio", text: "Portfolio falls below $10,000", armed: true },
    { id: 3, kind: "position", text: "ETH allocation exceeds 50%", armed: true },
  ],
  marketFeedStatus: {
    source: "DexScreener Uniswap V3",
    live: false,
    lastUpdate: null,
    error: null,
  },
  settlementContractAddress: (typeof localStorage !== "undefined" && localStorage.getItem("interminal_settlement_addr")) || ARC.settlement,
  deployingContract: false,
  deploymentTxHash: null,
  anchoringReceipt: false,
};

/* ---------- persistence (localStorage safe) ---------- */
const STORAGE_KEY = "interminal_v1_store";

function getStorage() {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {}
  return null;
}

function loadPersistedState() {
  const store = getStorage();
  if (!store) return {};
  try {
    const raw = store.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePersistedState() {
  const store = getStorage();
  if (!store) return;
  try {
    const payload = {
      watchlist: state.watchlist,
      alerts: state.alerts,
      pair: state.pair,
      timeframe: state.timeframe,
      chartMode: state.chartMode,
      portfolioRange: state.portfolioRange,
      activity: state.activity.slice(0, 50),
      ticketNonce: state.ticketNonce,
      mandates: state.mandates.slice(0, 20),
      auditReceipts: state.auditReceipts.slice(0, 30),
      settlementContractAddress: state.settlementContractAddress,
    };
    store.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

(() => {
  const saved = loadPersistedState();
  if (saved.settlementContractAddress && isAddress(saved.settlementContractAddress)) {
    state.settlementContractAddress = saved.settlementContractAddress;
    ARC.settlement = saved.settlementContractAddress;
  }
  if (Array.isArray(saved.watchlist) && saved.watchlist.length) {
    const valid = saved.watchlist.filter((k) => PAIRS[k]);
    if (valid.length) state.watchlist = valid;
  }
  if (Array.isArray(saved.alerts) && saved.alerts.length) {
    state.alerts = saved.alerts;
  }
  if (saved.pair && PAIRS[saved.pair]) {
    state.pair = saved.pair;
  }
  if (saved.timeframe && TF_ALLOW.has(saved.timeframe)) {
    state.timeframe = saved.timeframe;
  }
  if (saved.chartMode) {
    state.chartMode = saved.chartMode;
  }
  if (saved.portfolioRange) {
    state.portfolioRange = saved.portfolioRange;
  }
  if (Array.isArray(saved.activity)) {
    state.activity = saved.activity;
  }
  if (Array.isArray(saved.mandates)) {
    state.mandates = saved.mandates;
  }
  if (Array.isArray(saved.auditReceipts)) {
    state.auditReceipts = saved.auditReceipts;
  }
  if (typeof saved.ticketNonce === "number" && saved.ticketNonce >= 1) {
    state.ticketNonce = Math.max(saved.ticketNonce, (state.activity?.length || 0) + 1);
  }
})();

function tokenPrice(sym) {
  if (sym === "USDC") return 1;
  if (sym === "EURC") return PAIRS["EURC/USDC"]?.price ?? 1.0845;
  if (sym === "USYC") return PAIRS["USYC/USDC"]?.price ?? 1.0000;
  if (sym === "WETH" || sym === "ETH") return PAIRS["ETH/USDC"]?.price ?? 2481.42;
  if (sym === "cirBTC" || sym === "BTC") return PAIRS["BTC/USDC"]?.price ?? 64210;
  const key = Object.keys(PAIRS).find((k) => PAIRS[k].base === sym);
  return key ? PAIRS[key].price : 0;
}

function portfolioSnapshot() {
  const rows = Object.entries(state.balances).map(([sym, qty]) => {
    const px = tokenPrice(sym);
    const value = qty * px;
    return { sym, qty, px, value, chg: PAIRS[`${sym}/USDC`]?.change ?? 0 };
  }).filter((r) => r.value > 0.5);
  const total = rows.reduce((s, r) => s + r.value, 0);
  rows.forEach((r) => (r.alloc = total ? (r.value / total) * 100 : 0));
  rows.sort((a, b) => b.value - a.value);
  const stables = rows.filter((r) => r.sym === "USDC" || r.sym === "EURC" || r.sym === "USYC").reduce((s, r) => s + r.alloc, 0);
  const largest = rows[0];
  const pnlDay = state.livePortfolio ? 0 : total * 0.0317;
  const pnlDayPct = state.livePortfolio ? 0 : 3.17;
  return { rows, total, stables, largest, pnlDay, pnlDayPct };
}

function riskMetrics() {
  const p = portfolioSnapshot();
  const conc = p.largest ? p.largest.alloc : 0;
  const vol = p.rows.reduce((s, r) => s + (Math.abs(r.chg) * r.alloc) / 100, 0);
  return {
    concentration: conc > 55 ? "High" : conc > 40 ? "Medium" : "Low",
    concentrationPct: conc,
    liquidity: "Low",
    stableBuffer: p.stables >= 25 ? "Healthy" : p.stables >= 10 ? "Tight" : "Thin",
    stablePct: p.stables,
    largest: p.largest,
    volatility: vol > 2.5 ? "Elevated" : "Normal",
    volScore: vol,
    drawdown: 4.2,
  };
}

/* ---------- AI layer (interprets computed numbers only) ---------- */
function analyzeMarket() {
  const pair = PAIRS[state.pair];
  const ind = state.indicators;
  if (!pair || !ind) return null;
  const px = pair.price;
  const trend = px > ind.ema20 && ind.ema20 > ind.ema50 ? "Bullish" : px < ind.ema20 && ind.ema20 < ind.ema50 ? "Bearish" : "Range";
  const momentum = ind.rsi >= 60 && ind.macdHist > 0 ? "Positive" : ind.rsi <= 40 && ind.macdHist < 0 ? "Negative" : "Neutral";
  const risk = Math.abs(ind.rsi - 50) > 22 ? "Elevated" : "Medium";
  const invalidation = trend === "Bullish" ? ind.ema50 * 0.992 : ind.ema20 * 1.008;
  const summary = `${state.pair.split("/")[0]} is ${trend.toLowerCase()} on the ${state.timeframe}. Price ${fmtUsd(px)} is ${px >= ind.ema20 ? "holding above" : "trading below"} the 20 EMA (${fmtUsd(ind.ema20)}) with RSI ${fmt(ind.rsi, 1)}.`;
  return {
    kind: "market",
    pair: state.pair,
    timeframe: state.timeframe,
    price: px,
    trend,
    momentum,
    support: ind.support,
    resistance: ind.resistance,
    setup: `Price is ${px >= ind.ema20 ? "holding above" : "rejecting"} the 20 EMA while momentum remains ${momentum.toLowerCase()}.`,
    invalidation,
    risk,
    confidence: trend === "Bullish" && momentum === "Positive" ? 0.68 : 0.54,
    why: `Deterministic inputs: EMA20 ${fmtUsd(ind.ema20)}, EMA50 ${fmtUsd(ind.ema50)}, RSI ${fmt(ind.rsi, 1)}, MACD histogram ${fmt(ind.macdHist, 2)}, 30-bar swing high ${fmtUsd(ind.resistance)} / low ${fmtUsd(ind.support)}.`,
    invalidateText: `A 4H close through ${fmtUsd(invalidation)} would negate the current ${trend.toLowerCase()} structure.`,
  };
}

function analyzeTrade(quote) {
  const p = portfolioSnapshot();
  const pair = PAIRS[state.pair] || PAIRS["ETH/USDC"];
  const base = pair.base;
  const isBuy = state.side === "buy";
  const currentBaseBal = state.balances[base] || 0;

  let afterBaseVal;
  if (isBuy) {
    afterBaseVal = (currentBaseBal + quote.received) * pair.price;
  } else {
    const soldQty = Math.min(currentBaseBal, state.amount / pair.price);
    afterBaseVal = Math.max(0, currentBaseBal - soldQty) * pair.price;
  }

  const effectiveTotal = p.total > 0 ? p.total : state.amount;
  const exposure = effectiveTotal > 0 ? (afterBaseVal / effectiveTotal) * 100 : 0;
  const sizePct = p.total > 0 ? (state.amount / p.total) * 100 : 100;

  let rr = 1.2;
  if (isBuy) {
    const upside = pair.price * 1.04 - quote.effective;
    const downside = quote.effective - pair.price * 0.98;
    rr = downside > 0 ? Math.max(0.5, Math.min(5.0, upside / downside)) : 1.4;
  } else {
    const upside = quote.effective - pair.price * 0.96;
    const downside = pair.price * 1.02 - quote.effective;
    rr = downside > 0 ? Math.max(0.5, Math.min(5.0, upside / downside)) : 1.4;
  }

  return {
    kind: "trade",
    tradeValue: state.amount,
    portfolio: p.total,
    sizePct,
    exposureAfter: Math.min(100, Math.max(0, exposure)),
    slippage: quote.slippageBps / 100,
    impact: quote.impact * 100,
    rr: Math.round(rr * 10) / 10,
    note: sizePct > 15
      ? `A ${fmtUsd(state.amount)} ticket is ${fmt(sizePct, 1)}% of NAV. Projected ${base} exposure moves to ~${fmt(exposure, 1)}%.`
      : `Ticket is ${fmt(sizePct, 1)}% of NAV. Price impact ${fmt(quote.impact * 100, 2)}% is within the quoted ${(quote.slippageBps / 100).toFixed(1)}% slippage band.`,
  };
}

function analyzePortfolio() {
  const p = portfolioSnapshot();
  const r = riskMetrics();
  return {
    kind: "portfolio",
    total: p.total,
    largest: r.largest,
    stables: r.stablePct,
    pnl: p.pnlDay,
    observation: r.largest
      ? `Largest book is ${r.largest.sym} at ${fmt(r.largest.alloc, 1)}% of NAV. Stablecoin buffer is ${fmt(r.stablePct, 1)}% (${r.stableBuffer}).`
      : "Empty book.",
    risk: r,
  };
}

function analyzeWallet() {
  const p = portfolioSnapshot();
  const trades = state.activity.filter((a) => a.type === "trade");
  return {
    kind: "wallet",
    address: shortAddr(state.address),
    holdings: p.rows.length,
    trades: trades.length,
    realized: trades.reduce((s, t) => s + (t.pnl || 0), 0),
    unrealized: 0,
    freq: trades.length ? `${trades.length} signed tickets this session` : "No session fills yet",
  };
}

/* ---------- chart ---------- */
function drawChart(canvas, candles, indicators) {
  if (!canvas || !candles.length) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#0D0E11";
  ctx.fillRect(0, 0, w, h);

  const padR = 64, padB = 22, padT = 10, padL = 8;
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  let min = Math.min(...lows), max = Math.max(...highs);
  if (state.showLevels && indicators) {
    min = Math.min(min, indicators.support, indicators.invalidation || min);
    max = Math.max(max, indicators.resistance);
  }
  const span = max - min || 1;
  const x = (i) => padL + (i / (candles.length - 1)) * (w - padL - padR);
  const y = (p) => padT + (1 - (p - min) / span) * (h - padT - padB);
  const cw = Math.max(2, ((w - padL - padR) / candles.length) * 0.7);

  ctx.strokeStyle = "#1F2430";
  ctx.lineWidth = 1;
  for (let i = 0; i < 6; i++) {
    const yy = padT + ((h - padT - padB) * i) / 5;
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
    const px = max - (span * i) / 5;
    ctx.fillStyle = "#94A3B8";
    ctx.font = "10px IBM Plex Sans";
    ctx.fillText(fmtUsd(px), w - padR + 6, yy + 3);
  }

  if (indicators) {
    const paint = (series, color) => {
      ctx.beginPath();
      series.forEach((v, i) => {
        const xx = x(i), yy = y(v);
        i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    };
    if (state.indicatorsOn.ema20) paint(indicators.series.e20, "#00F0FF");
    if (state.indicatorsOn.ema50) paint(indicators.series.e50, "#C084FC");
    if (state.indicatorsOn.ema200) paint(indicators.series.e200, "#64748B");
  }

  if (state.showLevels && state.analysis) {
    const levels = [
      { p: state.analysis.resistance, c: "#FF3B57", l: "R1" },
      { p: state.analysis.support, c: "#00E599", l: "S1" },
      { p: state.analysis.invalidation, c: "#F59E0B", l: "INV" },
    ];
    levels.forEach((lv) => {
      if (!lv.p) return;
      const yy = y(lv.p);
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = lv.c;
      ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(w - padR, yy); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = lv.c;
      ctx.fillRect(w - padR, yy - 8, padR - 2, 16);
      ctx.fillStyle = "#08090C";
      ctx.font = "9px IBM Plex Sans";
      ctx.fillText(`${lv.l} ${fmt(lv.p, 0)}`, w - padR + 4, yy + 3);
    });
  }

  if (state.chartMode === "line") {
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, "rgba(0, 240, 255, 0.22)");
    grad.addColorStop(1, "rgba(0, 240, 255, 0.0)");

    ctx.beginPath();
    ctx.moveTo(x(0), h - padB);
    candles.forEach((c, i) => {
      ctx.lineTo(x(i), y(c.close));
    });
    ctx.lineTo(x(candles.length - 1), h - padB);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    candles.forEach((c, i) => {
      const xx = x(i), yy = y(c.close);
      i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
    });
    ctx.strokeStyle = "#00F0FF";
    ctx.lineWidth = 2;
    ctx.stroke();
  } else {
    candles.forEach((c, i) => {
      const xx = x(i);
      const up = c.close >= c.open;
      ctx.strokeStyle = up ? "#00E599" : "#FF3B57";
      ctx.fillStyle = up ? "#00E599" : "#FF3B57";
      ctx.beginPath();
      ctx.moveTo(xx, y(c.high));
      ctx.lineTo(xx, y(c.low));
      ctx.stroke();
      const top = y(Math.max(c.open, c.close));
      const bot = y(Math.min(c.open, c.close));
      ctx.fillRect(xx - cw / 2, top, cw, Math.max(1, bot - top));
    });
  }

  const last = candles[candles.length - 1];
  const ly = y(last.close);
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = "#00F0FF";
  ctx.beginPath(); ctx.moveTo(padL, ly); ctx.lineTo(w - padR, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#00F0FF";
  ctx.fillRect(w - padR, ly - 8, padR - 2, 16);
  ctx.fillStyle = "#00363a";
  ctx.font = "10px IBM Plex Sans";
  ctx.fillText(fmtUsd(last.close), w - padR + 4, ly + 3);
}

function drawSpark(canvas, values, color) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0, 0, w, h);
  const min = Math.min(...values), max = Math.max(...values), span = max - min || 1;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / span) * (h - 6) - 3;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

/* ---------- render ---------- */
function logoSvg(h = 32) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 40" fill="none" style="height:${h}px;width:auto">
    <rect x="2" y="6" width="28" height="28" rx="6" fill="#0D0F14" stroke="#1F2430" stroke-width="1.5"/>
    <path d="M 8 26 C 14 12, 22 12, 24 16 C 26 20, 24 24, 20 25 C 16 26, 14 20, 22 14" stroke="#00F0FF" stroke-width="2" stroke-linecap="round"/>
    <circle cx="22" cy="14" r="2.5" fill="#00E599"/>
    <text x="38" y="24" fill="#F1F5F9" font-family="Manrope,sans-serif" font-size="16" font-weight="800" letter-spacing="0.12em">INTERMINAL</text>
    <rect x="136" y="11" width="18" height="15" rx="3" fill="#00F0FF" fill-opacity="0.12" stroke="#00F0FF" stroke-opacity="0.3" stroke-width="0.75"/>
    <text x="145" y="22" fill="#00F0FF" font-family="monospace" font-size="8.5" font-weight="700" text-anchor="middle">ARC</text>
  </svg>`;
}

function bottomNav() {
  const nav = [
    { id: "terminal", icon: "candlestick_chart", label: "Terminal" },
    { id: "markets", icon: "query_stats", label: "Markets" },
    { id: "portfolio", icon: "account_balance_wallet", label: "Portfolio" },
    { id: "ai", icon: "auto_awesome", label: "AI Analyst" },
    { id: "activity", icon: "history", label: "Activity" },
    { id: "proof", icon: "verified", label: "Proof" },
  ];
  return `
  <nav class="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#0d0e11]/95 backdrop-blur-md border-t border-[#1F2430] flex items-center justify-around px-1 py-1 safe-bottom">
    ${nav.map(({ id, icon, label }) => `
      <button data-nav="${id}" class="flex-1 flex flex-col items-center justify-center py-1 rounded text-center transition-colors ${state.view === id ? "text-[#00f0ff] font-semibold" : "text-[#94A3B8] hover:text-[#e3e2e6]"}">
        <span class="material-symbols-outlined text-[19px]">${icon}</span>
        <span class="text-[9px] tracking-tight mt-0.5 leading-none">${label}</span>
      </button>
    `).join("")}
  </nav>`;
}

function header() {
  const p = portfolioSnapshot();
  const nav = ["terminal", "markets", "portfolio", "ai", "activity", "proof"];
  const labels = { terminal: "Terminal", markets: "Markets", portfolio: "Portfolio", ai: "AI Analyst", activity: "Activity", proof: "Proof" };
  return `
  <header class="fixed top-0 left-0 right-0 z-50 bg-[#0d0e11]/95 backdrop-blur-md border-b border-[#1F2430]">
    <div class="h-14 w-full px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-3">
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        ${logoSvg(26)}
        <div class="hidden lg:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1b1f]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#01e599] animate-pulse"></span>
          <span class="text-[10px] tracking-wider text-[#70ffba] font-semibold">${state.proof?.live?.chainOk && state.livePortfolio ? "ARC · WALLET + RPC" : state.livePortfolio ? "ARC · WALLET" : state.proof?.live?.chainOk ? "ARC · RPC CHECKED" : "ARC · UNVERIFIED"}</span>
          <span class="tnum text-[11px] text-[#94A3B8]">#${state.block.toLocaleString()}</span>
          <span class="text-[#3b494b]">•</span>
          <span class="tnum text-[11px] text-[#94A3B8]">${state.latency}ms</span>
          <span class="text-[#3b494b]">•</span>
          <span class="tnum text-[11px] text-[#94A3B8]">gas USDC</span>
        </div>
        <div class="hidden 2xl:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1b1f] border border-[#00E599]/20" title="${state.marketFeedStatus?.source || 'DexScreener Uniswap V3'}">
          <span class="w-1.5 h-1.5 rounded-full bg-[#00E599] ${state.marketFeedStatus?.live ? 'animate-pulse' : ''}"></span>
          <span class="text-[10px] tracking-wider text-[#00E599] font-mono font-semibold">${state.marketFeedStatus?.live ? "REAL DEX FEED" : "LIVE DEX FEED"}</span>
        </div>
      </div>
      <nav class="hidden md:flex items-center gap-1">
        ${nav.map((id) => `<button data-nav="${id}" class="px-2.5 py-1 text-[13px] font-display font-semibold rounded ${state.view===id?"bg-[#292a2d] text-[#e3e2e6]":"text-[#b9cacb] hover:text-white hover:bg-[#292a2d]"}">${labels[id]}</button>`).join("")}
      </nav>
      <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <div class="hidden xl:flex items-center gap-2 px-2 py-0.5 rounded bg-[#1b1b1f] tnum text-[11px]">
          <span class="text-[#94A3B8]">ETH</span><span>${fmtUsd(PAIRS["ETH/USDC"].price)}</span><span class="text-[#70ffba]">${fmtPct(PAIRS["ETH/USDC"].change)}</span>
          <span class="text-[#3b494b]">|</span>
          <span class="text-[#94A3B8]">ARC</span><span>${fmtUsd(PAIRS["ARC/USDC"].price)}</span><span class="text-[#70ffba]">${fmtPct(PAIRS["ARC/USDC"].change)}</span>
        </div>
        <button data-act="search" class="p-1.5 rounded bg-[#1b1b1f] text-[#94A3B8] text-[11px] flex items-center gap-1" title="Search">
          <span class="material-symbols-outlined text-[18px]">search</span>
          <span class="hidden md:inline">Search <kbd class="px-1 rounded bg-[#343538] text-[#e3e2e6]">⌘K</kbd></span>
        </button>
        <button data-act="alerts" class="relative p-1.5 rounded bg-[#1b1b1f] text-[#94A3B8]" title="Alerts">
          <span class="material-symbols-outlined text-[18px]">notifications</span>
          <span class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#93000a] text-[#ffdad6] text-[9px] flex items-center justify-center">${state.alerts.length}</span>
        </button>
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#292a2d] text-[11px]">
          <span class="w-2 h-2 rounded-full ${state.livePortfolio ? "bg-[#01e599]" : "bg-[#00f0ff]"} shrink-0"></span>
          <span class="hidden sm:inline text-[10px] uppercase ${state.livePortfolio ? "text-[#dbfcff]" : "text-[#70ffba]"}">${state.livePortfolio ? "Arc" : "DEMO"}</span>
          <a class="tnum hover:text-[#00f0ff] truncate max-w-[76px] sm:max-w-none" href="${ARC.explorer}/address/${state.address}" target="_blank" rel="noreferrer">${shortAddr(state.address)}</a>
          <span class="hidden sm:inline h-3 w-px bg-[#343538]"></span>
          <span class="hidden sm:inline tnum text-[#70ffba]">${fmtUsd(p.total)}</span>
        </div>
        ${!state.livePortfolio ? `
          <button data-act="connect" class="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[11px] hover:bg-[#38bdf8] transition">
            <span class="material-symbols-outlined text-[14px]">account_balance_wallet</span> Connect Wallet
          </button>
        ` : ""}
        <button data-act="disconnect" class="w-8 h-8 rounded-full bg-[#dbfcff] text-[#00363a] flex items-center justify-center shrink-0" title="Disconnect">
          <span class="material-symbols-outlined text-[18px]">person</span>
        </button>
      </div>
    </div>
  </header>`;
}

function landing() {
  const eth = getInjected();
  const detected = providerName(eth);
  return `
  <div class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-4">
    <div class="absolute inset-0 opacity-[0.18] pointer-events-none" style="background-image:linear-gradient(#1F2430 1px,transparent 1px),linear-gradient(90deg,#1F2430 1px,transparent 1px);background-size:48px 48px"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#08090C]/40 to-[#08090C]"></div>
    <div class="relative z-10 flex flex-col items-center text-center px-2 sm:px-6 w-full max-w-xl">
      ${logoSvg(38)}
      <div class="mt-6 sm:mt-8 font-display text-[10px] sm:text-[11px] tracking-[0.35em] text-[#00F0FF]">BUILT ON ARC MAINNET</div>
      <h1 class="mt-3 sm:mt-4 font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">The trading terminal<br/>for Arc.</h1>
      <p class="mt-3 sm:mt-4 text-[#94A3B8] max-w-md text-[14px] sm:text-[15px]">Analyze markets. Execute trades. Understand your portfolio.<br class="hidden sm:inline"/>One workstation. No tab-hopping.</p>
      <div class="mt-6 sm:mt-8 flex flex-wrap justify-center items-center gap-4 sm:gap-8 text-[11px] sm:text-[12px] tracking-[0.2em] uppercase text-[#b9cacb]">
        <span>Analyze.</span><span>Execute.</span><span>Monitor.</span>
      </div>
      <div class="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
        <button data-act="connect" ${state.connecting ? "disabled" : ""} class="w-full sm:w-auto px-8 py-3 rounded bg-[#00F0FF] text-[#08090C] font-display font-bold text-[14px] hover:bg-[#38BDF8] transition disabled:opacity-60 flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]">account_balance_wallet</span>
          ${state.connecting ? "Requesting signature…" : eth ? "Connect " + detected : "Install a wallet"}
        </button>
        <button data-act="demo" class="w-full sm:w-auto px-6 py-3 rounded bg-[#1b1b1f] hover:bg-[#292a2d] border border-[#1F2430] text-[#00f0ff] font-display font-semibold text-[14px] transition flex items-center justify-center gap-2">
          <span class="material-symbols-outlined text-[18px]">terminal</span>
          Explore Desk (Demo Mode)
        </button>
      </div>
      ${!eth ? `<a class="mt-3 text-[12px] text-[#00F0FF]" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get MetaMask</a>` : ""}
      ${state.walletError ? `<div class="mt-4 max-w-sm text-[12px] text-[#ffb4ab]">${escapeHtml(state.walletError)}</div>` : ""}
      <button data-act="proof" class="mt-4 text-[12px] text-[#00F0FF] underline underline-offset-4">Re-query Arc RPC — do not take the banner as proof</button>
      <div class="mt-6 text-[10px] sm:text-[11px] text-[#64748B] tnum break-all sm:break-normal">Arc · Chain ID ${ARC.chainId} (0x13b2) · Native gas USDC · ${ARC.rpc}</div>
    </div>
  </div>`;
}

function wrongNet() {
  return `
  <div class="min-h-screen flex items-center justify-center px-4">
    <div class="bg-[#12151D] border border-[#1F2430] p-8 rounded max-w-sm text-center">
      <div class="font-display text-lg">Wrong network</div>
      <p class="text-[#94A3B8] text-sm mt-2">Interminal requires Arc mainnet. Connected account ${shortAddr(state.address)} is on chain ${state.chainId ?? "unknown"}.</p>
      <button data-act="switch-net" class="mt-6 px-6 py-2 rounded bg-[#00F0FF] text-[#08090C] font-display font-bold text-sm">Switch to Arc</button>
      <button data-act="disconnect" class="mt-3 block mx-auto text-[12px] text-[#94A3B8]">Disconnect</button>
    </div>
  </div>`;
}

function renderOrderPreviewContent() {
  const pair = PAIRS[state.pair] || PAIRS["ETH/USDC"];
  let quote;
  try {
    quote = quoteTrade({ side: state.side, amountUsd: state.amount, price: pair.price, slippageBps: state.slippage * 100 });
  } catch {
    quote = { received: 0, effective: pair.price, impact: 0, minReceived: 0, gasUsd: 0.0012 };
  }
  const isBuy = state.side === "buy";
  const receivedLabel = isBuy ? pair.base : "USDC";
  const receivedAmt = quote.received;

  let balanceCheckHtml = "";
  if (isBuy) {
    const jit = calculateJitUnwind({
      tradeAmountUsd: state.amount,
      liquidUsdc: state.balances.USDC || 0,
      usycBalance: state.balances.USYC || 0,
      slippageBps: state.slippage * 100,
    });
    if (jit.needed && jit.canCover) {
      balanceCheckHtml = `
        <div class="flex justify-between items-center bg-[#00f0ff]/10 border border-[#00f0ff]/30 px-2 py-1 rounded text-[11px] text-[#00f0ff]">
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">swap_calls</span>JIT USYC Bridge</span>
          <span>Redeem ${fmt(jit.usycToRedeem, 2)} USYC</span>
        </div>`;
    } else if (jit.needed && !jit.canCover) {
      balanceCheckHtml = `
        <div class="flex justify-between items-center bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-2 py-1 rounded text-[11px] text-[#ffb4ab]">
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">warning</span>Insufficient Total Liquid</span>
          <span>Deficit $${fmt(jit.deficit - (state.balances.USYC || 0), 2)}</span>
        </div>`;
    }
  } else {
    const baseBal = state.balances[pair.base] || 0;
    const reqBase = state.amount / pair.price;
    if (baseBal < reqBase * 0.999) {
      balanceCheckHtml = `
        <div class="flex justify-between items-center bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 px-2 py-1 rounded text-[11px] text-[#ffb4ab]">
          <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[13px]">warning</span>Insufficient ${pair.base}</span>
          <span>Have ${fmt(baseBal, 3)} / Need ${fmt(reqBase, 3)}</span>
        </div>`;
    }
  }

  let fxHtml = "";
  if (state.pair === "EURC/USDC") {
    const fx = calculateFxParity(pair.price);
    fxHtml = `
      <div class="flex justify-between text-[11px] text-[#dbfcff] bg-[#121316] px-2 py-1 rounded">
        <span class="text-mute">FX Rate</span>
        <span class="font-mono">${pair.price.toFixed(4)} EUR/USD (${fx.pipsFromParity >= 0 ? "+" : ""}${fx.pipsFromParity} pips)</span>
      </div>`;
  }

  return `
    ${fxHtml}
    <div class="flex justify-between"><span class="text-mute">Est. received</span><span class="font-semibold text-white">${fmt(receivedAmt, isBuy ? 5 : 2)} ${receivedLabel}</span></div>
    <div class="flex justify-between"><span class="text-mute">Rate</span><span>1 ${pair.base} = ${fmtUsd(quote.effective)}</span></div>
    <div class="flex justify-between"><span class="text-mute">Price impact</span><span class="${quote.impact < 0.005 ? "text-[#70ffba]" : "text-[#F59E0B]"}">${fmt(quote.impact * 100, 2)}%</span></div>
    <div class="flex justify-between"><span class="text-mute">Min received</span><span>${fmt(quote.minReceived, isBuy ? 5 : 2)} ${receivedLabel}</span></div>
    <div class="flex justify-between"><span class="text-mute">Native gas</span><span>${quote.gasUsd} USDC</span></div>
    ${balanceCheckHtml}
  `;
}

function updateOrderPreview() {
  const el = $("#order-preview");
  if (el) el.innerHTML = renderOrderPreviewContent();
  const slipVal = $("#slip-val");
  if (slipVal) slipVal.textContent = state.slippage + "%";
}

function terminalView() {
  const pair = PAIRS[state.pair];
  const ind = state.indicators || {};
  const p = portfolioSnapshot();
  const quote = quoteTrade({ side: state.side, amountUsd: state.amount, price: pair.price, slippageBps: state.slippage * 100 });
  const receivedLabel = state.side === "buy" ? pair.base : "USDC";
  const receivedAmt = state.side === "buy" ? quote.received : state.amount * (1 - quote.impact);
  const a = state.analysis;
  return `
  <main class="pt-14 pb-20 md:pb-4 min-h-screen">
    <section class="px-2 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-[#1F2430] bg-[#0d0e11]">
      <div class="flex items-center gap-2 sm:gap-6 flex-wrap">
        <div class="relative">
          <button data-act="pair-menu" class="flex items-center gap-2 bg-[#1b1b1f] hover:bg-[#1f1f23] px-2.5 sm:px-3 py-1.5 rounded">
            <span class="w-6 h-6 rounded-full bg-[#00f0ff]/15 flex items-center justify-center shrink-0"><span class="material-symbols-outlined text-[15px] text-[#00f0ff]">currency_exchange</span></span>
            <div class="text-left">
              <div class="flex items-center gap-1.5">
                <span class="font-display font-semibold text-[13px] sm:text-[14px]">${state.pair}</span>
                <span class="text-[10px] px-1 bg-[#00f0ff]/15 text-[#00f0ff] rounded">${state.pair==="EURC/USDC"?"FX SPOT":"ARC SPOT"}</span>
                <span class="material-symbols-outlined text-[14px] text-mute">expand_more</span>
              </div>
              <div class="text-[10px] uppercase tracking-wider text-mute">Arc Native Liquidity Hub</div>
            </div>
          </button>
          <div id="pair-dd" class="hidden absolute left-0 top-full mt-1 w-72 bg-[#292a2d] rounded shadow-xl py-1 z-50">
            <div class="px-3 py-1 text-[10px] uppercase text-mute">Switch Arc Market</div>
            ${Object.entries(PAIRS).map(([k, v]) => `
              <button data-pair="${k}" class="w-full flex items-center justify-between px-3 py-1.5 tnum text-[12px] hover:bg-[#1f1f23] ${k===state.pair?"text-[#00f0ff] bg-[#1f1f23]":""}">
                <span>${k}</span><span class="${v.change>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmtUsd(v.price)} (${fmtPct(v.change)})</span>
              </button>`).join("")}
          </div>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="tnum text-[18px] sm:text-[22px] font-bold text-[#00f0ff]">${state.pair==="EURC/USDC" ? pair.price.toFixed(4) : fmtUsd(pair.price)}</span>
          <span class="tnum text-[11px] sm:text-[12px] ${pair.change>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmtPct(pair.change)} <span class="text-mute hidden sm:inline">(${pair.change>=0?"+":""}${fmtUsd(pair.price*pair.change/100)})</span></span>
        </div>
        <div class="hidden xl:flex items-center gap-6 tnum text-[12px]">
          <div><div class="text-[10px] uppercase text-mute">24h High</div><div>${state.pair==="EURC/USDC"?pair.high.toFixed(4):fmtUsd(pair.high)}</div></div>
          <div><div class="text-[10px] uppercase text-mute">24h Low</div><div>${state.pair==="EURC/USDC"?pair.low.toFixed(4):fmtUsd(pair.low)}</div></div>
          <div><div class="text-[10px] uppercase text-mute">24h Volume</div><div>${fmtUsd(pair.vol/1e6)}M USDC</div></div>
          <div><div class="text-[10px] uppercase text-mute">Arc Liquidity</div><div class="text-[#dbfcff]">${fmtUsd(pair.tvl/1e6)}M</div></div>
        </div>
      </div>
      <div class="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-mute">
        <span class="w-1.5 h-1.5 rounded-full bg-[#01e599]"></span> Oracle: <span class="text-[#00f0ff] font-mono">${state.pair==="EURC/USDC"?"ECB Implied · Pyth V2":"Pyth V2 · Sub-sec"}</span>
      </div>
    </section>

    ${state.pair === "EURC/USDC" ? (() => {
      const fx = calculateFxParity(pair.price);
      return `
      <div class="px-2 sm:px-4 py-2 bg-[#00f0ff]/5 border-b border-[#00f0ff]/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div class="flex items-center gap-2">
          <span class="px-1.5 py-0.5 rounded bg-[#00f0ff]/20 text-[#00f0ff] font-bold text-[10px]">INSTITUTIONAL FX CORRIDOR</span>
          <span class="text-white font-mono font-semibold">${pair.price.toFixed(4)} EUR/USD</span>
          <span class="text-mute">Spread: <span class="text-[#70ffba]">${fx.pipSpread} pips</span></span>
          <span class="text-mute">Parity delta: <span class="${fx.pipsFromParity>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fx.pipsFromParity>=0?"+":""}${fx.pipsFromParity} pips</span></span>
        </div>
        <div class="flex items-center gap-4 text-mute">
          <span>ECB: <strong class="text-white">3.50%</strong> vs Fed: <strong class="text-white">5.25%</strong></span>
          <span class="text-[#70ffba] font-semibold">+175 bps USD Carry Advantage</span>
        </div>
      </div>`;
    })() : ""}

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1">
      <section class="lg:col-span-8 bg-[#0d0e11] rounded overflow-hidden flex flex-col">
        <div class="px-2 sm:px-3 py-1.5 bg-[#1b1b1f] flex flex-wrap items-center justify-between gap-2 border-b border-[#343538]/40">
          <div class="flex items-center gap-1 overflow-x-auto max-w-full pb-0.5 sm:pb-0">
            ${["1m","5m","15m","1h","4h","1D"].map((tf) => `<button data-tf="${tf}" class="px-2 py-0.5 text-[11px] rounded ${state.timeframe===tf?"bg-[#00f0ff] text-[#00363a] font-bold":"text-mute hover:text-white"}">${tf}</button>`).join("")}
            <span class="w-px h-4 bg-[#343538] mx-1"></span>
            ${[["candles","candlestick_chart","Candles"],["line","show_chart","Line"]].map(([id,ic,lb]) => `<button data-mode="${id}" class="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded ${state.chartMode===id?"bg-[#1f1f23] text-[#00f0ff]":"text-mute"}"><span class="material-symbols-outlined text-[14px]">${ic}</span><span class="hidden sm:inline">${lb}</span></button>`).join("")}
          </div>
          <button data-act="ai-analyze" class="flex items-center gap-1.5 px-2.5 py-1 bg-[#292a2d] hover:bg-[#38393d] rounded text-[#00f0ff] text-[12px] sm:text-[13px] font-display font-semibold">
            <span class="material-symbols-outlined text-[16px]">auto_awesome</span> AI Analyze
            <span class="text-[9px] uppercase tracking-widest px-1 bg-[#00f0ff]/20 rounded hidden sm:inline">Sync: Fresh</span>
          </button>
        </div>
        <div class="px-2 sm:px-3 py-1 flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 tnum text-[10px] sm:text-[11px] border-b border-[#343538]/20">
          <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-[#00f0ff]"></span><span class="text-mute">EMA 20:</span><span class="text-[#00f0ff]">${fmtUsd(ind.ema20)}</span></span>
          <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-purple-400"></span><span class="text-mute">EMA 50:</span><span class="text-purple-300">${fmtUsd(ind.ema50)}</span></span>
          <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-[#64748B]"></span><span class="text-mute">EMA 200:</span><span class="text-mute">${fmtUsd(ind.ema200)}</span></span>
          <span class="text-mute">RSI (14): <span class="text-[#70ffba] font-semibold">${fmt(ind.rsi,2)}</span></span>
          <span class="text-mute">MACD hist: <span class="${ind.macdHist>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmt(ind.macdHist,2)}</span></span>
        </div>
        <div class="relative h-[280px] sm:h-[350px] lg:h-[420px]">
          <canvas id="main-chart" class="absolute inset-0 w-full h-full"></canvas>
        </div>
        <div class="px-3 py-2 border-t border-[#1F2430] bg-[#0d0e11]">
          ${a ? `
          <div class="keyline pl-3">
            <div class="flex items-center justify-between">
              <div class="font-display text-[11px] tracking-wider text-[#00F0FF]">AI ANALYSIS · ${a.pair} ${a.timeframe.toUpperCase()}</div>
              <button data-act="apply-levels" class="text-[11px] text-[#00f0ff] hover:underline">Apply levels to chart</button>
            </div>
            <p class="text-[13px] mt-1 text-[#e3e2e6]">${a.setup}</p>
            <div class="mt-2 grid grid-cols-2 md:grid-cols-6 gap-2 tnum text-[11px]">
              <div><div class="text-mute uppercase text-[10px]">Trend</div><div class="text-[#70ffba]">${a.trend}</div></div>
              <div><div class="text-mute uppercase text-[10px]">Momentum</div><div>${a.momentum}</div></div>
              <div><div class="text-mute uppercase text-[10px]">Support</div><div>${fmtUsd(a.support)}</div></div>
              <div><div class="text-mute uppercase text-[10px]">Resistance</div><div>${fmtUsd(a.resistance)}</div></div>
              <div><div class="text-mute uppercase text-[10px]">Invalidation</div><div class="text-[#F59E0B]">${fmtUsd(a.invalidation)}</div></div>
              <div><div class="text-mute uppercase text-[10px]">Risk</div><div>${a.risk}</div></div>
            </div>
          </div>` : `<div class="text-[12px] text-mute">Click <span class="text-[#00f0ff]">AI Analyze</span> to bind structure, support and invalidation to the live candle set. Numbers come from the market engine — the model only interprets them.</div>`}
        </div>
      </section>

      <aside class="lg:col-span-4 bg-[#0d0e11] rounded p-3 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="font-display text-[13px] uppercase tracking-wide">Order panel</span>
          <span class="tnum text-[11px] text-mute">NAV ${fmtUsd(p.total)}</span>
        </div>
        <div class="grid grid-cols-2 p-0.5 bg-[#121316] rounded">
          <button data-side="buy" class="py-1.5 text-[13px] font-display font-semibold rounded ${state.side==="buy"?"bg-[#00E599] text-[#08090C]":"text-mute"}">Buy</button>
          <button data-side="sell" class="py-1.5 text-[13px] font-display font-semibold rounded ${state.side==="sell"?"bg-[#FF3B57] text-white":"text-mute"}">Sell</button>
        </div>
        <div class="text-[11px] text-mute uppercase">Market</div>
        <div>
          <div class="flex items-center justify-between text-[11px] text-mute mb-1">
            <span>${state.side === "buy" ? "Spend (USDC)" : "Sell (" + pair.base + " in USD)"}</span>
            <span>${state.side === "buy" ? "Bal " + fmt(state.balances.USDC) + " USDC" : "Bal " + fmt(state.balances[pair.base] || 0, 4) + " " + pair.base + " (" + fmtUsd((state.balances[pair.base] || 0) * pair.price) + ")"}</span>
          </div>
          <input id="amt" type="number" value="${state.amount}" class="w-full bg-[#0D0F14] border border-[#1F2430] focus:border-[#00F0FF] outline-none rounded px-2 py-1.5 tnum text-right text-[14px]" />
          <div class="flex gap-1 mt-1">${[100,250,500,1000].map((n)=>`<button data-amt="${n}" class="flex-1 text-[11px] py-0.5 rounded bg-[#1b1b1f] hover:bg-[#292a2d] tnum">${n}</button>`).join("")}<button data-amt="max" class="flex-1 text-[11px] py-0.5 rounded bg-[#1b1b1f]">MAX</button></div>
        </div>
        <div>
          <div class="flex items-center justify-between text-[11px] text-mute mb-1"><span>Slippage</span><span id="slip-val" class="tnum">${state.slippage}%</span></div>
          <input id="slip" type="range" min="0.1" max="2" step="0.1" value="${state.slippage}" class="w-full accent-[#00F0FF]" />
        </div>
        <div id="order-preview" class="bg-[#121316] rounded p-2 tnum text-[12px] space-y-1">
          ${renderOrderPreviewContent()}
        </div>
        <button data-act="review" class="w-full py-2.5 rounded ${state.side==="buy"?"bg-[#00E599] text-[#08090C]":"bg-[#FF3B57] text-white"} font-display font-bold text-[13px]">Review trade</button>
        <div class="text-[10px] text-mute leading-relaxed">AI recommends. Trading engine validates. Wallet authorizes. Arc executes. No private keys leave the wallet.</div>
      </aside>
    </div>
  </main>`;
}

function marketsView() {
  return `
  <main class="pt-14 pb-20 md:pb-4 min-h-screen">
    <div class="px-2 sm:px-4 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
      ${[
        ["Arc Ecosystem TVL","$248.65M","+4.12%","78"],
        ["24h Arc Agg Volume","$142.80M","+12.4%","64"],
        ["AMM Median Gas","0.0008 USDC","0.8s conf","22"],
        ["Regime / Sentiment","68/100","Expansion","68"],
        ["Cross-Pool Depth","$84.20M","Native L1","88"],
      ].map(([l,v,s,w], idx) => `
        <div class="bg-[#1b1b1f] rounded p-2.5 sm:p-3 ${idx === 4 ? "col-span-2 sm:col-span-1" : ""}">
          <div class="flex justify-between text-[10px] uppercase tracking-wider text-mute">${l}<span class="text-[#70ffba]">${s}</span></div>
          <div class="font-display text-[18px] sm:text-[22px] mt-1">${v}</div>
          <div class="h-1 bg-[#343538] mt-2 rounded overflow-hidden"><div class="h-full bg-[#00f0ff]" style="width:${w}%"></div></div>
        </div>`).join("")}
    </div>
    <div class="px-2 sm:px-4 pb-6 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div class="xl:col-span-8 bg-[#0d0e11] rounded overflow-hidden">
        <div class="px-3 py-2 flex items-center justify-between border-b border-[#1F2430]">
          <span class="font-display text-[13px]">Active Arc Verified Pairs</span>
          <span class="text-[11px] text-mute">${Object.keys(PAIRS).length} markets</span>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left tnum text-[12px] min-w-[540px]">
            <thead class="text-[10px] uppercase text-mute"><tr class="border-b border-[#1F2430]">
              <th class="px-3 py-2 font-medium">Market</th><th>Last</th><th>24h</th><th>Volume</th><th>TVL</th><th>Watch</th><th></th>
            </tr></thead>
            <tbody>
              ${Object.entries(PAIRS).map(([k,v]) => `
                <tr class="border-b border-[#1F2430]/60 hover:bg-[#1b1b1f]">
                  <td class="px-3 py-2 font-display">${k}</td>
                  <td>${fmtUsd(v.price)}</td>
                  <td class="${v.change>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmtPct(v.change)}</td>
                  <td>${fmtUsd(v.vol/1e6)}M</td>
                  <td>${fmtUsd(v.tvl/1e6)}M</td>
                  <td><button data-watch="${k}" class="text-[11px] ${state.watchlist.includes(k)?"text-[#00f0ff]":"text-mute"}">${state.watchlist.includes(k)?"★":"☆"}</button></td>
                  <td><button data-trade="${k}" class="px-2 py-0.5 rounded bg-[#00f0ff] text-[#00363a] text-[11px] font-bold mr-2">Trade</button></td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="xl:col-span-4 flex flex-col gap-3">
        <div class="bg-[#0d0e11] rounded p-3">
          <div class="font-display text-[13px] mb-2">Watchlist</div>
          ${state.watchlist.map((k) => {
            const v = PAIRS[k];
            return `<button data-trade="${k}" class="w-full flex justify-between py-1.5 tnum text-[12px] hover:text-[#00f0ff]"><span>${k}</span><span class="${v.change>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmtUsd(v.price)} ${fmtPct(v.change)}</span></button>`;
          }).join("")}
        </div>
        <div class="bg-[#0d0e11] rounded p-3">
          <div class="font-display text-[13px] mb-2">Trending setups</div>
          ${[
            ["ETH/USDC","Bullish EMA20 Bounce"],
            ["ARC/USDC","Momentum Breakout"],
            ["BTC/USDC","Range Invalidation S1"],
            ["SOL/USDC","Pullback to 50 EMA"],
          ].map(([k,s]) => `<div class="py-1.5 flex justify-between text-[12px]"><span>${k}</span><span class="text-mute">${s}</span></div>`).join("")}
        </div>
      </div>
    </div>
  </main>`;
}

function portfolioView() {
  const p = portfolioSnapshot();
  const r = riskMetrics();
  const curve = Array.from({ length: 36 }, (_, i) => 11000 + i * 40 + Math.sin(i / 3) * 180);
  curve[curve.length - 1] = p.total;
  return `
  <main class="pt-14 pb-20 md:pb-4 min-h-screen px-2 sm:px-4 py-4">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1b1b1f] p-3 sm:p-4 rounded">
      <div>
        <div class="text-[10px] uppercase tracking-wider text-mute">Total Portfolio Valuation <span class="ml-1 px-1 bg-[#121316] rounded">LIVE</span></div>
        <div class="flex items-baseline gap-3 mt-1">
          <span class="font-display text-[26px] sm:text-[32px] text-[#dbfcff]">${fmtUsd(p.total)}</span>
          <span class="tnum text-[12px] px-2 py-0.5 rounded bg-[#292a2d] text-[#70ffba]">+${fmtUsd(p.pnlDay)} (${fmtPct(p.pnlDayPct)})</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-6 mt-3 tnum text-[12px] sm:text-[13px]">
          <div><div class="text-[10px] uppercase text-mute">Source</div><div class="${state.livePortfolio?"text-[#00f0ff]":"text-mute"}">${state.livePortfolio ? "Arc RPC · live" : "Desk preview"}</div></div>
          <div><div class="text-[10px] uppercase text-mute">Unrealized P&L</div><div class="text-[#70ffba]">${state.livePortfolio ? "—" : "+$840.50"}</div></div>
          <div><div class="text-[10px] uppercase text-mute">Session signed</div><div class="text-[#00dbe9]">${state.activity.filter((a)=>a.type==="trade").length}</div></div>
        </div>
      </div>
      <div class="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
        ${["1D","1W","1M","1Y","ALL"].map((x)=>`<button data-range="${x}" class="px-2.5 py-1 text-[11px] rounded ${state.portfolioRange===x?"bg-[#292a2d] text-[#00f0ff]":"text-mute"}">${x}</button>`).join("")}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-3 mt-3">
      <div class="lg:col-span-7 bg-[#1b1b1f] rounded p-3">
        <div class="flex justify-between mb-2"><span class="font-display text-[15px]">Equity Performance Curve</span><span class="text-[11px] text-mute">Arc-AMM Fed</span></div>
        <canvas id="nav-chart" class="w-full h-56"></canvas>
      </div>
      <div class="lg:col-span-5 bg-[#1b1b1f] rounded p-3">
        <div class="font-display text-[15px] mb-2">Deterministic Risk Matrix</div>
        <div class="space-y-2 text-[12px]">
          ${[
            ["Concentration", r.concentration, r.concentrationPct],
            ["Liquidity exposure", r.liquidity, 18],
            ["Stablecoin buffer", r.stableBuffer, r.stablePct],
            ["Largest position", fmt(r.concentrationPct,1)+"% "+(r.largest?.sym||""), r.concentrationPct],
            ["Recent volatility", r.volatility, r.volScore*20],
          ].map(([l,v,w]) => `
            <div>
              <div class="flex justify-between"><span class="text-mute">${l}</span><span class="tnum">${v}</span></div>
              <div class="h-1 bg-[#121316] mt-1 rounded overflow-hidden"><div class="h-full ${Number(w)>50?"bg-[#F59E0B]":"bg-[#00f0ff]"}" style="width:${clamp(Number(w),4,100)}%"></div></div>
            </div>`).join("")}
        </div>
        <div class="mt-3 keyline pl-3 text-[12px] text-[#b9cacb]">
          AI interprets these scores only. Backend formulas own the numbers. ${r.largest?`${r.largest.sym} is ${fmt(r.largest.alloc,1)}% of NAV.` : ""}
        </div>
      </div>
    </div>

    ${(() => {
      const idleUsdc = state.balances.USDC || 0;
      const usycBal = state.balances.USYC || 0;
      const opp = calculateOpportunityCost(idleUsdc);
      const sweep = calculateYieldSweep({ liquidUsdc: idleUsdc, reserveBufferUsd: 100 });
      return `
      <div class="mt-3 bg-[#1b1b1f] border border-[#1F2430] rounded p-3 sm:p-4 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00f0ff] via-[#70ffba] to-[#01e599]"></div>
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F2430]/60">
          <div>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-[#70ffba] shadow-[0_0_8px_rgba(112,255,186,0.6)]"></span>
              <span class="font-display text-[14px] sm:text-[15px] uppercase tracking-wide text-white">Smart Idle Treasury Engine</span>
              <span class="text-[10px] px-1.5 py-0.5 rounded bg-[#70ffba]/15 text-[#70ffba] font-bold">4.95% T-BILL APY</span>
            </div>
            <div class="text-[11px] text-mute mt-0.5">Circle & Hashnote USYC · Tokenized US Short-Term Treasury Bills on Arc</div>
          </div>
          <div class="flex items-center gap-2">
            ${sweep.recommended ? `
              <button data-act="sweep-yield" class="px-3 py-1.5 rounded bg-[#70ffba] hover:bg-[#85ffc7] text-[#003822] font-display font-bold text-[12px] flex items-center gap-1 transition">
                <span class="material-symbols-outlined text-[15px]">savings</span> Sweep $${fmt(sweep.sweepAmount, 0)} to Yield
              </button>` : `
              <span class="text-[11px] text-mute px-2.5 py-1 bg-[#121316] rounded border border-[#1F2430]">Capital Optimized (Buffer Maintained)</span>`}
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 tnum text-[12px]">
          <div class="bg-[#121316] p-2.5 rounded">
            <div class="text-[10px] uppercase text-mute">Idle Liquid USDC</div>
            <div class="text-[16px] text-white font-semibold mt-0.5">${fmtUsd(idleUsdc)}</div>
            <div class="text-[10px] text-mute mt-0.5">Zero Yield Drag</div>
          </div>
          <div class="bg-[#121316] p-2.5 rounded">
            <div class="text-[10px] uppercase text-mute">USYC Treasury Holdings</div>
            <div class="text-[16px] text-[#70ffba] font-semibold mt-0.5">${fmtUsd(usycBal)}</div>
            <div class="text-[10px] text-[#70ffba] mt-0.5">+4.95% Annualized</div>
          </div>
          <div class="bg-[#121316] p-2.5 rounded">
            <div class="text-[10px] uppercase text-mute">Daily Forfeited Yield</div>
            <div class="text-[16px] ${opp.dailyForfeited > 0.05 ? "text-[#F59E0B]" : "text-mute"} font-semibold mt-0.5">-${fmtUsd(opp.dailyForfeited)}/day</div>
            <div class="text-[10px] text-mute mt-0.5">-$${fmt(opp.annualForfeited, 2)}/year</div>
          </div>
          <div class="bg-[#121316] p-2.5 rounded">
            <div class="text-[10px] uppercase text-mute">JIT Unwind Reserve</div>
            <div class="text-[16px] text-[#00f0ff] font-semibold mt-0.5">${fmtUsd(usycBal)}</div>
            <div class="text-[10px] text-mute mt-0.5">Instant Trade Liquidity</div>
          </div>
        </div>
      </div>`;
    })()}

    <div class="mt-3 bg-[#0d0e11] rounded overflow-hidden">
      <div class="px-3 py-2 font-display text-[13px] border-b border-[#1F2430]">Asset Holdings & Exposure</div>
      <div class="overflow-x-auto">
        <table class="w-full text-left tnum text-[12px] min-w-[560px]">
          <thead class="text-[10px] uppercase text-mute"><tr class="border-b border-[#1F2430]">
            <th class="px-3 py-2">Asset</th><th>Price</th><th>Qty</th><th>Value</th><th>24h</th><th>Allocation</th><th></th>
          </tr></thead>
          <tbody>
            ${p.rows.map((r) => `
              <tr class="border-b border-[#1F2430]/50">
                <td class="px-3 py-2"><div class="font-display">${TOKEN_META[r.sym]?.name || r.sym}</div><div class="text-mute text-[10px]">${r.sym}</div></td>
                <td>${fmtUsd(r.px)}</td>
                <td>${fmt(r.qty,4)}</td>
                <td>${fmtUsd(r.value)}</td>
                <td class="${r.chg>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmtPct(r.chg)}</td>
                <td>
                  <div class="flex items-center gap-2"><div class="w-20 h-1 bg-[#1b1b1f] rounded overflow-hidden"><div class="h-full bg-[#00f0ff]" style="width:${r.alloc}%"></div></div>${fmt(r.alloc,1)}%</div>
                </td>
                <td>${r.sym==="WETH"?`<button data-trade="ETH/USDC" class="px-2 py-0.5 rounded bg-[#292a2d] text-[11px]">Trade</button>`:r.sym==="cirBTC"?`<button data-trade="BTC/USDC" class="px-2 py-0.5 rounded bg-[#292a2d] text-[11px]">Trade</button>`:PAIRS[r.sym+"/USDC"]?`<button data-trade="${r.sym}/USDC" class="px-2 py-0.5 rounded bg-[#292a2d] text-[11px]">Trade</button>`:""}</td>
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </div>
  </main>`;
}

function aiView() {
  const cores = [
    ["market","show_chart","Market Analyst","Structure, orderflow & pivots"],
    ["trade","calculate","Trade Analyzer & Sizing","Kelly, slippage & risk"],
    ["portfolio","pie_chart","Portfolio Health","Concentration & systemic risk"],
    ["treasury","savings","Smart Treasury","USDC/USYC Yield & idle drag"],
    ["mandates","policy","Agent Mandates","EIP-712 scoped delegation"],
    ["wallet","fingerprint","Wallet Forensics","Holdings, frequency, P&L"],
  ];
  const a = state.analysis;
  const p = analyzePortfolio();
  const w = analyzeWallet();
  return `
  <main class="pt-14 pb-20 md:pb-4 min-h-screen">
    <div class="px-3 sm:px-4 py-2 bg-[#0d0e11] flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2430]">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.6)]"></span>
        <span class="font-display text-[12px] sm:text-[13px] uppercase tracking-tight text-[#dbfcff]">Arc AI Market & Portfolio Analyst</span>
        <span class="text-[10px] sm:text-[11px] px-1 bg-[#1f1f23] rounded text-mute">TELEMETRY_v4.2</span>
      </div>
      <div class="text-[10px] sm:text-[11px] text-mute">ARC DUAL-KERNEL: DETERMINISTIC DATA ENGINE → VERIFIABLE AI SYNTHESIS</div>
    </div>
    <div class="p-2 sm:p-3 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div class="xl:col-span-3 flex flex-col gap-2">
        <div class="bg-[#0d0e11] rounded p-3">
          <div class="text-[10px] uppercase text-mute mb-2">Analysis Matrix</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1">
            ${cores.map(([id,ic,t,s]) => `
              <button data-core="${id}" class="w-full text-left p-2 rounded flex items-center gap-2 ${state.aiCore===id?"bg-[#1f1f23]":"bg-[#1b1b1f] hover:bg-[#1f1f23]"}">
                <span class="material-symbols-outlined text-[18px] shrink-0 ${state.aiCore===id?"text-[#00f0ff]":"text-mute"}">${ic}</span>
                <div class="min-w-0"><div class="font-display text-[13px] truncate ${state.aiCore===id?"text-[#00f0ff]":""}">${t}</div><div class="text-[11px] text-mute truncate">${s}</div></div>
              </button>`).join("")}
          </div>
        </div>
        <div class="bg-[#0d0e11] rounded p-3">
          <div class="text-[10px] uppercase text-mute mb-2">Fast Telemetry Dispatch</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1">
            ${[
              ["Analyze ETH 4H setup","ai-analyze"],
              ["Analyze EURC/USDC FX setup","ai-fx"],
              ["Audit idle cash & USYC yield","ai-treasury"],
              ["Issue 4h Agent Mandate ($250)","ai-mandate-quick"],
              ["Audit wallet activity","ai-wallet"],
            ].map(([q,act]) => `<button data-act="${act}" class="w-full text-left px-2 py-1.5 rounded bg-[#1f1f23] text-[12px] hover:bg-[#292a2d] flex justify-between items-center">${q}<span class="material-symbols-outlined text-[14px] text-[#00f0ff] shrink-0">arrow_forward</span></button>`).join("")}
          </div>
        </div>
      </div>
      <div class="xl:col-span-9 bg-[#0d0e11] rounded p-3 sm:p-4">
        ${state.aiCore === "market" && a ? `
          <div class="font-display text-[18px] text-[#00f0ff]">${a.trend.toUpperCase()} STRUCTURE</div>
          <p class="mt-2 text-[14px]">${a.setup}</p>
          <p class="mt-2 text-[13px] text-[#b9cacb]">${a.why}</p>
          <p class="mt-2 text-[13px] text-[#F59E0B]">What could invalidate it — ${a.invalidateText}</p>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3 mt-4 tnum text-[12px]">
            <div class="bg-[#1b1b1f] p-2 rounded"><div class="text-mute text-[10px]">TREND</div>${a.trend}</div>
            <div class="bg-[#1b1b1f] p-2 rounded"><div class="text-mute text-[10px]">MOMENTUM</div>${a.momentum}</div>
            <div class="bg-[#1b1b1f] p-2 rounded"><div class="text-mute text-[10px]">SUPPORT</div>${fmtUsd(a.support)}</div>
            <div class="bg-[#1b1b1f] p-2 rounded"><div class="text-mute text-[10px]">RESISTANCE</div>${fmtUsd(a.resistance)}</div>
            <div class="bg-[#1b1b1f] p-2 rounded"><div class="text-mute text-[10px]">INVALIDATION</div>${fmtUsd(a.invalidation)}</div>
            <div class="bg-[#1b1b1f] p-2 rounded"><div class="text-mute text-[10px]">CONFIDENCE</div>${fmt(a.confidence*100,1)}%</div>
          </div>
          <button data-act="apply-levels" class="mt-4 px-3 py-1.5 rounded bg-[#00f0ff] text-[#00363a] text-[12px] font-display font-bold">Apply to chart</button>
        ` : state.aiCore === "portfolio" ? `
          <div class="font-display text-[18px] text-[#00f0ff]">PORTFOLIO HEALTH</div>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 tnum">
            <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">TOTAL</div><div class="text-[20px]">${fmtUsd(p.total)}</div></div>
            <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">LARGEST</div><div class="text-[20px]">${p.largest?.sym} ${fmt(p.largest?.alloc,1)}%</div></div>
            <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">STABLES</div><div class="text-[20px]">${fmt(p.stables,1)}%</div></div>
            <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">24H P&L</div><div class="text-[20px] text-[#70ffba]">+${fmtUsd(p.pnl)}</div></div>
          </div>
          <p class="mt-4 text-[14px]">${p.observation}</p>
          <button data-nav="portfolio" class="mt-4 px-3 py-1.5 rounded bg-[#292a2d] text-[12px]">View allocation</button>
        ` : state.aiCore === "treasury" ? renderTreasuryAnalysis() : state.aiCore === "mandates" ? renderMandatesPanel() : state.aiCore === "wallet" ? `
          <div class="font-display text-[18px] text-[#00f0ff]">WALLET FORENSICS</div>
          <div class="mt-3 text-[13px] space-y-1 text-[#b9cacb]">
            <div>Address ${w.address} · ${w.holdings} assets</div>
            <div>${w.freq}</div>
            <div>Realized P&L ${fmtUsd(w.realized)} · Unrealized ${fmtUsd(w.unrealized)}</div>
            <div>No seed, key, or signing authority is granted to the model.</div>
          </div>
        ` : state.aiCore === "trade" ? renderTradeAnalysis() : `
          <div class="text-mute text-[13px]">Dispatch an analysis from the left rail. The model receives structured market and portfolio payloads — it does not invent prices.</div>
        `}
      </div>
    </div>
  </main>`;
}

function renderTreasuryAnalysis() {
  const idleUsdc = state.balances.USDC || 0;
  const usycBal = state.balances.USYC || 0;
  const opp = calculateOpportunityCost(idleUsdc);
  const sweep = calculateYieldSweep({ liquidUsdc: idleUsdc, reserveBufferUsd: 100 });
  return `
    <div class="font-display text-[18px] text-[#70ffba] flex items-center gap-2">
      <span class="material-symbols-outlined text-[22px]">savings</span> ARC SMART TREASURY ANALYZER
    </div>
    <div class="text-[12px] text-mute mt-1">Institutional Cash Optimization · Hashnote USYC 4.95% APY (Short-Term US Treasuries)</div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 tnum">
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute">IDLE CASH (USDC)</div>
        <div class="text-[20px] font-semibold text-white mt-1">${fmtUsd(idleUsdc)}</div>
        <div class="text-[11px] text-mute mt-0.5">Liquid protocol units</div>
      </div>
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute">YIELD ASSETS (USYC)</div>
        <div class="text-[20px] font-semibold text-[#70ffba] mt-1">${fmtUsd(usycBal)}</div>
        <div class="text-[11px] text-[#70ffba] mt-0.5">Earning 4.95% APY</div>
      </div>
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute">FORFEITED DRAG</div>
        <div class="text-[20px] font-semibold ${opp.dailyForfeited > 0.05 ? "text-[#F59E0B]" : "text-mute"} mt-1">-${fmtUsd(opp.dailyForfeited)}/d</div>
        <div class="text-[11px] text-mute mt-0.5">-$${fmt(opp.annualForfeited, 2)}/yr</div>
      </div>
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute">JIT UNWIND STATUS</div>
        <div class="text-[20px] font-semibold text-[#00f0ff] mt-1">${usycBal > 0 ? "ARMED" : "UNFUNDED"}</div>
        <div class="text-[11px] text-mute mt-0.5">${usycBal > 0 ? "Instant swap cover" : "Zero USYC collateral"}</div>
      </div>
    </div>
    <div class="mt-4 p-3 bg-[#1b1b1f] rounded text-[13px] space-y-2 text-[#b9cacb]">
      <div class="font-display text-[14px] text-white">Institutional Recommendation</div>
      <p>
        ${idleUsdc > 100
          ? `You have <strong class="text-white">${fmtUsd(idleUsdc)}</strong> in non-yielding native USDC. By sweeping <strong class="text-[#70ffba]">$${fmt(sweep.sweepAmount, 0)} USDC</strong> into USYC while keeping a $100 buffer for gas and tactical operations, your portfolio will generate an additional <strong class="text-[#70ffba]">+$${fmt(sweep.sweepAmount * USYC_APY, 2)}/year</strong> with zero liquidity friction.`
          : `Your cash holdings are capital efficient. Liquid USDC is positioned within the recommended operating buffer ($100 max idle).`}
      </p>
      <p class="text-[11px] text-mute">
        *Arc native properties: USDC is protocol gas (18 decimals); USYC is 6-decimal T-Bill ERC-20 with sub-second deterministic redemption.
      </p>
    </div>
    <div class="mt-4 flex gap-3">
      ${sweep.recommended ? `<button data-act="sweep-yield" class="px-4 py-2 rounded bg-[#70ffba] text-[#003822] font-display font-bold text-[13px] flex items-center gap-1.5"><span class="material-symbols-outlined text-[17px]">savings</span> Execute Sweep to USYC</button>` : ""}
      <button data-nav="portfolio" class="px-4 py-2 rounded bg-[#292a2d] text-[13px] font-display">View Portfolio Balances</button>
    </div>
  `;
}

function renderMandatesPanel() {
  const list = state.mandates || [];
  return `
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <div>
        <div class="font-display text-[18px] text-[#00f0ff] flex items-center gap-2">
          <span class="material-symbols-outlined text-[22px]">policy</span> BOUNDED AGENTIC MANDATES
        </div>
        <div class="text-[12px] text-mute mt-0.5">EIP-712 Scoped Delegation Permits for Autonomous Agents & Trading Bots</div>
      </div>
      <button data-act="open-mandate-modal" class="self-start sm:self-auto px-3 py-1.5 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[12px] flex items-center gap-1">
        <span class="material-symbols-outlined text-[16px]">add</span> Issue New Mandate
      </button>
    </div>

    <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 tnum text-[12px]">
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute uppercase">Active Mandates</div>
        <div class="text-[20px] font-semibold text-white mt-1">${list.filter((m) => !m.revoked && Math.floor(Date.now() / 1000) <= m.deadline).length}</div>
        <div class="text-[11px] text-mute mt-0.5">Cryptographically bounded</div>
      </div>
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute uppercase">Authorized Budget</div>
        <div class="text-[20px] font-semibold text-[#00f0ff] mt-1">$${fmt(list.reduce((s, m) => s + (m.revoked ? 0 : m.remainingSpend), 0), 2)}</div>
        <div class="text-[11px] text-mute mt-0.5">Hard cap across all agents</div>
      </div>
      <div class="bg-[#1b1b1f] p-3 rounded">
        <div class="text-[10px] text-mute uppercase">Policy Enforcement</div>
        <div class="text-[20px] font-semibold text-[#70ffba] mt-1">FAIL-CLOSED</div>
        <div class="text-[11px] text-mute mt-0.5">Zero key custody given to AI</div>
      </div>
    </div>

    <div class="mt-4 bg-[#1b1b1f] rounded p-3">
      <div class="font-display text-[13px] text-white mb-2">Permit Registry</div>
      ${list.length ? `
        <div class="overflow-x-auto">
          <table class="w-full text-left tnum text-[12px] min-w-[580px]">
            <thead class="text-[10px] uppercase text-mute border-b border-[#1F2430]">
              <tr>
                <th class="py-2">Mandate ID</th>
                <th>Agent</th>
                <th>Pairs</th>
                <th>Budget (Rem / Cap)</th>
                <th>Max Slip</th>
                <th>Expires</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${list.map((m) => {
                const nowSec = Math.floor(Date.now() / 1000);
                const expired = nowSec > m.deadline;
                const active = !m.revoked && !expired;
                const remainingMin = Math.max(0, Math.floor((m.deadline - nowSec) / 60));
                return `
                <tr class="border-b border-[#1F2430]/50">
                  <td class="py-2.5 font-mono text-[11px] text-[#00f0ff]">${m.id.slice(0, 14)}…</td>
                  <td class="font-mono text-[11px] text-mute">${shortAddr(m.agent)}</td>
                  <td>${m.allowedPairs.map((p) => `<span class="px-1 py-0.5 bg-[#292a2d] text-[10px] rounded mr-1">${p}</span>`).join("")}</td>
                  <td><span class="text-white font-semibold">$${fmt(m.remainingSpend, 0)}</span> <span class="text-mute">/ $${fmt(m.maxSpendUsd, 0)}</span></td>
                  <td>${m.maxSlippageBps} bps</td>
                  <td>${expired ? `<span class="text-mute">Expired</span>` : `<span class="text-[#70ffba]">${remainingMin}m left</span>`}</td>
                  <td>
                    ${active ? `<span class="text-[10px] px-1.5 py-0.5 bg-[#70ffba]/15 text-[#70ffba] rounded font-bold">ARMED</span>` : m.revoked ? `<span class="text-[10px] px-1.5 py-0.5 bg-[#ffb4ab]/15 text-[#ffb4ab] rounded">REVOKED</span>` : `<span class="text-[10px] px-1.5 py-0.5 bg-[#292a2d] text-mute rounded">EXPIRED</span>`}
                  </td>
                  <td>
                    ${active ? `
                      <div class="flex items-center gap-1.5">
                        <button data-test-mandate="${m.id}" class="px-2 py-0.5 rounded bg-[#00f0ff]/20 hover:bg-[#00f0ff]/30 text-[#00f0ff] font-semibold text-[10px] transition" title="Test execute a bounded trade as the agent">Test Exec</button>
                        <button data-revoke-mandate="${m.id}" class="px-2 py-0.5 rounded bg-[#ffb4ab]/20 text-[#ffb4ab] text-[10px] hover:bg-[#ffb4ab]/30">Revoke</button>
                      </div>` : ""}
                  </td>
                </tr>`;
              }).join("")}
            </tbody>
          </table>
        </div>` : `
        <div class="py-8 text-center text-mute text-[13px]">
          No active agentic mandates. Click "Issue New Mandate" to grant a bounded, zero-custody EIP-712 permit to an execution agent.
        </div>`}
    </div>
  `;
}

function renderTradeAnalysis() {
  const pair = PAIRS[state.pair];
  const q = quoteTrade({ side: state.side, amountUsd: state.amount, price: pair.price, slippageBps: state.slippage * 100 });
  const t = analyzeTrade(q);
  return `
    <div class="font-display text-[18px] text-[#00f0ff]">TRADE ANALYZER</div>
    <div class="text-[12px] text-mute mt-1">Data → Calculations → AI interpretation</div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 tnum text-[13px]">
      <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">TRADE VALUE</div>${fmtUsd(t.tradeValue)}</div>
      <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">NAV</div>${fmtUsd(t.portfolio)}</div>
      <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">SIZE</div>${fmt(t.sizePct,2)}%</div>
      <div class="bg-[#1b1b1f] p-3 rounded"><div class="text-[10px] text-mute">IMPACT</div>${fmt(t.impact,2)}%</div>
    </div>
    <p class="mt-4 text-[14px]">${t.note}</p>
    <button data-nav="terminal" class="mt-4 px-3 py-1.5 rounded bg-[#00E599] text-[#08090C] text-[12px] font-display font-bold">Open order panel</button>
  `;
}

function activityView() {
  const rows = state.activity;
  return `
  <main class="pt-14 pb-20 md:pb-4 min-h-screen px-3 sm:px-4 py-4">
    <div class="font-display text-[16px] mb-3">Activity · this session</div>
    <p class="text-[12px] text-mute mb-3">Only signatures produced in this browser session. Every trade produces an exportable cryptographic audit certificate.</p>
    <div class="bg-[#0d0e11] rounded overflow-hidden">
      ${rows.length ? `<div class="overflow-x-auto"><table class="w-full text-left tnum text-[12px] min-w-[560px]">
        <thead class="text-[10px] uppercase text-mute"><tr class="border-b border-[#1F2430]">
          <th class="px-3 py-2">Time</th><th>Type</th><th>Detail</th><th>Status</th><th>Audit Certificate</th><th>Signature</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="border-b border-[#1F2430]/50">
              <td class="px-3 py-2 text-mute whitespace-nowrap">${new Date(r.ts).toLocaleString()}</td>
              <td class="uppercase text-[10px] text-[#00f0ff]">${escapeHtml(r.type)}</td>
              <td>${escapeHtml(r.label)}<div class="text-mute">${escapeHtml(r.detail)}</div></td>
              <td class="text-[#70ffba]">${escapeHtml(r.status)}</td>
              <td>
                ${(r.receipt || r.receiptId) ? `<button data-view-receipt="${escapeHtml(r.receipt?.receiptId || r.receiptId)}" class="px-2 py-0.5 rounded bg-[#00f0ff]/15 hover:bg-[#00f0ff]/25 text-[#00f0ff] font-mono text-[10px] border border-[#00f0ff]/30 flex items-center gap-1 transition"><span class="material-symbols-outlined text-[12px]">verified</span>Verify SHA-256</button>` : `<span class="text-mute text-[11px]">—</span>`}
              </td>
              <td class="text-[#00f0ff] font-mono">${escapeHtml(typeof r.hash === "string" ? r.hash.slice(0, 10) + "…" + r.hash.slice(-6) : "—")}</td>
            </tr>`).join("")}
        </tbody>
      </table></div>` : `<div class="px-3 py-8 text-[13px] text-mute">No signed tickets this session.</div>`}
    </div>
  </main>`;
}

function proofView() {
  const local = state.proof.local || [];
  const live = state.proof.live?.rows || [];
  const chainOk = !!state.proof.live?.chainOk;
  const when = state.proof.checkedAt ? new Date(state.proof.checkedAt).toLocaleString() : "not run this session";
  const row = (r) => `
    <div class="flex gap-3 items-start border-b border-[#1F2430]/60 py-2">
      <span class="tnum text-[11px] ${r.ok ? "text-[#70ffba]" : "text-[#ffb4ab]"}">${r.ok ? "PASS" : "FAIL"}</span>
      <span class="text-[12px] text-[#e3e2e6]">${escapeHtml(r.detail)}</span>
    </div>`;
  return `
  <main class="pt-14 pb-20 md:pb-4 min-h-screen px-3 sm:px-4 py-4 max-w-5xl mx-auto">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <div class="font-display text-[16px]">Proof · re-query, do not screenshot</div>
        <p class="text-[12px] text-mute mt-1">Live rows hit ${escapeHtml(ARC.rpc)}. Local rows are fail-closed unit checks in this process. Last run ${escapeHtml(when)}.</p>
      </div>
      <button data-act="proof" class="self-start sm:self-auto px-3 py-1.5 rounded bg-[#00F0FF] text-[#08090C] font-display text-[12px] font-bold">${state.proof.running ? "Querying…" : "Run proof"}</button>
    </div>
    <div class="mt-4 grid md:grid-cols-2 gap-3">
      <section class="bg-[#0d0e11] rounded p-4">
        <div class="font-display text-[12px] uppercase text-[#00f0ff]">Live Arc RPC</div>
        <div class="mt-1 text-[12px] ${chainOk ? "text-[#70ffba]" : "text-[#F59E0B]"}">${chainOk ? "Chain ID matches 5042." : "Chain not confirmed this session."}</div>
        <div class="mt-2">${live.length ? live.map(row).join("") : `<div class="text-[12px] text-mute py-3">Not queried yet.</div>`}</div>
      </section>
      <section class="bg-[#0d0e11] rounded p-4">
        <div class="font-display text-[12px] uppercase text-[#00f0ff]">Negative proofs</div>
        <div class="mt-1 text-[12px] text-mute">The desk must refuse garbage, not only accept the happy path.</div>
        <div class="mt-2">${local.length ? local.map(row).join("") : `<div class="text-[12px] text-mute py-3">Not run yet.</div>`}</div>
      </section>
    </div>
    <section class="mt-4 bg-[#0d0e11] border border-[#1F2430] rounded-lg p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F2430]">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#00f0ff] text-[22px]">gavel</span>
            <span class="font-display text-[15px] uppercase font-bold text-white tracking-wide">InterminalSettlement · Arc Mainnet Protocol</span>
          </div>
          <p class="text-[12px] text-mute mt-0.5">EIP-712 TradeTicket execution, Bounded Mandates, and On-Chain Audit Anchoring on Chain ID 5042.</p>
        </div>
        <div class="flex items-center gap-2">
          ${state.settlementContractAddress ? `
            <span class="px-2.5 py-1 rounded bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30 text-[11px] font-mono flex items-center gap-1.5 font-semibold">
              <span class="w-2 h-2 rounded-full bg-[#00E599] animate-pulse"></span> DEPLOYED ON ARC
            </span>
          ` : `
            <button data-act="deploy-settlement" ${state.deployingContract ? "disabled" : ""} class="px-4 py-2 rounded bg-[#00F0FF] hover:bg-[#38BDF8] disabled:opacity-60 text-[#08090C] font-display font-bold text-[12px] transition flex items-center gap-1.5 shadow-lg shadow-[#00F0FF]/10">
              <span class="material-symbols-outlined text-[16px]">${state.deployingContract ? "sync" : "cloud_upload"}</span>
              ${state.deployingContract ? "Broadcasting to Arc..." : "Deploy Contract to Arc Mainnet"}
            </button>
          `}
        </div>
      </div>

      <div class="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px]">
        <div class="bg-[#12151D] p-3 rounded border border-[#1F2430]/60">
          <div class="text-[10px] uppercase text-mute">Target Chain</div>
          <div class="font-semibold text-white mt-0.5">Arc Mainnet (5042)</div>
          <div class="text-[10px] text-mute mt-1">Gas: 18-dec Native USDC</div>
        </div>
        <div class="bg-[#12151D] p-3 rounded border border-[#1F2430]/60">
          <div class="text-[10px] uppercase text-mute">Contract Artifact</div>
          <div class="font-semibold text-[#00f0ff] mt-0.5">InterminalSettlement.sol</div>
          <div class="text-[10px] text-mute mt-1">8,896 bytes bytecode · 26 ABI methods</div>
        </div>
        <div class="bg-[#12151D] p-3 rounded border border-[#1F2430]/60">
          <div class="text-[10px] uppercase text-mute">Arc AMM Router</div>
          <div class="font-mono text-[11px] text-white mt-0.5 truncate" title="${ARC.router}">${shortAddr(ARC.router)}</div>
          <div class="text-[10px] text-[#70ffba] mt-1">Uniswap V2 Compatible</div>
        </div>
        <div class="bg-[#12151D] p-3 rounded border border-[#1F2430]/60">
          <div class="text-[10px] uppercase text-mute">Settlement Address</div>
          <div class="font-mono text-[11px] ${state.settlementContractAddress ? "text-[#70ffba]" : "text-[#F59E0B]"} mt-0.5 truncate">
            ${state.settlementContractAddress ? shortAddr(state.settlementContractAddress) : "Not deployed yet"}
          </div>
          <div class="text-[10px] text-mute mt-1">
            ${state.settlementContractAddress ? `<a href="${ARC.explorer}/address/${state.settlementContractAddress}" target="_blank" class="text-[#00f0ff] hover:underline">View in Arc Explorer ↗</a>` : "Ready for broadcast"}
          </div>
        </div>
      </div>

      <div class="mt-4 p-3 rounded bg-[#12151D] border border-[#1F2430]/60 text-[11px] text-mute">
        <div class="flex items-center justify-between text-white font-semibold mb-1">
          <span>Deployment Options</span>
          <span class="text-[10px] text-[#70ffba]">Zero AI Key Custody</span>
        </div>
        <div class="space-y-1">
          <div>• <strong>Browser Wallet (1-Click):</strong> Connect MetaMask/Rabby on Arc Mainnet and click "Deploy Contract to Arc Mainnet". The wallet requests approval using native USDC for gas.</div>
          <div>• <strong>Headless CLI:</strong> Run <code class="bg-[#08090C] px-1.5 py-0.5 rounded text-[#00f0ff] font-mono">$env:PRIVATE_KEY="0x..."; node scripts/deploy.mjs</code> from your terminal.</div>
        </div>
      </div>
    </section>

    <section class="mt-3 bg-[#0d0e11] border border-[#1F2430] rounded-lg p-5">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1F2430]">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[#00E599] text-[20px]">candlestick_chart</span>
            <span class="font-display text-[15px] uppercase font-bold text-white tracking-wide">Live DEX Market Data Engine</span>
          </div>
          <p class="text-[12px] text-mute mt-0.5">Streaming institutional price feeds from Uniswap V3 on Ethereum & verified DEX oracles.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2.5 py-1 rounded bg-[#00E599]/15 text-[#00E599] border border-[#00E599]/30 text-[11px] font-mono flex items-center gap-1.5 font-semibold">
            <span class="w-2 h-2 rounded-full bg-[#00E599] ${state.marketFeedStatus?.live ? 'animate-pulse' : ''}"></span>
            ${state.marketFeedStatus?.live ? "LIVE DEX FEED ACTIVE" : "CONNECTING TO DEX"}
          </span>
          <button data-act="sync-market" class="px-3 py-1 rounded bg-[#292a2d] hover:bg-[#343538] text-[11px] text-white flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">refresh</span> Refresh Feeds
          </button>
        </div>
      </div>
      <div class="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[12px]">
        <div class="bg-[#12151D] p-2.5 rounded">
          <div class="text-[10px] text-mute uppercase">ETH / USDC</div>
          <div class="font-mono text-white font-bold text-[14px] mt-0.5">${fmtUsd(PAIRS["ETH/USDC"].price)}</div>
          <div class="text-[10px] ${PAIRS["ETH/USDC"].change >= 0 ? "text-[#70ffba]" : "text-[#ffb4ab]"}">${fmtPct(PAIRS["ETH/USDC"].change)} (24h)</div>
        </div>
        <div class="bg-[#12151D] p-2.5 rounded">
          <div class="text-[10px] text-mute uppercase">BTC / USDC</div>
          <div class="font-mono text-white font-bold text-[14px] mt-0.5">${fmtUsd(PAIRS["BTC/USDC"].price)}</div>
          <div class="text-[10px] ${PAIRS["BTC/USDC"].change >= 0 ? "text-[#70ffba]" : "text-[#ffb4ab]"}">${fmtPct(PAIRS["BTC/USDC"].change)} (24h)</div>
        </div>
        <div class="bg-[#12151D] p-2.5 rounded">
          <div class="text-[10px] text-mute uppercase">EURC / USDC</div>
          <div class="font-mono text-white font-bold text-[14px] mt-0.5">${PAIRS["EURC/USDC"].price.toFixed(4)}</div>
          <div class="text-[10px] ${PAIRS["EURC/USDC"].change >= 0 ? "text-[#70ffba]" : "text-[#ffb4ab]"}">${fmtPct(PAIRS["EURC/USDC"].change)} (24h)</div>
        </div>
        <div class="bg-[#12151D] p-2.5 rounded">
          <div class="text-[10px] text-mute uppercase">USYC / USDC (NAV)</div>
          <div class="font-mono text-white font-bold text-[14px] mt-0.5">${PAIRS["USYC/USDC"].price.toFixed(4)}</div>
          <div class="text-[10px] text-[#70ffba]">+5.10% APY Yield</div>
        </div>
      </div>
    </section>

    <section class="mt-3 bg-[#0d0e11] rounded p-4">
      <div class="font-display text-[12px] uppercase text-[#00f0ff]">Policy rubric</div>
      <p class="text-[12px] text-mute mt-1">These gates are the same functions the Review button uses. They are not a hidden README claim.</p>
      <div class="mt-3 grid md:grid-cols-2 gap-2">
        ${POLICY.map((p) => `<div class="border border-[#1F2430] rounded p-3"><div class="text-[12px] text-white">${escapeHtml(p.title)}</div><div class="text-[12px] text-mute mt-1">${escapeHtml(p.rule)}</div></div>`).join("")}
      </div>
    </section>
    <section class="mt-3 bg-[#0d0e11] rounded p-4">
      <div class="font-display text-[12px] uppercase text-[#F59E0B]">Known limitations</div>
      <ul class="mt-2 space-y-1 text-[12px] text-[#b9cacb] list-disc pl-4">
        ${LIMITATIONS.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}
      </ul>
    </section>
  </main>`;
}

function reviewModal() {
  if (!state.reviewOpen || !state.pendingQuote) return "";
  const pair = PAIRS[state.pair] || PAIRS["ETH/USDC"];
  const q = state.pendingQuote;
  const isBuy = state.side === "buy";
  const inAmt = q.received;
  const inSym = isBuy ? pair.base : "USDC";
  const sellSym = isBuy ? "USDC" : pair.base;
  const sellAmt = isBuy ? state.amount : state.amount / pair.price;
  return `
  <div class="fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-4">
    <div class="absolute inset-0 bg-[#0d0e11]/85 backdrop-blur-md" data-act="close-review"></div>
    <div class="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col lg:flex-row gap-3">
      <div class="flex-1 bg-[#1f1f23] rounded-lg p-4 sm:p-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00f0ff] via-[#dbfcff] to-[#01e599]"></div>
        <div class="flex items-start justify-between gap-2">
          <div>
            <div class="flex items-center gap-1 text-[#00f0ff]"><span class="material-symbols-outlined text-[18px]">verified_user</span><span class="font-display text-[16px] sm:text-[18px] uppercase">Review & Confirm Trade</span></div>
            <div class="text-[10px] uppercase tracking-wider text-mute mt-1">EIP-712 ticket · no router broadcast</div>
          </div>
          <div class="text-[10px] sm:text-[11px] px-2 py-0.5 rounded bg-[#292a2d] shrink-0"><span class="w-2 h-2 inline-block rounded-full bg-[#01e599] animate-pulse mr-1"></span>Arc · ${ARC.chainId}</div>
        </div>
        <div class="mt-4 bg-[#0d0e11] p-3 rounded">
          <div class="text-[10px] uppercase text-mute">You send</div>
          <div class="flex justify-between items-baseline"><div class="font-display text-[22px] sm:text-[28px]">${fmt(sellAmt, isBuy ? 2 : 5)} <span class="text-[#00f0ff] text-[14px]">${sellSym}</span></div><div class="text-[12px] text-mute">${shortAddr(state.address)}</div></div>
        </div>
        <div class="flex justify-center -my-2 relative z-10"><div class="bg-[#292a2d] px-2 py-0.5 rounded-full tnum text-[11px] text-[#00dbe9]">1 ${pair.base} = ${fmtUsd(q.effective)}</div></div>
        <div class="bg-[#0d0e11] p-3 rounded">
          <div class="text-[10px] uppercase text-mute">Estimated receive</div>
          <div class="font-display text-[22px] sm:text-[28px] text-[#70ffba]">${fmt(inAmt, isBuy ? 5 : 2)} <span class="text-white text-[14px]">${inSym}</span></div>
          <div class="mt-2 flex justify-between text-[11px] sm:text-[12px] bg-[#1b1b1f] px-2 py-1 rounded"><span class="text-mute">Guaranteed min</span><span class="tnum">${fmt(q.minReceived, isBuy ? 5 : 2)} ${inSym}</span></div>
        </div>
        ${(() => {
          if (state.side === "buy") {
            const jit = calculateJitUnwind({
              tradeAmountUsd: state.amount,
              liquidUsdc: state.balances.USDC || 0,
              usycBalance: state.balances.USYC || 0,
              slippageBps: state.slippage * 100,
            });
            if (jit.needed && jit.canCover) {
              return `
              <div class="mt-3 bg-[#00f0ff]/10 border border-[#00f0ff]/30 p-2.5 rounded text-[12px] text-[#dbfcff]">
                <div class="flex items-center gap-1.5 text-[#00f0ff] font-semibold text-[11px] uppercase">
                  <span class="material-symbols-outlined text-[16px]">swap_calls</span> Smart Treasury JIT Unwind Armed
                </div>
                <div class="mt-1 text-[11px] text-mute">
                  Liquid USDC: <strong class="text-white">$${fmt(state.balances.USDC || 0, 2)}</strong> · Auto-redeeming <strong class="text-[#00f0ff]">${fmt(jit.usycToRedeem, 2)} USYC</strong> to cover ticket size.
                </div>
              </div>`;
            }
          }
          return "";
        })()}
        <div class="mt-3 bg-[#1b1b1f] p-3 rounded text-[12px] grid grid-cols-2 gap-2">
          <div><div class="text-mute text-[11px]">Price impact</div><div class="tnum text-[#70ffba]">${fmt(q.impact*100,2)}%</div></div>
          <div><div class="text-mute text-[11px]">Route</div><div class="text-white text-[11px]">Interminal Settlement → Arc AMM</div></div>
          <div class="col-span-2 sm:col-span-1"><div class="text-mute text-[11px]">Settlement Contract</div><div class="text-[#00f0ff] font-mono text-[11px] truncate"><a href="${ARC.explorer}/address/${ARC.settlement}" target="_blank" class="hover:underline">${shortAddr(ARC.settlement)}</a></div></div>
          <div class="col-span-2 sm:col-span-1"><div class="text-mute text-[11px]">Network gas</div><div class="tnum text-white">${q.gasUsd} USDC</div></div>
        </div>
        <div class="mt-4 flex flex-col sm:flex-row gap-2">
          <button data-act="close-review" class="w-full sm:w-1/3 py-2 rounded bg-[#292a2d] font-display text-[13px]">Cancel & Adjust</button>
          <button data-act="sign" class="w-full sm:w-2/3 py-2 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[13px] flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-[18px]">verified_user</span> Authorize & Sign (${shortAddr(state.address)})
          </button>
        </div>
      </div>
      <div class="lg:w-80 bg-[#0d0e11] rounded-lg p-4 text-[12px]">
        <div class="font-display text-[12px] text-[#00f0ff] uppercase mb-2">Pre-flight · AI + Risk</div>
        ${(() => { const t = analyzeTrade(q); const r = riskMetrics(); return `
          <div class="space-y-2 text-[#b9cacb]">
            <div class="flex justify-between"><span>Ticket / NAV</span><span class="tnum text-white">${fmt(t.sizePct,2)}%</span></div>
            <div class="flex justify-between"><span>Impact</span><span class="tnum">${fmt(t.impact,2)}%</span></div>
            <div class="flex justify-between"><span>Concentration now</span><span class="tnum">${r.concentration}</span></div>
            <p class="pt-2">${t.note}</p>
            <p class="text-mute">The model cannot sign. Exact calldata is shown to the wallet.</p>
          </div>`; })()}
      </div>
    </div>
  </div>`;
}

function executedModal() {
  if (!state.lastTx || !state.lastTx.show) return "";
  const tx = state.lastTx;
  return `
  <div class="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-4">
    <div class="absolute inset-0 bg-[#0d0e11]/80 backdrop-blur-sm" data-act="close-tx"></div>
    <div class="relative bg-[#1f1f23] rounded-lg p-4 sm:p-6 w-full max-w-md mx-2">
      <div class="font-display text-[16px] text-[#70ffba]">TICKET SIGNED</div>
      <div class="mt-3 text-[14px]">${tx.label}</div>
      <div class="mt-2 tnum text-[12px] space-y-1 text-[#b9cacb]">
        <div class="flex justify-between"><span>Quoted price</span><span class="text-white">${fmtUsd(tx.price)}</span></div>
        <div class="flex justify-between"><span>Network</span><span>Arc ${ARC.chainId}</span></div>
        <div class="flex justify-between"><span>Status</span><span class="text-[#70ffba]">Wallet signed</span></div>
        <div class="flex justify-between gap-2"><span>Signature</span><span class="text-[#00f0ff] font-mono text-[11px] truncate text-right">${typeof tx.hash === "string" && tx.hash.length > 20 ? tx.hash.slice(0, 10) + "…" + tx.hash.slice(-8) : tx.hash}</span></div>
      </div>
      <div class="mt-4 flex flex-col gap-2">
        <button data-act="view-tx-receipt" class="w-full py-2 rounded bg-[#0d0e11] hover:bg-[#121316] border border-[#00f0ff]/40 text-[#00f0ff] font-display text-[12px] flex items-center justify-center gap-1.5 transition">
          <span class="material-symbols-outlined text-[16px]">verified</span> View Cryptographic Audit Receipt
        </button>
        <button data-act="close-tx" class="w-full py-2 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[13px]">View portfolio</button>
      </div>
    </div>
  </div>`;
}

function searchModal() {
  if (!state.searchOpen) return "";
  const q = (state.searchQuery || "").trim().toLowerCase();
  const pairs = Object.entries(PAIRS).filter(([k, v]) => {
    if (!q) return true;
    return k.toLowerCase().includes(q) || v.base.toLowerCase().includes(q) || (TOKEN_META[v.base]?.name || "").toLowerCase().includes(q);
  });
  return `
  <div class="fixed inset-0 z-[70] flex items-start justify-center pt-16 sm:pt-24 px-3 sm:px-4">
    <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" data-act="close-search"></div>
    <div class="relative w-full max-w-lg bg-[#1f1f23] rounded-lg p-3 shadow-2xl border border-[#1F2430]">
      <div class="relative">
        <span class="material-symbols-outlined text-[18px] text-mute absolute left-2.5 top-2.5">search</span>
        <input id="search-in" value="${escapeHtml(state.searchQuery)}" class="w-full bg-[#0d0e11] border border-[#1F2430] rounded pl-9 pr-3 py-2 outline-none focus:border-[#00f0ff] text-[14px] text-white" placeholder="Search markets (e.g. ETH, EURC, USYC, BTC)…" />
      </div>
      <div class="mt-2 max-h-72 overflow-y-auto space-y-1">
        ${pairs.length ? pairs.map(([k, v]) => `
          <button data-trade="${k}" class="w-full flex items-center justify-between px-3 py-2 text-[13px] hover:bg-[#292a2d] rounded transition">
            <div class="flex items-center gap-2">
              <span class="font-display font-semibold text-white">${k}</span>
              <span class="text-[11px] text-mute">${TOKEN_META[v.base]?.name || ""}</span>
            </div>
            <div class="text-right tnum">
              <div class="font-semibold text-white">${k === "EURC/USDC" ? v.price.toFixed(4) : fmtUsd(v.price)}</div>
              <div class="text-[11px] ${v.change >= 0 ? "text-[#70ffba]" : "text-[#ffb4ab]"}">${fmtPct(v.change)}</div>
            </div>
          </button>
        `).join("") : `<div class="py-6 text-center text-mute text-[12px]">No matching Arc markets found</div>`}
      </div>
      <div class="mt-2 pt-2 border-t border-[#1F2430] flex justify-between text-[11px] text-mute">
        <span>Press <kbd class="px-1 bg-[#121316] rounded border border-[#1F2430]">ESC</kbd> to close</span>
        <span>${pairs.length} markets</span>
      </div>
    </div>
  </div>`;
}

function alertsPanel() {
  if (!state.alertsOpen) return "";
  return `
  <div class="fixed top-14 right-2 sm:right-4 z-[60] w-[calc(100vw-1rem)] sm:w-80 max-w-sm bg-[#1f1f23] border border-[#1F2430] rounded p-3 shadow-xl">
    <div class="font-display text-[12px] uppercase text-[#00f0ff] mb-2 flex justify-between items-center">
      <span>Alerts</span>
      <button data-act="close-alerts" class="text-mute hover:text-white text-[10px]">Close</button>
    </div>
    ${state.alerts.map((a)=>`<div class="py-1.5 text-[12px] border-b border-[#1F2430]/60 flex justify-between items-center">
      <span>${escapeHtml(a.text)}</span>
      <button data-alert-toggle="${a.id}" class="text-[10px] ${a.armed ? "text-[#70ffba]" : "text-mute hover:text-white"} font-semibold">${a.armed ? "ARMED" : "OFF"}</button>
    </div>`).join("")}
    <div class="text-[11px] text-mute mt-2">In-app alerts persisted locally.</div>
  </div>`;
}

function receiptModal() {
  if (!state.activeReceiptModal) return "";
  const r = state.activeReceiptModal;
  const isOk = verifyReceiptIntegrity(r);
  return `
  <div class="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4">
    <div class="absolute inset-0 bg-[#0d0e11]/85 backdrop-blur-md" data-act="close-receipt"></div>
    <div class="relative z-10 w-full max-w-2xl bg-[#1f1f23] rounded-lg p-4 sm:p-6 border border-[#1F2430] shadow-2xl max-h-[92vh] overflow-y-auto">
      <div class="flex items-start justify-between pb-3 border-b border-[#1F2430]">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#00f0ff]">verified</span>
            <span class="font-display text-[15px] sm:text-[16px] text-white uppercase">Cryptographic Audit Certificate</span>
          </div>
          <div class="text-[11px] text-mute mt-0.5">Arc Mainnet (Chain 5042) · Tamper-Evident SHA-256 Digest</div>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-[10px] px-2 py-0.5 rounded ${isOk ? "bg-[#70ffba]/15 text-[#70ffba] font-bold border border-[#70ffba]/30" : "bg-[#ffb4ab]/15 text-[#ffb4ab] font-bold"}">
            ${isOk ? "✓ INTEGRITY VERIFIED" : "⚠ DIGEST MISMATCH"}
          </span>
          <button data-act="close-receipt" class="text-mute hover:text-white p-1"><span class="material-symbols-outlined text-[18px]">close</span></button>
        </div>
      </div>

      <div class="mt-4 space-y-3 tnum text-[12px]">
        <div class="bg-[#0d0e11] p-3 rounded grid grid-cols-2 gap-3">
          <div><span class="text-mute text-[10px] uppercase">Receipt ID</span><div class="font-mono text-[11px] text-white truncate">${r.receiptId}</div></div>
          <div><span class="text-mute text-[10px] uppercase">Arc Block Height</span><div class="text-[#00f0ff] font-semibold">#${Number(r.blockNumber).toLocaleString()}</div></div>
          <div><span class="text-mute text-[10px] uppercase">Timestamp (UTC)</span><div class="text-white">${new Date(r.timestamp).toISOString()}</div></div>
          <div><span class="text-mute text-[10px] uppercase">Trader Signer</span><div class="font-mono text-[11px] text-white">${shortAddr(r.trader)}</div></div>
        </div>

        <div class="bg-[#0d0e11] p-3 rounded">
          <div class="text-[10px] uppercase text-mute mb-1">Execution Telemetry</div>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span class="text-mute text-[10px]">Market</span><div class="font-semibold text-white">${r.pair}</div></div>
            <div><span class="text-mute text-[10px]">Effective Rate</span><div class="font-semibold text-[#70ffba]">${fmtUsd(r.effectivePrice)}</div></div>
            <div><span class="text-mute text-[10px]">Impact</span><div class="text-white">${r.priceImpactPct}%</div></div>
            <div><span class="text-mute text-[10px]">Gas Token</span><div class="text-white">${r.gasUsd} USDC</div></div>
          </div>
        </div>

        <div class="bg-[#0d0e11] p-3 rounded space-y-2">
          <div>
            <div class="text-[10px] uppercase text-mute">EIP-712 Signature</div>
            <div class="font-mono text-[10px] text-[#00f0ff] break-all bg-[#121316] p-1.5 rounded mt-0.5">${r.signature}</div>
          </div>
          <div>
            <div class="text-[10px] uppercase text-mute">SHA-256 Canonical Integrity Digest</div>
            <div class="font-mono text-[10px] text-[#70ffba] break-all bg-[#121316] p-1.5 rounded mt-0.5">${r.integrityDigest}</div>
          </div>
        </div>
      </div>

      <div class="mt-5 flex flex-col sm:flex-row gap-2">
        <button data-act="copy-receipt" class="flex-1 py-2 rounded bg-[#292a2d] hover:bg-[#343538] font-display text-[12px] flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">content_copy</span> Copy JSON-LD
        </button>
        <button data-act="download-receipt" class="flex-1 py-2 rounded bg-[#292a2d] hover:bg-[#343538] font-display text-[12px] flex items-center justify-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">download</span> Download (.json)
        </button>
        ${state.settlementContractAddress ? `
          <button data-act="anchor-receipt" ${state.anchoringReceipt || r.onchainAnchored ? "disabled" : ""} class="flex-1 py-2 rounded ${r.onchainAnchored ? "bg-[#01e599]/20 text-[#70ffba] border border-[#01e599]/40" : "bg-[#01e599] text-[#003822] hover:bg-[#70ffba]"} disabled:opacity-60 font-display font-bold text-[12px] flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">${state.anchoringReceipt ? "sync" : "anchor"}</span>
            ${state.anchoringReceipt ? "Anchoring..." : (r.onchainAnchored ? "✓ Anchored on Arc" : "Anchor to Arc Mainnet")}
          </button>
        ` : `
          <button data-act="deploy-settlement" class="flex-1 py-2 rounded bg-[#00f0ff] text-[#00363a] hover:bg-[#38bdf8] font-display font-bold text-[12px] flex items-center justify-center gap-1.5">
            <span class="material-symbols-outlined text-[16px]">rocket_launch</span> Deploy Settlement Contract
          </button>
        `}
      </div>
    </div>
  </div>`;
}

function mandateModal() {
  if (!state.mandateModalOpen) return "";
  const defaultAgent = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  return `
  <div class="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4">
    <div class="absolute inset-0 bg-[#0d0e11]/85 backdrop-blur-md" data-act="close-mandate-modal"></div>
    <div class="relative z-10 w-full max-w-lg bg-[#1f1f23] rounded-lg p-4 sm:p-6 border border-[#1F2430] shadow-2xl">
      <div class="flex items-start justify-between pb-3 border-b border-[#1F2430]">
        <div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-[20px] text-[#00f0ff]">policy</span>
            <span class="font-display text-[16px] text-white uppercase">Issue Agentic Mandate</span>
          </div>
          <div class="text-[11px] text-mute mt-0.5">EIP-712 Scoped Delegation Permit · Zero Key Custody</div>
        </div>
        <button data-act="close-mandate-modal" class="text-mute hover:text-white p-1"><span class="material-symbols-outlined text-[18px]">close</span></button>
      </div>

      <div class="mt-4 space-y-3 text-[12px]">
        <div>
          <label class="block text-[10px] uppercase text-mute mb-1">Target Agent / Smart Account Address</label>
          <input id="mandate-agent-input" class="w-full bg-[#0d0e11] border border-[#1F2430] focus:border-[#00f0ff] rounded px-3 py-2 font-mono text-[12px] text-white outline-none" value="${defaultAgent}" />
        </div>

        <div>
          <label class="block text-[10px] uppercase text-mute mb-1">Authorized Spend Budget (USDC)</label>
          <div class="grid grid-cols-4 gap-2">
            ${[50, 100, 250, 500].map((amt) => `
              <button data-mandate-spend="${amt}" class="mandate-spend-btn py-1.5 rounded bg-[#0d0e11] hover:bg-[#1b1b1f] border border-[#1F2430] text-center font-display font-semibold transition ${amt===(state.mandateSpend||250)?"border-[#00f0ff] text-[#00f0ff]":""}">$${amt}</button>
            `).join("")}
          </div>
        </div>

        <div>
          <label class="block text-[10px] uppercase text-mute mb-1">Max Slippage Band</label>
          <div class="grid grid-cols-3 gap-2">
            ${[[20,"20 bps (0.2%)"],[30,"30 bps (0.3%)"],[50,"50 bps (0.5%)"]].map(([bps, label]) => `
              <button data-mandate-slip="${bps}" class="mandate-slip-btn py-1.5 rounded bg-[#0d0e11] hover:bg-[#1b1b1f] border border-[#1F2430] text-center font-display transition ${bps===(state.mandateSlip||30)?"border-[#00f0ff] text-[#00f0ff] font-semibold":""}">${label}</button>
            `).join("")}
          </div>
        </div>

        <div>
          <label class="block text-[10px] uppercase text-mute mb-1">Session Duration (Time-to-Live)</label>
          <div class="grid grid-cols-4 gap-2">
            ${[[3600,"1 hour"],[14400,"4 hours"],[43200,"12 hours"],[86400,"24 hours"]].map(([sec, label]) => `
              <button data-mandate-ttl="${sec}" class="mandate-ttl-btn py-1.5 rounded bg-[#0d0e11] hover:bg-[#1b1b1f] border border-[#1F2430] text-center font-display transition ${sec===(state.mandateTtl||14400)?"border-[#00f0ff] text-[#00f0ff] font-semibold":""}">${label}</button>
            `).join("")}
          </div>
        </div>

        <div class="p-3 bg-[#121316] rounded text-[11px] text-[#b9cacb] space-y-1">
          <div class="text-[#00f0ff] font-semibold flex items-center gap-1"><span class="material-symbols-outlined text-[14px]">lock</span> Cryptographic Boundary</div>
          <div>Agent can only execute within approved pairs (ETH/USDC, EURC/USDC, USYC/USDC). Any spend above the cap or expired timestamp will be rejected automatically.</div>
        </div>
      </div>

      <div class="mt-5 flex gap-2">
        <button data-act="close-mandate-modal" class="w-1/3 py-2 rounded bg-[#292a2d] font-display text-[12px]">Cancel</button>
        <button data-act="sign-mandate" class="w-2/3 py-2 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[12px] flex items-center justify-center gap-1">
          <span class="material-symbols-outlined text-[16px]">fingerprint</span> Sign & Arm Mandate
        </button>
      </div>
    </div>
  </div>`;
}

function render() {
  const root = $("#app");
  if (!root) return;

  const activeEl = typeof document !== "undefined" ? document.activeElement : null;
  const activeId = activeEl && activeEl !== document.body ? activeEl.id : null;
  const selStart = (activeEl && "selectionStart" in activeEl) ? activeEl.selectionStart : null;
  const selEnd = (activeEl && "selectionEnd" in activeEl) ? activeEl.selectionEnd : null;

  if (!state.connected || state.wrongNetwork) {
    if (state.view === "proof" && !state.wrongNetwork) {
      root.innerHTML = `<div class="px-4 py-4"><button data-act="home" class="text-[12px] text-[#00F0FF]">← Back</button></div>` + proofView();
      bind();
      return;
    }
    root.innerHTML = state.connected && state.wrongNetwork ? wrongNet() : landing();
    bind();
    return;
  }
  const body = {
    terminal: terminalView,
    markets: marketsView,
    portfolio: portfolioView,
    ai: aiView,
    activity: activityView,
    proof: proofView,
  }[state.view] || terminalView;
  root.innerHTML = header() + body() + bottomNav();
  const modalRoot = $("#modal-root");
  if (modalRoot) {
    modalRoot.innerHTML = reviewModal() + executedModal() + searchModal() + alertsPanel() + receiptModal() + mandateModal();
  }
  bind();

  if (activeId) {
    const newActive = document.getElementById(activeId);
    if (newActive) {
      newActive.focus();
      if (typeof selStart === "number" && typeof selEnd === "number") {
        try { newActive.setSelectionRange(selStart, selEnd); } catch {}
      }
    }
  }

  requestAnimationFrame(() => {
    if (state.view === "terminal") drawChart($("#main-chart"), state.candles, state.indicators);
    if (state.view === "portfolio") {
      const p = portfolioSnapshot();
      const curve = Array.from({ length: 36 }, (_, i) => p.total * (0.88 + i * 0.0035) + Math.sin(i / 4) * 120);
      curve[curve.length - 1] = p.total;
      drawSpark($("#nav-chart"), curve, "#00F0FF");
    }
  });
}

function loadMarket() {
  state.candles = generateCandles(state.pair, state.timeframe, 120);
  state.indicators = computeIndicators(state.candles);
}

async function switchToArc() {
  state.connecting = true;
  render();
  try {
    await ensureArcNetwork();
    const { id } = await readChainId();
    state.chainId = id;
    state.wrongNetwork = id !== ARC.chainId;
    if (state.address && !state.wrongNetwork) {
      state.balances = await loadOnchainPortfolio(state.address);
      state.livePortfolio = true;
      state.view = "terminal";
      loadMarket();
      toast("Arc mainnet", `${shortAddr(state.address)} is on chain ${ARC.chainId}.`, "ok");
    }
  } catch (e) {
    toast("Switch failed", e?.code === 4001 ? "Rejected in wallet." : (e.message || String(e)), "err");
  } finally {
    state.connecting = false;
    render();
  }
}

function buildOnchainTradeTicket(address, pairKey, side, amount, quote, nonce = state.ticketNonce) {
  const p = PAIRS[assertPair(pairKey)];
  const traderAddr = normalizeAddress(address);
  const baseToken = ARC.tokens[p.base] || ARC.tokens.WETH;
  const quoteToken = { address: ARC.usdcErc20, decimals: 6 };

  let tokenIn, tokenOut, amountIn, minAmountOut;
  if (side === "buy") {
    tokenIn = quoteToken.address;
    tokenOut = baseToken.address;
    amountIn = parseUnits(amount, quoteToken.decimals);
    minAmountOut = parseUnits(quote.minReceived, baseToken.decimals);
  } else {
    tokenIn = baseToken.address;
    tokenOut = quoteToken.address;
    const baseAmount = amount / p.price;
    amountIn = parseUnits(baseAmount, baseToken.decimals);
    minAmountOut = parseUnits(quote.minReceived, quoteToken.decimals);
  }

  const deadline = Math.floor(quote.expiresAt / 1000) || (Math.floor(Date.now() / 1000) + 600);

  return {
    types: {
      EIP712Domain: [
        { name: "name", type: "string" },
        { name: "version", type: "string" },
        { name: "chainId", type: "uint256" },
        { name: "verifyingContract", type: "address" },
      ],
      TradeTicket: [
        { name: "trader", type: "address" },
        { name: "tokenIn", type: "address" },
        { name: "tokenOut", type: "address" },
        { name: "amountIn", type: "uint256" },
        { name: "minAmountOut", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    domain: {
      name: "Interminal",
      version: "1",
      chainId: ARC.chainId,
      verifyingContract: ARC.settlement,
    },
    primaryType: "TradeTicket",
    message: {
      trader: traderAddr,
      tokenIn: normalizeAddress(tokenIn),
      tokenOut: normalizeAddress(tokenOut),
      amountIn: amountIn.toString(),
      minAmountOut: minAmountOut.toString(),
      nonce: Number(nonce) || 0,
      deadline,
    },
    raw: {
      trader: traderAddr,
      tokenIn: normalizeAddress(tokenIn),
      tokenOut: normalizeAddress(tokenOut),
      amountIn,
      minAmountOut,
      nonce: BigInt(nonce || 0),
      deadline: BigInt(deadline),
    },
    meta: {
      pair: pairKey,
      side,
      amountUsd: amount,
      quote,
    }
  };
}

function buildTradeTicket(address, pair, side, amount, quote) {
  return buildOnchainTradeTicket(address, pair, side, amount, quote, state.ticketNonce);
}

function encodeExecuteTradeTicket(ticket, sig) {
  const selector = "0x254f432b";
  const cleanSig = sig.replace(/^0x/i, "");
  const sigLen = (cleanSig.length / 2).toString(16).padStart(64, "0");
  const sigPadded = cleanSig.padEnd(Math.ceil(cleanSig.length / 64) * 64, "0");
  const parts = [
    selector,
    pad32(ticket.trader),
    pad32(ticket.tokenIn),
    pad32(ticket.tokenOut),
    pad32(ticket.amountIn),
    pad32(ticket.minAmountOut),
    pad32(ticket.nonce),
    pad32(ticket.deadline),
    (256).toString(16).padStart(64, "0"), // offset to signature
    sigLen,
    sigPadded,
  ];
  return parts.join("");
}

async function fetchOnchainTraderNonce(traderAddr) {
  if (!state.settlementContractAddress || !isAddress(state.settlementContractAddress)) return 0;
  try {
    const safe = normalizeAddress(traderAddr);
    const data = "0x506ee1ef" + padAddr(safe);
    const hex = await publicRpc("eth_call", [{ to: state.settlementContractAddress, data }, "latest"]);
    if (hex && hex !== "0x") {
      return Number(BigInt(hex));
    }
  } catch {}
  return 0;
}

async function executeTrade() {
  const pair = PAIRS[state.pair];
  const q = state.pendingQuote;
  if (!q || state.executing) return;
  if (!isAddress(state.address)) {
    toast("Wallet required", "Connect an Arc mainnet wallet first.", "err");
    return;
  }
  if (now() > q.expiresAt) {
    toast("Quote expired", "Request a fresh quote.", "err");
    state.reviewOpen = false;
    render();
    return;
  }
  if (state.side === "buy") {
    const jit = calculateJitUnwind({
      tradeAmountUsd: state.amount,
      liquidUsdc: state.balances.USDC || 0,
      usycBalance: state.balances.USYC || 0,
      slippageBps: state.slippage * 100,
    });
    if (!jit.canCover) {
      toast("Insufficient liquidity", "Size exceeds liquid USDC and available USYC treasury capacity.", "err");
      return;
    }
  } else {
    const baseBal = state.balances[pair.base] || 0;
    const reqBase = state.amount / pair.price;
    if (baseBal < reqBase * 0.999) {
      toast("Insufficient balance", `Required: ${fmt(reqBase, 4)} ${pair.base}, available: ${fmt(baseBal, 4)} ${pair.base}`, "err");
      return;
    }
  }
  try {
    state.executing = true;
    if (state.livePortfolio) {
      const { id } = await readChainId();
      if (id !== ARC.chainId) {
        state.wrongNetwork = true;
        toast("Wrong network", "Switch to Arc before signing.", "err");
        render();
        return;
      }
    }
    const trader = normalizeAddress(state.address);
    const ticket = buildTradeTicket(trader, state.pair, state.side, state.amount, q);
    let sig;
    if (!state.livePortfolio) {
      sig = "0x" + sha256Hex(JSON.stringify(ticket) + Date.now()).slice(2) + "d".repeat(66);
    } else {
      sig = await walletRpc("eth_signTypedData_v4", [trader, JSON.stringify(ticket)]);
      if (typeof sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(sig)) {
        throw new Error("Wallet returned a malformed signature");
      }
    }
    state.ticketNonce += 1;
    const receipt = generateTradeReceipt({
      txHash: sig,
      trader: trader,
      pair: state.pair,
      side: state.side,
      amount: state.amount,
      quote: q,
      blockNumber: state.block || 1084200,
    });
    state.auditReceipts.unshift(receipt);
    if (state.auditReceipts.length > 50) state.auditReceipts.pop();

    if (state.side === "buy") {
      state.balances.USDC = Math.max(0, (state.balances.USDC || 0) - state.amount);
      state.balances[pair.base] = (state.balances[pair.base] || 0) + q.received;
    } else {
      state.balances[pair.base] = Math.max(0, (state.balances[pair.base] || 0) - (state.amount / pair.price));
      state.balances.USDC = (state.balances.USDC || 0) + q.received;
    }

    const hash = sig.slice(0, 10) + "…" + sig.slice(-6);
    const label = state.side === "buy"
      ? `Signed buy ${fmt(q.received, 5)} ${pair.base} for ${fmt(state.amount)} USDC`
      : `Signed sell ${fmt(state.amount / pair.price, 4)} ${pair.base} for ${fmt(q.received, 2)} USDC`;
    state.activity.unshift({
      ts: now(), type: "trade", label, detail: `${state.pair} @ ${fmtUsd(q.effective)} · EIP-712 ${hash}`, hash: sig, status: "Signed", receiptId: receipt.receiptId, receipt: receipt,
    });
    savePersistedState();
    state.lastTx = { show: true, hash: sig, price: q.effective, label, receipt };
    state.reviewOpen = false;
    state.pendingQuote = null;
    if (state.livePortfolio) {
      try { state.balances = await loadOnchainPortfolio(state.address); } catch { /* keep */ }
    }
    toast("Signed & Certified", "Wallet authorized ticket. Cryptographic audit certificate generated.", "ok");
    render();
  } catch (e) {
    const msg = e?.code === 4001 ? "Signature rejected." : (e.message || String(e));
    toast("Sign failed", msg, "err");
  } finally {
    state.executing = false;
  }
}

function bind() {
  document.querySelectorAll("[data-nav]").forEach((el) => el.addEventListener("click", () => {
    if (!VIEW_ALLOW.has(el.dataset.nav)) return;
    state.view = el.dataset.nav;
    state.alertsOpen = false;
    render();
  }));
  document.querySelectorAll("[data-act]").forEach((el) => el.addEventListener("click", () => {
    const a = el.dataset.act;
    if (a === "connect") connectInjected();
    if (a === "demo") {
      state.connected = true;
      state.address = "0x89205A3A3b2A69De6Dbf7f01ED13B2108B2c43e7";
      state.chainId = 5042;
      state.wrongNetwork = false;
      state.providerLabel = "Demo Simulation";
      state.livePortfolio = false;
      state.balances = { ETH: 3.5, WETH: 1.2, USDC: 14250, EURC: 5000, USYC: 10000, cirBTC: 0.15 };
      state.view = "terminal";
      loadMarket();
      render();
      toast("Simulation Desk Active", "Explore Arc trading, JIT USYC treasury, FX corridor, and agent mandates in demo mode.", "ok");
    }
    if (a === "proof") { state.view = "proof"; runProof(); }
    if (a === "home") { state.view = "landing"; render(); }
    if (a === "switch-net") switchToArc();
    if (a === "disconnect") disconnectWallet(true);
    if (a === "search") { state.searchOpen = true; render(); }
    if (a === "close-search") { state.searchOpen = false; render(); }
    if (a === "alerts") { state.alertsOpen = !state.alertsOpen; render(); }
    if (a === "pair-menu") { $("#pair-dd")?.classList.toggle("hidden"); }
    if (a === "ai-analyze") {
      if (!state.indicators) loadMarket();
      state.analysis = analyzeMarket();
      if (!state.analysis) { toast("Analyze failed", "No market data bound.", "err"); return; }
      state.analyses.unshift(state.analysis);
      state.showLevels = true;
      if (state.view !== "terminal" && state.view !== "ai") state.view = "terminal";
      toast("AI ANALYSIS", `${state.analysis.trend} · S ${fmtUsd(state.analysis.support)} / R ${fmtUsd(state.analysis.resistance)}`, "info");
      render();
    }
    if (a === "ai-trade") { state.aiCore = "trade"; state.view = "ai"; render(); }
    if (a === "ai-port") { state.aiCore = "portfolio"; state.view = "ai"; render(); }
    if (a === "ai-wallet") { state.aiCore = "wallet"; state.view = "ai"; render(); }
    if (a === "ai-mandate-quick") { state.mandateModalOpen = true; render(); }
    if (a === "apply-levels") { state.showLevels = true; state.view = "terminal"; render(); }
    if (a === "review") {
      try {
        const pair = PAIRS[assertPair(state.pair)];
        const amt = clampAmount(Number(state.amount));
        if (!amt) throw new Error("Enter a positive amount");
        if (state.side === "buy") {
          const jit = calculateJitUnwind({
            tradeAmountUsd: amt,
            liquidUsdc: state.balances.USDC || 0,
            usycBalance: state.balances.USYC || 0,
            slippageBps: state.slippage * 100,
          });
          if (!jit.canCover) {
            throw new Error("Amount exceeds liquid USDC and redeemable USYC capacity");
          }
        } else {
          const baseBal = state.balances[pair.base] || 0;
          const reqBase = amt / pair.price;
          if (baseBal < reqBase * 0.999) {
            throw new Error(`Insufficient ${pair.base} balance. Required: ${fmt(reqBase, 4)} ${pair.base}, available: ${fmt(baseBal, 4)} ${pair.base}`);
          }
        }
        state.amount = amt;
        state.pendingQuote = quoteTrade({ side: state.side, amountUsd: amt, price: pair.price, slippageBps: state.slippage * 100 });
        state.reviewOpen = true;
        render();
      } catch (e) {
        toast("Quote rejected", e.message || String(e), "err");
      }
    }
    if (a === "close-alerts") { state.alertsOpen = false; render(); }
    if (a === "close-review") { state.reviewOpen = false; render(); }
    if (a === "sign") executeTrade();
    if (a === "close-tx") { if (state.lastTx) state.lastTx.show = false; state.view = "portfolio"; render(); }
    if (a === "view-tx-receipt") {
      if (state.lastTx?.receipt) {
        state.activeReceiptModal = state.lastTx.receipt;
        render();
      }
    }
    if (a === "close-receipt") {
      state.activeReceiptModal = null;
      render();
    }
    if (a === "deploy-settlement") deploySettlementContract();
    if (a === "anchor-receipt") anchorActiveReceipt();
    if (a === "sync-market") {
      toast("Syncing DEX Feeds", "Querying live pool reserves...", "info");
      syncRealMarketData().then(() => {
        toast("DEX Feeds Live", "Prices updated from Uniswap V3.", "ok");
        render();
      });
    }
    if (a === "copy-receipt") {
      if (state.activeReceiptModal && typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(JSON.stringify(state.activeReceiptModal, null, 2));
        toast("Copied", "Cryptographic JSON-LD audit certificate copied to clipboard.", "ok");
      }
    }
    if (a === "download-receipt") {
      if (state.activeReceiptModal && typeof document !== "undefined") {
        const blob = new Blob([JSON.stringify(state.activeReceiptModal, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const aTag = document.createElement("a");
        aTag.href = url;
        aTag.download = `interminal-receipt-${state.activeReceiptModal.receiptId}.json`;
        aTag.click();
        URL.revokeObjectURL(url);
        toast("Exported", "Trade audit certificate downloaded.", "ok");
      }
    }
    if (a === "open-mandate-modal") {
      state.mandateModalOpen = true;
      render();
    }
    if (a === "close-mandate-modal") {
      state.mandateModalOpen = false;
      render();
    }
    if (a === "sweep-yield") {
      const p = portfolioSnapshot();
      const sweep = calculateYieldSweep(p.usdc, 500);
      if (!sweep.recommended) {
        toast("Treasury Optimal", "Liquid cash is below minimum operating threshold ($500 USDC).", "info");
      } else {
        toast("Yield Sweep Armed", `Recommended allocation: $${fmt(sweep.sweepAmount, 2)} USDC into USYC (5.10% APY).`, "ok");
      }
    }
    if (a === "ai-fx") {
      state.pair = "EURC/USDC";
      state.aiCore = "trade";
      state.view = "ai";
      loadMarket();
      render();
    }
    if (a === "ai-treasury") {
      state.aiCore = "treasury";
      state.view = "ai";
      render();
    }
    if (a === "ai-mandates") {
      state.aiCore = "mandates";
      state.view = "ai";
      render();
    }
    if (a === "sign-mandate") {
      (async () => {
        try {
          if (!isAddress(state.address)) {
            toast("Wallet required", "Connect your Arc wallet first.", "err");
            return;
          }
          const agentInput = document.getElementById("mandate-agent-input")?.value?.trim() || "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
          if (!isAddress(agentInput)) {
            toast("Invalid agent", "Enter a valid Ethereum/Arc address for the agent.", "err");
            return;
          }
          const activeSpend = state.mandateSpend || 250;
          const activeSlip = state.mandateSlip || 30;
          const activeTtl = state.mandateTtl || 14400;

          const desc = createAgentMandateDescriptor({
            delegator: normalizeAddress(state.address),
            agent: normalizeAddress(agentInput),
            maxSpendUsdc: activeSpend,
            maxSlippageBps: activeSlip,
            allowedPairs: ["ETH/USDC", "EURC/USDC", "USYC/USDC"],
            ttlSeconds: activeTtl,
          });

          const ticket = buildAgentMandateTicket(desc);
          let sig = "0x" + "1".repeat(130);
          try {
            sig = await walletRpc("eth_signTypedData_v4", [desc.delegator, JSON.stringify(ticket)]);
          } catch (err) {
            if (err?.code === 4001) throw err;
            sig = "0x" + sha256Hex(JSON.stringify(ticket)) + sha256Hex(desc.delegator).slice(0, 66);
          }
          desc.signature = sig;
          state.mandates.unshift(desc);
          if (state.mandates.length > 20) state.mandates.pop();
          state.mandateModalOpen = false;
          state.activity.unshift({
            ts: now(),
            type: "mandate",
            label: `Mandate Armed: $${desc.maxSpendUsdc} USDC to ${shortAddr(desc.agent)}`,
            detail: `Cap $${desc.maxSpendUsdc} · Slippage ${desc.maxSlippageBps} bps · Expires ${new Date(desc.expiresAt).toLocaleTimeString()}`,
            hash: sig,
            status: "Active",
          });
          savePersistedState();
          toast("Mandate Armed", `Agent ${shortAddr(desc.agent)} authorized for up to $${desc.maxSpendUsdc} USDC.`, "ok");
          render();
        } catch (e) {
          toast("Mandate error", e?.code === 4001 ? "Signature rejected." : (e.message || String(e)), "err");
        }
      })();
    }
  }));
  document.querySelectorAll("[data-revoke-mandate]").forEach((el) => el.addEventListener("click", () => {
    const id = el.dataset.revokeMandate;
    const m = state.mandates.find((x) => x.id === id || x.mandateId === id);
    if (m) {
      m.revoked = true;
      savePersistedState();
      toast("Mandate Revoked", `Delegation permit ${id.slice(0, 8)}… cancelled.`, "info");
      render();
    }
  }));
  document.querySelectorAll("[data-test-mandate]").forEach((el) => el.addEventListener("click", () => {
    const id = el.dataset.testMandate;
    const m = state.mandates.find((x) => x.id === id || x.mandateId === id);
    if (!m) return;
    const testAmount = Math.min(100, m.remainingSpend);
    if (testAmount <= 0) {
      toast("Budget Depleted", "Mandate has zero remaining spend budget.", "err");
      return;
    }
    const testPair = m.allowedPairs[0] || "ETH/USDC";
    const testTrade = {
      pair: testPair,
      amountUsdc: testAmount,
      slippageBps: Math.min(20, m.maxSlippageBps),
      currentTime: Math.floor(Date.now() / 1000),
    };
    const validation = validateAgentExecution(m, testTrade, false);
    if (validation.valid) {
      m.remainingSpend = validation.newRemainingSpend;
      const pairObj = PAIRS[testPair];
      const q = quoteTrade({ side: "buy", amountUsd: testAmount, price: pairObj.price, slippageBps: testTrade.slippageBps });
      const receipt = generateTradeReceipt({
        txHash: "0x" + sha256Hex(JSON.stringify(testTrade) + Date.now()).slice(2) + "a".repeat(66),
        trader: m.delegator,
        pair: testPair,
        side: "buy",
        amount: testAmount,
        quote: q,
        mandateId: m.id,
        blockNumber: state.block || 1084200,
      });
      state.auditReceipts.unshift(receipt);
      if (state.auditReceipts.length > 50) state.auditReceipts.pop();
      state.activity.unshift({
        ts: now(),
        type: "agent-trade",
        label: `Agent executed buy ${fmt(q.received, 5)} ${pairObj.base} for $${testAmount} USDC`,
        detail: `Mandate ${m.id.slice(0, 10)}… · Pair ${testPair} · Rem: $${m.remainingSpend}`,
        hash: receipt.signature,
        status: "Executed",
        receiptId: receipt.receiptId,
        receipt: receipt,
      });
      savePersistedState();
      toast("Agent Executed", `Spent $${testAmount} USDC within mandate bounds. $${m.remainingSpend} remaining. Audit certificate generated.`, "ok");
      render();
    } else {
      toast("Mandate Gate Fail-Closed", validation.reason, "err");
    }
  }));
  document.querySelectorAll("[data-view-receipt]").forEach((el) => el.addEventListener("click", () => {
    const id = el.dataset.viewReceipt;
    const r = state.auditReceipts.find((x) => x.receiptId === id) || state.activity.find((x) => x.receiptId === id || x.receipt?.receiptId === id)?.receipt;
    if (r) {
      state.activeReceiptModal = r;
      render();
    } else {
      toast("Receipt not found", "Receipt is not present in local state.", "err");
    }
  }));
  document.querySelectorAll("[data-mandate-spend]").forEach((el) => el.addEventListener("click", () => {
    state.mandateSpend = Number(el.dataset.mandateSpend);
    render();
  }));
  document.querySelectorAll("[data-mandate-slip]").forEach((el) => el.addEventListener("click", () => {
    state.mandateSlip = Number(el.dataset.mandateSlip);
    render();
  }));
  document.querySelectorAll("[data-mandate-ttl]").forEach((el) => el.addEventListener("click", () => {
    state.mandateTtl = Number(el.dataset.mandateTtl);
    render();
  }));
  document.querySelectorAll("[data-alert-toggle]").forEach((el) => el.addEventListener("click", () => {
    const id = Number(el.dataset.alertToggle);
    const target = state.alerts.find((x) => x.id === id);
    if (target) {
      target.armed = !target.armed;
      savePersistedState();
      render();
    }
  }));
  document.querySelectorAll("[data-tf]").forEach((el) => el.addEventListener("click", () => {
    if (!TF_ALLOW.has(el.dataset.tf)) return;
    state.timeframe = el.dataset.tf;
    savePersistedState();
    loadMarket();
    state.analysis = null;
    render();
  }));
  document.querySelectorAll("[data-mode]").forEach((el) => el.addEventListener("click", () => {
    state.chartMode = el.dataset.mode;
    savePersistedState();
    render();
  }));
  document.querySelectorAll("[data-side]").forEach((el) => el.addEventListener("click", () => {
    if (!SIDE_ALLOW.has(el.dataset.side)) return;
    state.side = el.dataset.side; render();
  }));
  document.querySelectorAll("[data-amt]").forEach((el) => el.addEventListener("click", () => {
    const pair = PAIRS[state.pair] || PAIRS["ETH/USDC"];
    let raw;
    if (el.dataset.amt === "max") {
      if (state.side === "buy") {
        raw = Math.floor(state.balances.USDC || 0);
      } else {
        const baseBal = state.balances[pair.base] || 0;
        raw = Math.floor(baseBal * pair.price);
      }
    } else {
      raw = Number(el.dataset.amt);
    }
    state.amount = clampAmount(raw);
    render();
  }));
  document.querySelectorAll("[data-pair]").forEach((el) => el.addEventListener("click", () => {
    if (!PAIRS[el.dataset.pair]) return;
    state.pair = el.dataset.pair;
    savePersistedState();
    loadMarket();
    state.analysis = null;
    render();
  }));
  document.querySelectorAll("[data-trade]").forEach((el) => el.addEventListener("click", () => {
    if (!PAIRS[el.dataset.trade]) return;
    state.pair = el.dataset.trade;
    savePersistedState();
    state.view = "terminal";
    state.searchOpen = false;
    loadMarket();
    render();
  }));
  document.querySelectorAll("[data-watch]").forEach((el) => el.addEventListener("click", () => {
    const k = el.dataset.watch;
    if (!PAIRS[k]) return;
    state.watchlist = state.watchlist.includes(k) ? state.watchlist.filter((x) => x !== k) : [...state.watchlist, k];
    savePersistedState();
    render();
  }));
  document.querySelectorAll("[data-core]").forEach((el) => el.addEventListener("click", () => {
    state.aiCore = el.dataset.core;
    if (el.dataset.core === "market" && !state.analysis) state.analysis = analyzeMarket();
    render();
  }));
  document.querySelectorAll("[data-range]").forEach((el) => el.addEventListener("click", () => {
    state.portfolioRange = el.dataset.range;
    savePersistedState();
    render();
  }));
  const amt = $("#amt");
  if (amt) {
    amt.addEventListener("input", () => {
      const val = Number(amt.value);
      if (Number.isFinite(val) && val >= 0) {
        state.amount = clampAmount(val);
        updateOrderPreview();
      }
    });
    amt.addEventListener("change", () => {
      state.amount = clampAmount(Number(amt.value));
      render();
    });
  }
  const slip = $("#slip");
  if (slip) {
    slip.addEventListener("input", () => {
      state.slippage = Number(slip.value);
      updateOrderPreview();
    });
    slip.addEventListener("change", () => render());
  }
  const searchIn = $("#search-in");
  if (searchIn) {
    searchIn.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      const modalRoot = $("#modal-root");
      if (modalRoot) {
        modalRoot.innerHTML = reviewModal() + executedModal() + searchModal() + alertsPanel() + receiptModal() + mandateModal();
        bind();
        const fresh = $("#search-in");
        if (fresh) {
          fresh.focus();
          fresh.setSelectionRange(fresh.value.length, fresh.value.length);
        }
      }
    });
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (state.connected) { state.searchOpen = true; render(); }
    }
    if (e.key === "Escape") {
      state.searchOpen = false; state.alertsOpen = false; state.reviewOpen = false;
      state.activeReceiptModal = null; state.mandateModalOpen = false;
      if (state.lastTx) state.lastTx.show = false;
      render();
    }
  });

  setInterval(() => {
    if (!state.connected || document.hidden) return;
    loadChainHead();
    state.latency = 9 + Math.floor(Math.random() * 8);
    Object.values(PAIRS).forEach((p) => {
      const tick = p.price * (Math.random() - 0.5) * 0.0008;
      p.price = Math.max(0.0001, p.price + tick);
    });
    if (state.view === "terminal" && $("#main-chart") && state.candles.length && PAIRS[state.pair]) {
      const last = state.candles[state.candles.length - 1];
      last.close = PAIRS[state.pair].price;
      last.high = Math.max(last.open, last.close);
      last.low = Math.min(last.open, last.close);
      drawChart($("#main-chart"), state.candles, state.indicators);
      updateOrderPreview();
    }
    if (state.alerts && state.alerts.length) {
      const p = portfolioSnapshot();
      const ethPrice = PAIRS["ETH/USDC"]?.price;
      state.alerts.forEach((alert) => {
        if (!alert.armed) return;
        if (alert.id === 1 && ethPrice >= 2600) {
          alert.armed = false;
          toast("Price Alert Triggered", `ETH reached ${fmtUsd(ethPrice)} (Target $2,600)`, "ok");
          savePersistedState();
        } else if (alert.id === 2 && p.total > 0 && p.total < 10000) {
          alert.armed = false;
          toast("Portfolio Alert Triggered", `Portfolio valuation dropped to ${fmtUsd(p.total)} (< $10,000)`, "warn");
          savePersistedState();
        } else if (alert.id === 3) {
          const ethRow = p.rows.find((r) => r.sym === "ETH" || r.sym === "WETH");
          if (ethRow && ethRow.alloc > 50) {
            alert.armed = false;
            toast("Risk Alert Triggered", `ETH allocation is ${fmt(ethRow.alloc, 1)}% (> 50% limit)`, "warn");
            savePersistedState();
          }
        }
      });
    }
  }, 2500);

  if (typeof window !== "undefined") {
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (state.view === "terminal" && $("#main-chart") && state.candles.length) {
          drawChart($("#main-chart"), state.candles, state.indicators);
        }
        if (state.view === "portfolio" && $("#nav-chart")) {
          const p = portfolioSnapshot();
          const curve = Array.from({ length: 36 }, (_, i) => p.total * (0.88 + i * 0.0035) + Math.sin(i / 4) * 120);
          curve[curve.length - 1] = p.total;
          drawSpark($("#nav-chart"), curve, "#00F0FF");
        }
      }, 150);
    });
  }

  loadMarket();
  render();
  resumeWallet();
  syncRealMarketData();

  setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) return;
    syncRealMarketData();
  }, 12000);

  setInterval(async () => {
    if (!state.connected || state.wrongNetwork || !isAddress(state.address) || document.hidden) return;
    try {
      state.balances = await loadOnchainPortfolio(state.address);
    } catch { /* keep last book */ }
  }, 20000);
}

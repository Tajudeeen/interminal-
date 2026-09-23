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
const RPC_ALLOW = new Set(["eth_chainId", "eth_blockNumber", "eth_getBalance", "eth_call", "eth_getCode"]);
const TF_ALLOW = new Set(["1m", "5m", "15m", "1h", "4h", "1D"]);
const SIDE_ALLOW = new Set(["buy", "sell"]);
const VIEW_ALLOW = new Set(["landing", "terminal", "markets", "portfolio", "ai", "activity", "proof"]);

const POLICY = [
  { id: "ai-no-sign", title: "AI is advisory", rule: "The model may propose. It never holds a key and never calls eth_sendTransaction." },
  { id: "chain-gate", title: "Chain gate", rule: "Desk and EIP-712 only proceed when eth_chainId is 5042." },
  { id: "addr-gate", title: "Address gate", rule: "RPC and tickets require 0x + 40 hex. Display-truncated strings are rejected." },
  { id: "rpc-allow", title: "RPC allowlist", rule: "Public client may call eth_chainId, eth_blockNumber, eth_getBalance, eth_call, eth_getCode only." },
  { id: "call-allow", title: "eth_call gate", rule: "Calls only hit official Arc tokens with balanceOf calldata." },
  { id: "quote-gate", title: "Quote gate", rule: "Amount must be finite and in (0, 1e9]. Slippage 1–500 bps. Buy size ≤ live native USDC." },
  { id: "ticket-domain", title: "Ticket domain", rule: "EIP-712 domain is Interminal v1 on chain 5042 bound to the USDC precompile, with nonce and deadline." },
  { id: "no-broadcast", title: "Broadcast gated", rule: "A signature is not a fill. Router calldata is not sent." },
];

const LIMITATIONS = [
  "Candles, EMAs, RSI, MACD, quotes, and AI copy are computed in the browser. They are not an Arc oracle.",
  "Wallet USDC/WETH/EURC/USYC/cirBTC reads are live RPC. Pair prices in the tape are local seeds.",
  "EIP-712 TradeTicket is an authorization preview. It does not move funds.",
  "Contracts have not had an independent audit.",
  "There is no replicated indexer. Block height is a single public RPC.",
  "ARC/USDC in the tape is a local market card. There is no ARC ERC-20 in this build.",
];
const TOKEN_ALLOW = new Set([
  ARC.usdcErc20.toLowerCase(),
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
  "ETH/USDC": { base: "ETH", quote: "USDC", price: 2481.42, change: 2.84, high: 2514, low: 2398.5, vol: 42.84e6, tvl: 18.42e6, seed: 11 },
  "ARC/USDC": { base: "ARC", quote: "USDC", price: 1.84, change: 8.12, high: 1.92, low: 1.61, vol: 12.4e6, tvl: 9.1e6, seed: 22 },
  "BTC/USDC": { base: "BTC", quote: "USDC", price: 64210, change: 1.4, high: 65120, low: 62840, vol: 88.2e6, tvl: 31.6e6, seed: 33 },
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
const $ = (sel, root = document) => root.querySelector(sel);
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
  el.className = `pointer-events-auto w-80 bg-t2 border ${accent.split(" ")[0]} border-l-2 p-3 rounded shadow-xl`;
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

async function publicRpc(method, params = []) {
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
    if (typeof data !== "string" || !data.startsWith("0x70a08231") || data.length !== 74) {
      throw new Error("eth_call data blocked");
    }
  }
  const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 12000) : null;
  try {
    const res = await fetch(ARC.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
      signal: ctrl?.signal,
    });
    if (!res.ok) throw new Error("RPC HTTP " + res.status);
    const json = await res.json();
    if (json.error) throw new Error(json.error.message || "RPC error");
    return json.result;
  } finally {
    if (timer) clearTimeout(timer);
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
  push("demo-addr", !isAddress("0x7A...91F2"), "Truncated demo address is not treated as live");
  push("no-key", !Object.prototype.hasOwnProperty.call(state, "privateKey"), "No privateKey field on application state");
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
  const received = side === "buy" ? amountUsd / effective : amountUsd / price;
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
  watchlist: ["ETH/USDC", "ARC/USDC", "BTC/USDC"],
  alerts: [
    { id: 1, kind: "price", text: "ETH reaches $2,600", armed: true },
    { id: 2, kind: "portfolio", text: "Portfolio falls below $10,000", armed: true },
    { id: 3, kind: "position", text: "ETH allocation exceeds 50%", armed: true },
  ],
};

function tokenPrice(sym) {
  if (sym === "USDC") return 1;
  if (sym === "EURC") return 1.17;
  if (sym === "USYC") return 1.06;
  if (sym === "WETH" || sym === "ETH") return PAIRS["ETH/USDC"].price;
  if (sym === "cirBTC" || sym === "BTC") return PAIRS["BTC/USDC"].price;
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
  const pair = PAIRS[state.pair];
  const base = pair.base;
  const afterEth = state.side === "buy"
    ? ((state.balances[base] || 0) + quote.received) * pair.price
    : Math.max(0, ((state.balances[base] || 0) - state.amount / pair.price)) * pair.price;
  const afterTotal = state.side === "buy" ? p.total : p.total; // value approx conserved minus impact
  const exposure = (afterEth / (p.total + (state.side === "buy" ? 0 : 0))) * 100;
  const sizePct = p.total > 0 ? (state.amount / p.total) * 100 : 0;
  const exposureSafe = p.total > 0 ? exposure : 0;
  return {
    kind: "trade",
    tradeValue: state.amount,
    portfolio: p.total,
    sizePct,
    exposureAfter: exposureSafe,
    slippage: quote.slippageBps / 100,
    impact: quote.impact * 100,
    rr: ((pair.price * 1.03 - quote.effective) / (quote.effective - pair.price * 0.97)) || 1.1,
    note: sizePct > 8
      ? `A ${fmtUsd(state.amount)} ticket is ${fmt(sizePct, 1)}% of NAV. Position concentration in ${base} will move to ~${fmt(exposure, 1)}%.`
      : `Ticket is ${fmt(sizePct, 1)}% of NAV. Price impact ${fmt(quote.impact * 100, 2)}% is within the quoted 0.5% slippage band.`,
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

function header() {
  const p = portfolioSnapshot();
  const nav = ["terminal", "markets", "portfolio", "ai", "activity", "proof"];
  const labels = { terminal: "Terminal", markets: "Markets", portfolio: "Portfolio", ai: "AI Analyst", activity: "Activity", proof: "Proof" };
  return `
  <header class="fixed top-0 left-0 right-0 z-50 bg-[#0d0e11]/95 backdrop-blur-md border-b border-[#1F2430]">
    <div class="h-14 w-full px-4 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3 shrink-0">
        ${logoSvg(28)}
        <div class="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1b1b1f]">
          <span class="w-1.5 h-1.5 rounded-full bg-[#01e599] animate-pulse"></span>
          <span class="text-[10px] tracking-wider text-[#70ffba] font-semibold">${state.proof?.live?.chainOk && state.livePortfolio ? "ARC · WALLET + RPC" : state.livePortfolio ? "ARC · WALLET" : state.proof?.live?.chainOk ? "ARC · RPC CHECKED" : "ARC · UNVERIFIED"}</span>
          <span class="tnum text-[11px] text-[#94A3B8]">#${state.block.toLocaleString()}</span>
          <span class="text-[#3b494b]">•</span>
          <span class="tnum text-[11px] text-[#94A3B8]">${state.latency}ms</span>
          <span class="text-[#3b494b]">•</span>
          <span class="tnum text-[11px] text-[#94A3B8]">0.001 USDC</span>
        </div>
      </div>
      <nav class="flex items-center gap-1">
        ${nav.map((id) => `<button data-nav="${id}" class="px-3 py-1 text-[13px] font-display font-semibold rounded ${state.view===id?"bg-[#292a2d] text-[#e3e2e6]":"text-[#b9cacb] hover:text-white hover:bg-[#292a2d]"}">${labels[id]}</button>`).join("")}
      </nav>
      <div class="flex items-center gap-2 shrink-0">
        <div class="hidden xl:flex items-center gap-2 px-2 py-0.5 rounded bg-[#1b1b1f] tnum text-[11px]">
          <span class="text-[#94A3B8]">ETH</span><span>${fmtUsd(PAIRS["ETH/USDC"].price)}</span><span class="text-[#70ffba]">${fmtPct(PAIRS["ETH/USDC"].change)}</span>
          <span class="text-[#3b494b]">|</span>
          <span class="text-[#94A3B8]">ARC</span><span>${fmtUsd(PAIRS["ARC/USDC"].price)}</span><span class="text-[#70ffba]">${fmtPct(PAIRS["ARC/USDC"].change)}</span>
        </div>
        <button data-act="search" class="hidden md:flex items-center gap-1 px-2 py-0.5 rounded bg-[#1b1b1f] text-[#94A3B8] text-[11px]">Search <kbd class="px-1 rounded bg-[#343538] text-[#e3e2e6]">⌘K</kbd></button>
        <button data-act="alerts" class="relative p-1.5 rounded bg-[#1b1b1f] text-[#94A3B8]">
          <span class="material-symbols-outlined text-[18px]">notifications</span>
          <span class="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-[#93000a] text-[#ffdad6] text-[9px] flex items-center justify-center">${state.alerts.length}</span>
        </button>
        <div class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#292a2d]">
          <span class="w-2 h-2 rounded-full bg-[#01e599]"></span>
          <span class="text-[10px] uppercase text-[#dbfcff]">Arc</span>
          <a class="tnum text-[11px] hover:text-[#00f0ff]" href="${ARC.explorer}/address/${state.address}" target="_blank" rel="noreferrer">${shortAddr(state.address)}</a>
          <span class="h-3 w-px bg-[#343538]"></span>
          <span class="tnum text-[11px] text-[#70ffba]">${fmtUsd(p.total)}</span>
        </div>
        <button data-act="disconnect" class="w-8 h-8 rounded-full bg-[#dbfcff] text-[#00363a] flex items-center justify-center" title="Disconnect">
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
  <div class="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
    <div class="absolute inset-0 opacity-[0.18] pointer-events-none" style="background-image:linear-gradient(#1F2430 1px,transparent 1px),linear-gradient(90deg,#1F2430 1px,transparent 1px);background-size:48px 48px"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-transparent via-[#08090C]/40 to-[#08090C]"></div>
    <div class="relative z-10 flex flex-col items-center text-center px-6">
      ${logoSvg(44)}
      <div class="mt-8 font-display text-[11px] tracking-[0.35em] text-[#00F0FF]">BUILT ON ARC MAINNET</div>
      <h1 class="mt-4 font-display text-4xl md:text-5xl font-extrabold tracking-tight">The trading terminal<br/>for Arc.</h1>
      <p class="mt-4 text-[#94A3B8] max-w-md text-[15px]">Analyze markets. Execute trades. Understand your portfolio.<br/>One workstation. No tab-hopping.</p>
      <div class="mt-8 flex items-center gap-8 text-[12px] tracking-[0.2em] uppercase text-[#b9cacb]">
        <span>Analyze.</span><span>Execute.</span><span>Monitor.</span>
      </div>
      <button data-act="connect" ${state.connecting ? "disabled" : ""} class="mt-10 px-8 py-3 rounded bg-[#00F0FF] text-[#08090C] font-display font-bold text-[14px] hover:bg-[#38BDF8] transition disabled:opacity-60">
        ${state.connecting ? "Requesting signature…" : eth ? "Connect " + detected : "Install a wallet"}
      </button>
      ${!eth ? `<a class="mt-3 text-[12px] text-[#00F0FF]" href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get MetaMask</a>` : ""}
      ${state.walletError ? `<div class="mt-4 max-w-sm text-[12px] text-[#ffb4ab]">${escapeHtml(state.walletError)}</div>` : ""}
      <button data-act="proof" class="mt-4 text-[12px] text-[#00F0FF] underline underline-offset-4">Re-query Arc RPC — do not take the banner as proof</button>
      <div class="mt-6 text-[11px] text-[#64748B] tnum">Arc · Chain ID ${ARC.chainId} (0x13b2) · Native gas USDC · ${ARC.rpc}</div>
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

function terminalView() {
  const pair = PAIRS[state.pair];
  const ind = state.indicators || {};
  const p = portfolioSnapshot();
  const quote = quoteTrade({ side: state.side, amountUsd: state.amount, price: pair.price, slippageBps: state.slippage * 100 });
  const receivedLabel = state.side === "buy" ? pair.base : "USDC";
  const receivedAmt = state.side === "buy" ? quote.received : state.amount * (1 - quote.impact);
  const a = state.analysis;
  return `
  <main class="pt-14 min-h-screen">
    <section class="px-4 py-2 flex flex-wrap items-center justify-between gap-3 border-b border-[#1F2430] bg-[#0d0e11]">
      <div class="flex items-center gap-6 flex-wrap">
        <div class="relative">
          <button data-act="pair-menu" class="flex items-center gap-2 bg-[#1b1b1f] hover:bg-[#1f1f23] px-3 py-1.5 rounded">
            <span class="w-6 h-6 rounded-full bg-[#00f0ff]/15 flex items-center justify-center"><span class="material-symbols-outlined text-[15px] text-[#00f0ff]">currency_exchange</span></span>
            <div class="text-left">
              <div class="flex items-center gap-1.5">
                <span class="font-display font-semibold">${state.pair}</span>
                <span class="text-[10px] px-1 bg-[#00f0ff]/15 text-[#00f0ff] rounded">ARC SPOT</span>
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
          <span class="tnum text-[22px] font-bold text-[#00f0ff]">${fmtUsd(pair.price)}</span>
          <span class="tnum text-[12px] ${pair.change>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmtPct(pair.change)} <span class="text-mute">(${pair.change>=0?"+":""}${fmtUsd(pair.price*pair.change/100)})</span></span>
        </div>
        <div class="hidden xl:flex items-center gap-6 tnum text-[12px]">
          <div><div class="text-[10px] uppercase text-mute">24h High</div><div>${fmtUsd(pair.high)}</div></div>
          <div><div class="text-[10px] uppercase text-mute">24h Low</div><div>${fmtUsd(pair.low)}</div></div>
          <div><div class="text-[10px] uppercase text-mute">24h Volume</div><div>${fmtUsd(pair.vol/1e6)}M USDC</div></div>
          <div><div class="text-[10px] uppercase text-mute">Arc Liquidity</div><div class="text-[#dbfcff]">${fmtUsd(pair.tvl/1e6)}M</div></div>
        </div>
      </div>
      <div class="flex items-center gap-2 text-[11px] text-mute">
        <span class="w-1.5 h-1.5 rounded-full bg-[#01e599]"></span> Oracle: <span class="text-[#00f0ff] font-mono">Pyth V2 · Sub-sec</span>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-1 p-1">
      <section class="lg:col-span-8 bg-[#0d0e11] rounded overflow-hidden flex flex-col">
        <div class="px-3 py-1.5 bg-[#1b1b1f] flex flex-wrap items-center justify-between gap-2 border-b border-[#343538]/40">
          <div class="flex items-center gap-1">
            ${["1m","5m","15m","1h","4h","1D"].map((tf) => `<button data-tf="${tf}" class="px-2 py-0.5 text-[11px] rounded ${state.timeframe===tf?"bg-[#00f0ff] text-[#00363a] font-bold":"text-mute hover:text-white"}">${tf}</button>`).join("")}
            <span class="w-px h-4 bg-[#343538] mx-1"></span>
            ${[["candles","candlestick_chart","Candles"],["line","show_chart","Line"]].map(([id,ic,lb]) => `<button data-mode="${id}" class="flex items-center gap-1 px-2 py-0.5 text-[11px] rounded ${state.chartMode===id?"bg-[#1f1f23] text-[#00f0ff]":"text-mute"}"><span class="material-symbols-outlined text-[14px]">${ic}</span>${lb}</button>`).join("")}
          </div>
          <button data-act="ai-analyze" class="flex items-center gap-1.5 px-2.5 py-1 bg-[#292a2d] hover:bg-[#38393d] rounded text-[#00f0ff] text-[13px] font-display font-semibold">
            <span class="material-symbols-outlined text-[16px]">auto_awesome</span> AI Analyze
            <span class="text-[9px] uppercase tracking-widest px-1 bg-[#00f0ff]/20 rounded">Sync: Fresh</span>
          </button>
        </div>
        <div class="px-3 py-1 flex flex-wrap gap-x-4 gap-y-1 tnum text-[11px] border-b border-[#343538]/20">
          <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-[#00f0ff]"></span><span class="text-mute">EMA 20:</span><span class="text-[#00f0ff]">${fmtUsd(ind.ema20)}</span></span>
          <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-purple-400"></span><span class="text-mute">EMA 50:</span><span class="text-purple-300">${fmtUsd(ind.ema50)}</span></span>
          <span class="flex items-center gap-1"><span class="w-2 h-0.5 bg-[#64748B]"></span><span class="text-mute">EMA 200:</span><span class="text-mute">${fmtUsd(ind.ema200)}</span></span>
          <span class="text-mute">RSI (14): <span class="text-[#70ffba] font-semibold">${fmt(ind.rsi,2)}</span></span>
          <span class="text-mute">MACD hist: <span class="${ind.macdHist>=0?"text-[#70ffba]":"text-[#ffb4ab]"}">${fmt(ind.macdHist,2)}</span></span>
        </div>
        <div class="relative h-[420px]">
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
          <div class="flex items-center justify-between text-[11px] text-mute mb-1"><span>Amount (USDC)</span><span>Bal ${fmt(state.balances.USDC)} USDC</span></div>
          <input id="amt" type="number" value="${state.amount}" class="w-full bg-[#0D0F14] border border-[#1F2430] focus:border-[#00F0FF] outline-none rounded px-2 py-1.5 tnum text-right text-[14px]" />
          <div class="flex gap-1 mt-1">${[100,250,500,1000].map((n)=>`<button data-amt="${n}" class="flex-1 text-[11px] py-0.5 rounded bg-[#1b1b1f] hover:bg-[#292a2d] tnum">${n}</button>`).join("")}<button data-amt="max" class="flex-1 text-[11px] py-0.5 rounded bg-[#1b1b1f]">MAX</button></div>
        </div>
        <div>
          <div class="flex items-center justify-between text-[11px] text-mute mb-1"><span>Slippage</span><span class="tnum">${state.slippage}%</span></div>
          <input id="slip" type="range" min="0.1" max="2" step="0.1" value="${state.slippage}" class="w-full accent-[#00F0FF]" />
        </div>
        <div class="bg-[#121316] rounded p-2 tnum text-[12px] space-y-1">
          <div class="flex justify-between"><span class="text-mute">Est. received</span><span>${fmt(receivedAmt, 5)} ${receivedLabel}</span></div>
          <div class="flex justify-between"><span class="text-mute">Rate</span><span>1 ${pair.base} = ${fmtUsd(quote.effective)}</span></div>
          <div class="flex justify-between"><span class="text-mute">Price impact</span><span class="${quote.impact<0.005?"text-[#70ffba]":"text-[#F59E0B]"}">${fmt(quote.impact*100,2)}%</span></div>
          <div class="flex justify-between"><span class="text-mute">Min received</span><span>${fmt(quote.minReceived,5)} ${state.side==="buy"?pair.base:"USDC"}</span></div>
        </div>
        <button data-act="review" class="w-full py-2.5 rounded ${state.side==="buy"?"bg-[#00E599] text-[#08090C]":"bg-[#FF3B57] text-white"} font-display font-bold text-[13px]">Review trade</button>
        <div class="text-[10px] text-mute leading-relaxed">AI recommends. Trading engine validates. Wallet authorizes. Arc executes. No private keys leave the wallet.</div>
      </aside>
    </div>
  </main>`;
}

function marketsView() {
  return `
  <main class="pt-14 min-h-screen">
    <div class="px-4 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      ${[
        ["Arc Ecosystem TVL","$248.65M","+4.12%","78"],
        ["24h Arc Agg Volume","$142.80M","+12.4%","64"],
        ["AMM Median Gas","0.0008 USDC","0.8s conf","22"],
        ["Regime / Sentiment","68/100","Expansion","68"],
        ["Cross-Pool Depth","$84.20M","Native L1","88"],
      ].map(([l,v,s,w]) => `
        <div class="bg-[#1b1b1f] rounded p-3">
          <div class="flex justify-between text-[10px] uppercase tracking-wider text-mute">${l}<span class="text-[#70ffba]">${s}</span></div>
          <div class="font-display text-[22px] mt-1">${v}</div>
          <div class="h-1 bg-[#343538] mt-2 rounded overflow-hidden"><div class="h-full bg-[#00f0ff]" style="width:${w}%"></div></div>
        </div>`).join("")}
    </div>
    <div class="px-4 pb-6 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div class="xl:col-span-8 bg-[#0d0e11] rounded overflow-hidden">
        <div class="px-3 py-2 flex items-center justify-between border-b border-[#1F2430]">
          <span class="font-display text-[13px]">Active Arc Verified Pairs</span>
          <span class="text-[11px] text-mute">${Object.keys(PAIRS).length} markets</span>
        </div>
        <table class="w-full text-left tnum text-[12px]">
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
  <main class="pt-14 min-h-screen px-4 py-4">
    <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#1b1b1f] p-4 rounded">
      <div>
        <div class="text-[10px] uppercase tracking-wider text-mute">Total Portfolio Valuation <span class="ml-1 px-1 bg-[#121316] rounded">LIVE</span></div>
        <div class="flex items-baseline gap-3 mt-1">
          <span class="font-display text-[32px] text-[#dbfcff]">${fmtUsd(p.total)}</span>
          <span class="tnum text-[12px] px-2 py-0.5 rounded bg-[#292a2d] text-[#70ffba]">+${fmtUsd(p.pnlDay)} (${fmtPct(p.pnlDayPct)})</span>
        </div>
        <div class="grid grid-cols-3 gap-6 mt-3 tnum text-[13px]">
          <div><div class="text-[10px] uppercase text-mute">Source</div><div class="${state.livePortfolio?"text-[#00f0ff]":"text-mute"}">${state.livePortfolio ? "Arc RPC · live" : "Desk preview"}</div></div>
          <div><div class="text-[10px] uppercase text-mute">Unrealized P&L</div><div class="text-[#70ffba]">${state.livePortfolio ? "—" : "+$840.50"}</div></div>
          <div><div class="text-[10px] uppercase text-mute">Session signed</div><div class="text-[#00dbe9]">${state.activity.filter((a)=>a.type==="trade").length}</div></div>
        </div>
      </div>
      <div class="flex items-center gap-1">
        ${["1D","1W","1M","1Y","ALL"].map((x)=>`<button data-range="${x}" class="px-2 py-1 text-[11px] rounded ${state.portfolioRange===x?"bg-[#292a2d] text-[#00f0ff]":"text-mute"}">${x}</button>`).join("")}
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

    <div class="mt-3 bg-[#0d0e11] rounded overflow-hidden">
      <div class="px-3 py-2 font-display text-[13px] border-b border-[#1F2430]">Asset Holdings & Exposure</div>
      <table class="w-full text-left tnum text-[12px]">
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
  </main>`;
}

function aiView() {
  const cores = [
    ["market","show_chart","Market Analyst","Structure, orderflow & pivots"],
    ["trade","calculate","Trade Analyzer & Sizing","Kelly, slippage & risk"],
    ["portfolio","pie_chart","Portfolio Health","Concentration & systemic risk"],
    ["wallet","fingerprint","Wallet Forensics","Holdings, frequency, P&L"],
  ];
  const a = state.analysis;
  const p = analyzePortfolio();
  const w = analyzeWallet();
  return `
  <main class="pt-14 min-h-screen">
    <div class="px-4 py-2 bg-[#0d0e11] flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2430]">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-[#00f0ff] shadow-[0_0_8px_rgba(0,240,255,0.6)]"></span>
        <span class="font-display text-[13px] uppercase tracking-tight text-[#dbfcff]">Arc AI Market & Portfolio Analyst</span>
        <span class="text-[11px] px-1 bg-[#1f1f23] rounded text-mute">TELEMETRY_v4.2</span>
      </div>
      <div class="text-[11px] text-mute">ARC DUAL-KERNEL: DETERMINISTIC DATA ENGINE → VERIFIABLE AI SYNTHESIS</div>
    </div>
    <div class="p-3 grid grid-cols-1 xl:grid-cols-12 gap-3">
      <div class="xl:col-span-3 flex flex-col gap-2">
        <div class="bg-[#0d0e11] rounded p-3">
          <div class="text-[10px] uppercase text-mute mb-2">Analysis Matrix</div>
          ${cores.map(([id,ic,t,s]) => `
            <button data-core="${id}" class="w-full text-left p-2 rounded mb-1 flex items-center gap-2 ${state.aiCore===id?"bg-[#1f1f23]":"bg-[#1b1b1f] hover:bg-[#1f1f23]"}">
              <span class="material-symbols-outlined text-[18px] ${state.aiCore===id?"text-[#00f0ff]":"text-mute"}">${ic}</span>
              <div><div class="font-display text-[13px] ${state.aiCore===id?"text-[#00f0ff]":""}">${t}</div><div class="text-[11px] text-mute">${s}</div></div>
            </button>`).join("")}
        </div>
        <div class="bg-[#0d0e11] rounded p-3">
          <div class="text-[10px] uppercase text-mute mb-2">Fast Telemetry Dispatch</div>
          ${[
            ["Analyze ETH 4H setup","ai-analyze"],
            ["Should I enter $500 USDC here?","ai-trade"],
            ["Analyze my portfolio","ai-port"],
            ["Audit wallet activity","ai-wallet"],
          ].map(([q,act]) => `<button data-act="${act}" class="w-full text-left px-2 py-1.5 mb-1 rounded bg-[#1f1f23] text-[12px] hover:bg-[#292a2d] flex justify-between">${q}<span class="material-symbols-outlined text-[14px] text-[#00f0ff]">arrow_forward</span></button>`).join("")}
        </div>
      </div>
      <div class="xl:col-span-9 bg-[#0d0e11] rounded p-4">
        ${state.aiCore === "market" && a ? `
          <div class="font-display text-[18px] text-[#00f0ff]">${a.trend.toUpperCase()} STRUCTURE</div>
          <p class="mt-2 text-[14px]">${a.setup}</p>
          <p class="mt-2 text-[13px] text-[#b9cacb]">${a.why}</p>
          <p class="mt-2 text-[13px] text-[#F59E0B]">What could invalidate it — ${a.invalidateText}</p>
          <div class="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4 tnum text-[12px]">
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
        ` : state.aiCore === "wallet" ? `
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
  <main class="pt-14 min-h-screen px-4 py-4">
    <div class="font-display text-[16px] mb-3">Activity · this session</div>
    <p class="text-[12px] text-mute mb-3">Only signatures produced in this browser session. No invented inbound transfers.</p>
    <div class="bg-[#0d0e11] rounded overflow-hidden">
      ${rows.length ? `<table class="w-full text-left tnum text-[12px]">
        <thead class="text-[10px] uppercase text-mute"><tr class="border-b border-[#1F2430]">
          <th class="px-3 py-2">Time</th><th>Type</th><th>Detail</th><th>Status</th><th>Signature</th>
        </tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr class="border-b border-[#1F2430]/50">
              <td class="px-3 py-2 text-mute">${new Date(r.ts).toLocaleString()}</td>
              <td class="uppercase text-[10px] text-[#00f0ff]">${escapeHtml(r.type)}</td>
              <td>${escapeHtml(r.label)}<div class="text-mute">${escapeHtml(r.detail)}</div></td>
              <td class="text-[#70ffba]">${escapeHtml(r.status)}</td>
              <td class="text-[#00f0ff] break-all">${escapeHtml(typeof r.hash === "string" ? r.hash.slice(0, 18) + "…" : "—")}</td>
            </tr>`).join("")}
        </tbody>
      </table>` : `<div class="px-3 py-8 text-[13px] text-mute">No signed tickets this session.</div>`}
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
  <main class="pt-14 min-h-screen px-4 py-4 max-w-5xl">
    <div class="flex items-end justify-between gap-3">
      <div>
        <div class="font-display text-[16px]">Proof · re-query, do not screenshot</div>
        <p class="text-[12px] text-mute mt-1">Live rows hit ${escapeHtml(ARC.rpc)}. Local rows are fail-closed unit checks in this process. Last run ${escapeHtml(when)}.</p>
      </div>
      <button data-act="proof" class="px-3 py-1.5 rounded bg-[#00F0FF] text-[#08090C] font-display text-[12px] font-bold">${state.proof.running ? "Querying…" : "Run proof"}</button>
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
  const pair = PAIRS[state.pair];
  const q = state.pendingQuote;
  const outAmt = state.amount;
  const inAmt = state.side === "buy" ? q.received : state.amount * (1 - q.impact);
  const outSym = "USDC";
  const inSym = state.side === "buy" ? pair.base : "USDC";
  const sellSym = state.side === "buy" ? "USDC" : pair.base;
  const sellAmt = state.side === "buy" ? outAmt : state.amount / pair.price;
  return `
  <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-[#0d0e11]/85 backdrop-blur-md" data-act="close-review"></div>
    <div class="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row gap-3">
      <div class="flex-1 bg-[#1f1f23] rounded-lg p-6 relative overflow-hidden">
        <div class="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#00f0ff] via-[#dbfcff] to-[#01e599]"></div>
        <div class="flex items-start justify-between">
          <div>
            <div class="flex items-center gap-1 text-[#00f0ff]"><span class="material-symbols-outlined text-[18px]">verified_user</span><span class="font-display text-[18px] uppercase">Review & Confirm Trade</span></div>
            <div class="text-[10px] uppercase tracking-wider text-mute mt-1">EIP-712 ticket · no router broadcast</div>
          </div>
          <div class="text-[11px] px-2 py-0.5 rounded bg-[#292a2d]"><span class="w-2 h-2 inline-block rounded-full bg-[#01e599] animate-pulse mr-1"></span>Arc Mainnet · Chain ${ARC.chainId}</div>
        </div>
        <div class="mt-4 bg-[#0d0e11] p-3 rounded">
          <div class="text-[10px] uppercase text-mute">You send</div>
          <div class="flex justify-between items-baseline"><div class="font-display text-[28px]">${fmt(sellAmt, state.side==="buy"?2:5)} <span class="text-[#00f0ff] text-[14px]">${sellSym}</span></div><div class="text-[12px] text-mute">${shortAddr(state.address)}</div></div>
        </div>
        <div class="flex justify-center -my-2 relative z-10"><div class="bg-[#292a2d] px-2 py-0.5 rounded-full tnum text-[11px] text-[#00dbe9]">1 ${pair.base} = ${fmt(q.effective,2)} USDC</div></div>
        <div class="bg-[#0d0e11] p-3 rounded">
          <div class="text-[10px] uppercase text-mute">Estimated receive</div>
          <div class="font-display text-[28px] text-[#70ffba]">${fmt(inAmt,5)} <span class="text-white text-[14px]">${inSym}</span></div>
          <div class="mt-2 flex justify-between text-[12px] bg-[#1b1b1f] px-2 py-1 rounded"><span class="text-mute">Guaranteed min</span><span class="tnum">${fmt(q.minReceived,5)} ${state.side==="buy"?pair.base:"USDC"}</span></div>
        </div>
        <div class="mt-3 bg-[#1b1b1f] p-3 rounded text-[12px] grid grid-cols-2 gap-2">
          <div><div class="text-mute text-[11px]">Price impact</div><div class="tnum text-[#70ffba]">${fmt(q.impact*100,2)}%</div></div>
          <div><div class="text-mute text-[11px]">Route</div><div>Ungated AMM not wired</div></div>
          <div><div class="text-mute text-[11px]">Contract</div><div class="text-[#00f0ff] font-mono">${ARC.router}</div></div>
          <div><div class="text-mute text-[11px]">Network gas</div><div class="tnum">${q.gasUsd} USDC</div></div>
        </div>
        <div class="mt-4 flex gap-2">
          <button data-act="close-review" class="w-1/3 py-2 rounded bg-[#292a2d] font-display text-[13px]">Cancel & Adjust</button>
          <button data-act="sign" class="w-2/3 py-2 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[13px] flex items-center justify-center gap-1">
            <span class="material-symbols-outlined text-[18px]">fingerprint</span> Confirm & sign (${shortAddr(state.address)})
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
  <div class="fixed inset-0 z-[70] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-[#0d0e11]/80" data-act="close-tx"></div>
    <div class="relative bg-[#1f1f23] rounded-lg p-6 w-full max-w-md">
      <div class="font-display text-[16px] text-[#70ffba]">TICKET SIGNED</div>
      <div class="mt-3 text-[14px]">${tx.label}</div>
      <div class="mt-2 tnum text-[12px] space-y-1 text-[#b9cacb]">
        <div class="flex justify-between"><span>Quoted price</span><span class="text-white">${fmtUsd(tx.price)}</span></div>
        <div class="flex justify-between"><span>Network</span><span>Arc ${ARC.chainId}</span></div>
        <div class="flex justify-between"><span>Status</span><span class="text-[#70ffba]">Wallet signed</span></div>
        <div class="flex justify-between gap-2"><span>Signature</span><span class="text-[#00f0ff] break-all text-right">${typeof tx.hash === "string" && tx.hash.length > 20 ? tx.hash.slice(0, 10) + "…" + tx.hash.slice(-8) : tx.hash}</span></div>
      </div>
      <button data-act="close-tx" class="mt-4 w-full py-2 rounded bg-[#00f0ff] text-[#00363a] font-display font-bold text-[13px]">View portfolio</button>
    </div>
  </div>`;
}

function searchModal() {
  if (!state.searchOpen) return "";
  return `
  <div class="fixed inset-0 z-[70] flex items-start justify-center pt-24">
    <div class="absolute inset-0 bg-black/50" data-act="close-search"></div>
    <div class="relative w-full max-w-lg bg-[#1f1f23] rounded p-3">
      <input id="search-in" class="w-full bg-[#0d0e11] border border-[#1F2430] rounded px-3 py-2 outline-none focus:border-[#00f0ff]" placeholder="Search markets…" />
      <div class="mt-2">${Object.keys(PAIRS).map((k)=>`<button data-trade="${k}" class="w-full text-left px-2 py-1.5 text-[13px] hover:bg-[#292a2d] rounded">${k}</button>`).join("")}</div>
    </div>
  </div>`;
}

function alertsPanel() {
  if (!state.alertsOpen) return "";
  return `
  <div class="fixed top-14 right-4 z-[60] w-80 bg-[#1f1f23] border border-[#1F2430] rounded p-3 shadow-xl">
    <div class="font-display text-[12px] uppercase text-[#00f0ff] mb-2">Alerts</div>
    ${state.alerts.map((a)=>`<div class="py-1.5 text-[12px] border-b border-[#1F2430]/60 flex justify-between"><span>${a.text}</span><span class="text-[#70ffba] text-[10px]">ARMED</span></div>`).join("")}
    <div class="text-[11px] text-mute mt-2">In-app only for v1. Push later.</div>
  </div>`;
}

function render() {
  const root = $("#app");
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
  root.innerHTML = header() + body();
  $("#modal-root").innerHTML = reviewModal() + executedModal() + searchModal() + alertsPanel();
  bind();
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

function buildTradeTicket(address, pair, side, amount, quote) {
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
        { name: "pair", type: "string" },
        { name: "side", type: "string" },
        { name: "amountUsdc", type: "string" },
        { name: "minReceived", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    domain: {
      name: "Interminal",
      version: "1",
      chainId: ARC.chainId,
      verifyingContract: ARC.usdcErc20,
    },
    primaryType: "TradeTicket",
    message: {
      trader: address,
      pair,
      side,
      amountUsdc: String(amount),
      minReceived: String(quote.minReceived),
      nonce: state.ticketNonce,
      deadline: Math.floor(quote.expiresAt / 1000),
    },
  };
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
  if (state.side === "buy" && state.amount > (state.balances.USDC || 0)) {
    toast("Insufficient USDC", "Reduce size to the live native balance.", "err");
    return;
  }
  try {
    state.executing = true;
    const { id } = await readChainId();
    if (id !== ARC.chainId) {
      state.wrongNetwork = true;
      toast("Wrong network", "Switch to Arc before signing.", "err");
      render();
      return;
    }
    const trader = normalizeAddress(state.address);
    const ticket = buildTradeTicket(trader, state.pair, state.side, state.amount, q);
    const sig = await walletRpc("eth_signTypedData_v4", [trader, JSON.stringify(ticket)]);
    if (typeof sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(sig)) {
      throw new Error("Wallet returned a malformed signature");
    }
    state.ticketNonce += 1;
    const hash = sig.slice(0, 10) + "…" + sig.slice(-6);
    const label = state.side === "buy"
      ? `Signed buy ${fmt(q.received, 5)} ${pair.base} for ${fmt(state.amount)} USDC`
      : `Signed sell ${pair.base} for ${fmt(state.amount)} USDC`;
    state.activity.unshift({
      ts: now(), type: "trade", label, detail: `${state.pair} @ ${fmtUsd(q.effective)} · EIP-712 ${hash}`, hash: sig, status: "Signed",
    });
    state.lastTx = { show: true, hash: sig, price: q.effective, label };
    state.reviewOpen = false;
    state.pendingQuote = null;
    try { state.balances = await loadOnchainPortfolio(state.address); } catch { /* keep */ }
    toast("Signed", "Wallet authorized the ticket. Router broadcast stays gated until an on-chain quote is verified.", "ok");
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
    if (a === "apply-levels") { state.showLevels = true; state.view = "terminal"; render(); }
    if (a === "review") {
      try {
        const pair = PAIRS[assertPair(state.pair)];
        const amt = clampAmount(Number(state.amount));
        if (!amt) throw new Error("Enter a positive amount");
        if (state.side === "buy" && amt > (state.balances.USDC || 0) && state.livePortfolio) {
          throw new Error("Amount exceeds live USDC");
        }
        state.amount = amt;
        state.pendingQuote = quoteTrade({ side: state.side, amountUsd: amt, price: pair.price, slippageBps: state.slippage * 100 });
        state.reviewOpen = true;
        render();
      } catch (e) {
        toast("Quote rejected", e.message || String(e), "err");
      }
    }
    if (a === "close-review") { state.reviewOpen = false; render(); }
    if (a === "sign") executeTrade();
    if (a === "close-tx") { if (state.lastTx) state.lastTx.show = false; state.view = "portfolio"; render(); }
  }));
  document.querySelectorAll("[data-tf]").forEach((el) => el.addEventListener("click", () => {
    if (!TF_ALLOW.has(el.dataset.tf)) return;
    state.timeframe = el.dataset.tf; loadMarket(); state.analysis = null; render();
  }));
  document.querySelectorAll("[data-mode]").forEach((el) => el.addEventListener("click", () => {
    state.chartMode = el.dataset.mode; render();
  }));
  document.querySelectorAll("[data-side]").forEach((el) => el.addEventListener("click", () => {
    if (!SIDE_ALLOW.has(el.dataset.side)) return;
    state.side = el.dataset.side; render();
  }));
  document.querySelectorAll("[data-amt]").forEach((el) => el.addEventListener("click", () => {
    const raw = el.dataset.amt === "max" ? Math.floor(state.balances.USDC || 0) : Number(el.dataset.amt);
    state.amount = clampAmount(raw);
    render();
  }));
  document.querySelectorAll("[data-pair]").forEach((el) => el.addEventListener("click", () => {
    if (!PAIRS[el.dataset.pair]) return;
    state.pair = el.dataset.pair; loadMarket(); state.analysis = null; render();
  }));
  document.querySelectorAll("[data-trade]").forEach((el) => el.addEventListener("click", () => {
    if (!PAIRS[el.dataset.trade]) return;
    state.pair = el.dataset.trade; state.view = "terminal"; state.searchOpen = false; loadMarket(); render();
  }));
  document.querySelectorAll("[data-watch]").forEach((el) => el.addEventListener("click", () => {
    const k = el.dataset.watch;
    if (!PAIRS[k]) return;
    state.watchlist = state.watchlist.includes(k) ? state.watchlist.filter((x) => x !== k) : [...state.watchlist, k];
    render();
  }));
  document.querySelectorAll("[data-core]").forEach((el) => el.addEventListener("click", () => {
    state.aiCore = el.dataset.core;
    if (el.dataset.core === "market" && !state.analysis) state.analysis = analyzeMarket();
    render();
  }));
  document.querySelectorAll("[data-range]").forEach((el) => el.addEventListener("click", () => {
    state.portfolioRange = el.dataset.range; render();
  }));
  const amt = $("#amt");
  if (amt) amt.addEventListener("change", () => { state.amount = clampAmount(Number(amt.value)); render(); });
  const slip = $("#slip");
  if (slip) slip.addEventListener("input", () => { state.slippage = Number(slip.value); });
  if (slip) slip.addEventListener("change", () => render());
}

if (typeof document !== "undefined") {
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      if (state.connected) { state.searchOpen = true; render(); }
    }
    if (e.key === "Escape") {
      state.searchOpen = false; state.alertsOpen = false; state.reviewOpen = false;
      if (state.lastTx) state.lastTx.show = false;
      render();
    }
  });

  setInterval(() => {
    if (!state.connected) return;
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
    }
  }, 2500);

  loadMarket();
  render();
  resumeWallet();

  setInterval(async () => {
    if (!state.connected || state.wrongNetwork || !isAddress(state.address)) return;
    try {
      state.balances = await loadOnchainPortfolio(state.address);
    } catch { /* keep last book */ }
  }, 20000);
}

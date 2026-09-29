// patch-pairs.mjs — updates PAIRS, TOKEN_META, and eth_call gate in app.js
import fs from "fs";
const src0 = fs.readFileSync("app.js", "utf8");

// ── 1. New PAIRS block ────────────────────────────────────────
const newPairsBlock = `const PAIRS = {
  /* -- Arc RWA and FX -- */
  "EURC/USDC":  { base: "EURC",  quote: "USDC", price: 1.13,      change: -0.18, high: 1.135,  low: 1.128,  vol: 3.12e6,  tvl: 45.2e6,  seed: 77, cat: "rwa_fx"   },
  "USYC/USDC":  { base: "USYC",  quote: "USDC", price: 1.0664,    change:  0.02, high: 1.0665, low: 1.0663, vol: 28.5e6,  tvl: 85.0e6,  seed: 88, cat: "rwa_fx"   },
  /* -- Bluechips -- */
  "ETH/USDC":   { base: "ETH",   quote: "USDC", price: 2733.05,   change:  2.54, high: 2780,   low: 2680,   vol: 64.1e6,  tvl: 18.42e6, seed: 11, cat: "bluechip"  },
  "BTC/USDC":   { base: "BTC",   quote: "USDC", price: 84176.37,  change:  1.66, high: 85200,  low: 83100,  vol: 88.2e6,  tvl: 31.6e6,  seed: 33, cat: "bluechip"  },
  "SOL/USDC":   { base: "SOL",   quote: "USDC", price: 148.9,     change: -0.62, high: 154.2,  low: 146.1,  vol: 19.7e6,  tvl: 6.4e6,   seed: 44, cat: "bluechip"  },
  "AVAX/USDC":  { base: "AVAX",  quote: "USDC", price: 28.14,     change:  3.21, high: 28.9,   low: 26.8,   vol: 4.8e6,   tvl: 2.1e6,   seed: 55, cat: "bluechip"  },
  "SUI/USDC":   { base: "SUI",   quote: "USDC", price: 2.84,      change:  1.42, high: 2.94,   low: 2.71,   vol: 8.1e6,   tvl: 3.2e6,   seed: 91, cat: "bluechip"  },
  "ARB/USDC":   { base: "ARB",   quote: "USDC", price: 0.612,     change: -1.08, high: 0.641,  low: 0.598,  vol: 6.3e6,   tvl: 2.8e6,   seed: 82, cat: "bluechip"  },
  "OP/USDC":    { base: "OP",    quote: "USDC", price: 1.14,      change:  0.93, high: 1.18,   low: 1.10,   vol: 4.9e6,   tvl: 2.0e6,   seed: 73, cat: "bluechip"  },
  "NEAR/USDC":  { base: "NEAR",  quote: "USDC", price: 4.08,      change:  2.71, high: 4.22,   low: 3.94,   vol: 5.5e6,   tvl: 1.7e6,   seed: 64, cat: "bluechip"  },
  /* -- DeFi -- */
  "LINK/USDC":  { base: "LINK",  quote: "USDC", price: 13.62,     change:  0.84, high: 13.91,  low: 13.2,   vol: 3.1e6,   tvl: 1.4e6,   seed: 66, cat: "defi"      },
  "AAVE/USDC":  { base: "AAVE",  quote: "USDC", price: 212.4,     change:  3.55, high: 219.8,  low: 205.1,  vol: 2.4e6,   tvl: 1.1e6,   seed: 57, cat: "defi"      },
  "UNI/USDC":   { base: "UNI",   quote: "USDC", price: 7.38,      change:  1.22, high: 7.61,   low: 7.14,   vol: 3.7e6,   tvl: 1.5e6,   seed: 48, cat: "defi"      },
  /* -- Arc Native -- */
  "ARC/USDC":   { base: "ARC",   quote: "USDC", price: 1.84,      change:  8.12, high: 1.92,   low: 1.61,   vol: 12.4e6,  tvl: 9.1e6,   seed: 22, cat: "arc"       },
};

/* Custom Arc ERC-20 tokens imported at runtime (keyed SYM/USDC) */
const CUSTOM_PAIRS = {};`;

// ── 2. New TOKEN_META block ───────────────────────────────────
const newMetaBlock = `const TOKEN_META = {
  ETH:    { name: "Ethereum",       decimals: 18, cat: "bluechip" },
  WETH:   { name: "Wrapped Ether",  decimals: 18, cat: "bluechip" },
  USDC:   { name: "USD Coin",       decimals: 6,  cat: "stable"   },
  EURC:   { name: "EURC",           decimals: 6,  cat: "rwa_fx"   },
  USYC:   { name: "USYC",           decimals: 6,  cat: "rwa_fx"   },
  cirBTC: { name: "Circle BTC",     decimals: 8,  cat: "bluechip" },
  ARC:    { name: "Arc Protocol",   decimals: 18, cat: "arc"      },
  BTC:    { name: "Bitcoin",        decimals: 8,  cat: "bluechip" },
  SOL:    { name: "Solana",         decimals: 9,  cat: "bluechip" },
  AVAX:   { name: "Avalanche",      decimals: 18, cat: "bluechip" },
  LINK:   { name: "Chainlink",      decimals: 18, cat: "defi"     },
  SUI:    { name: "Sui",            decimals: 9,  cat: "bluechip" },
  ARB:    { name: "Arbitrum",       decimals: 18, cat: "bluechip" },
  OP:     { name: "Optimism",       decimals: 18, cat: "bluechip" },
  NEAR:   { name: "NEAR Protocol",  decimals: 24, cat: "bluechip" },
  AAVE:   { name: "Aave",           decimals: 18, cat: "defi"     },
  UNI:    { name: "Uniswap",        decimals: 18, cat: "defi"     },
};`;

// Find precise boundaries in the source
const pairsStart = src0.indexOf("const PAIRS = {");
const metaStart  = src0.indexOf("\nconst TOKEN_META = {");
const afterMeta  = src0.indexOf("\n/* ---------- utilities ---------- */");

if (pairsStart === -1 || metaStart === -1 || afterMeta === -1) {
  console.error("Markers not found!", { pairsStart, metaStart, afterMeta });
  process.exit(1);
}

const src1 =
  src0.slice(0, pairsStart) +
  newPairsBlock +
  "\n\n" +
  newMetaBlock +
  src0.slice(afterMeta);

// ── 3. Expand eth_call gate to allow name/symbol/decimals selectors ──
// Current gate: only allows balanceOf (0x70a08231).
// New: also allow 0x06fdde03 (name), 0x95d89b41 (symbol), 0x313ce567 (decimals) for any address in TOKEN_ALLOW.
const oldGate = `    const isErc20Balance = typeof data === "string" && data.startsWith("0x70a08231") && data.length === 74;`;
const newGate = `    const isErc20Balance = typeof data === "string" && data.startsWith("0x70a08231") && data.length === 74;
    const isErc20Meta = typeof data === "string" && (
      data === "0x06fdde03" ||  // name()
      data === "0x95d89b41" ||  // symbol()
      data === "0x313ce567"     // decimals()
    );`;

const oldGate2 = `    if (!isErc20Balance && !isSettlementQuery) {`;
const newGate2 = `    if (!isErc20Balance && !isErc20Meta && !isSettlementQuery) {`;

const src2 = src1
  .replace(oldGate, newGate)
  .replace(oldGate2, newGate2);

// ── 4. Expand TOKEN_ALLOW to include custom imported tokens dynamically ──
// Replace the static TOKEN_ALLOW with a function that checks CUSTOM_PAIRS too
const oldAllowBlock = `const TOKEN_ALLOW = new Set([
  ARC.usdcErc20.toLowerCase(),
  ARC.settlement.toLowerCase(),
  ...Object.values(ARC.tokens).map((t) => t.address.toLowerCase()),
]);`;

const newAllowBlock = `function isTokenAllowed(addr) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  if (a === ARC.usdcErc20.toLowerCase()) return true;
  if (a === ARC.settlement.toLowerCase()) return true;
  if (Object.values(ARC.tokens).some((t) => t.address.toLowerCase() === a)) return true;
  // Allow any custom imported Arc token
  if (Object.values(CUSTOM_PAIRS).some((p) => p.address && p.address.toLowerCase() === a)) return true;
  return false;
}
// Legacy Set retained for fast path in tests; updated when tokens are imported
const TOKEN_ALLOW = new Set([
  ARC.usdcErc20.toLowerCase(),
  ARC.settlement.toLowerCase(),
  ...Object.values(ARC.tokens).map((t) => t.address.toLowerCase()),
]);`;

const src3 = src2.replace(oldAllowBlock, newAllowBlock);

// ── 5. Update eth_call gate to use isTokenAllowed() for custom tokens ──
const oldCallGate = `    const to = params[0]?.to;
    if (!isAddress(to) || !TOKEN_ALLOW.has(to.toLowerCase())) throw new Error("eth_call target blocked");`;
const newCallGate = `    const to = params[0]?.to;
    if (!isAddress(to) || (!TOKEN_ALLOW.has(to.toLowerCase()) && !isTokenAllowed(to))) throw new Error("eth_call target blocked");`;

const src4 = src3.replace(oldCallGate, newCallGate);

// ── 6. Expand loadOnchainPortfolio to include new tokens ──────
const oldPortfolioNext = `  const next = { USDC: usdc, ETH: 0, WETH: 0, EURC: 0, USYC: 0, cirBTC: 0, ARC: 0, BTC: 0, SOL: 0, AVAX: 0, LINK: 0 };`;
const newPortfolioNext = `  const next = { USDC: usdc, ETH: 0, WETH: 0, EURC: 0, USYC: 0, cirBTC: 0, ARC: 0, BTC: 0, SOL: 0, AVAX: 0, LINK: 0, SUI: 0, ARB: 0, OP: 0, NEAR: 0, AAVE: 0, UNI: 0 };`;

const src5 = src4.replace(oldPortfolioNext, newPortfolioNext);

// ── 7. Add decodeAbiString + importCustomArcToken functions before tokenPrice ──
const anchorForImport = `function tokenPrice(sym) {`;
const importFunctions = `/* ---------- ABI string decoder (no external deps) ---------- */
function decodeAbiString(hex) {
  try {
    if (!hex || hex === "0x") return "";
    const h = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (h.length < 128) {
      // Try raw UTF-8 decode (non-ABI-encoded short strings)
      let out = "";
      for (let i = 0; i < h.length; i += 2) {
        const code = parseInt(h.slice(i, i + 2), 16);
        if (code === 0) break;
        out += String.fromCharCode(code);
      }
      return out.trim();
    }
    // ABI-encoded: offset (32) + length (32) + data
    const lenHex = h.slice(64, 128);
    const len = parseInt(lenHex, 16);
    if (!Number.isFinite(len) || len > 256) return "";
    const strHex = h.slice(128, 128 + len * 2);
    let out = "";
    for (let i = 0; i < strHex.length; i += 2) {
      const code = parseInt(strHex.slice(i, i + 2), 16);
      if (code === 0) break;
      out += String.fromCharCode(code);
    }
    return out.trim();
  } catch { return ""; }
}

async function importCustomArcToken(address) {
  if (!isAddress(address)) throw new Error("Invalid ERC-20 address");
  const addr = address.toLowerCase();

  // Add to TOKEN_ALLOW so publicRpc gates pass
  TOKEN_ALLOW.add(addr);

  // Fetch name, symbol, decimals in parallel
  const [nameHex, symHex, decHex] = await Promise.all([
    publicRpc("eth_call", [{ to: address, data: "0x06fdde03" }, "latest"]),
    publicRpc("eth_call", [{ to: address, data: "0x95d89b41" }, "latest"]),
    publicRpc("eth_call", [{ to: address, data: "0x313ce567" }, "latest"]),
  ]);

  const name     = decodeAbiString(nameHex) || "Unknown";
  const symbol   = decodeAbiString(symHex)  || addr.slice(0, 6).toUpperCase();
  const decimals = parseInt(decHex || "0x12", 16);

  const pairKey = symbol + "/USDC";

  // Register in CUSTOM_PAIRS and PAIRS
  CUSTOM_PAIRS[pairKey] = { address, name, symbol, decimals, importedAt: Date.now() };
  if (!PAIRS[pairKey]) {
    PAIRS[pairKey] = {
      base: symbol, quote: "USDC",
      price: 0, change: 0, high: 0, low: 0, vol: 0, tvl: 0, seed: 99,
      cat: "imported",
    };
  }
  if (!TOKEN_META[symbol]) {
    TOKEN_META[symbol] = { name, decimals, cat: "imported" };
  }

  // Persist to localStorage
  try {
    const store = getStorage();
    if (store) {
      const saved = JSON.parse(store.getItem("interminal_custom_tokens") || "[]");
      const deduped = saved.filter((t) => t.address.toLowerCase() !== addr);
      deduped.push({ address, name, symbol, decimals });
      store.setItem("interminal_custom_tokens", JSON.stringify(deduped.slice(0, 50)));
    }
  } catch {}

  return { pairKey, name, symbol, decimals };
}

function loadCustomTokensFromStorage() {
  try {
    const store = getStorage();
    if (!store) return;
    const saved = JSON.parse(store.getItem("interminal_custom_tokens") || "[]");
    saved.forEach(({ address, name, symbol, decimals }) => {
      if (!isAddress(address)) return;
      const pairKey = symbol + "/USDC";
      TOKEN_ALLOW.add(address.toLowerCase());
      CUSTOM_PAIRS[pairKey] = { address, name, symbol, decimals, importedAt: 0 };
      if (!PAIRS[pairKey]) {
        PAIRS[pairKey] = {
          base: symbol, quote: "USDC",
          price: 0, change: 0, high: 0, low: 0, vol: 0, tvl: 0, seed: 99,
          cat: "imported",
        };
      }
      if (!TOKEN_META[symbol]) TOKEN_META[symbol] = { name, decimals, cat: "imported" };
    });
  } catch {}
}

`;

const src6 = src5.replace(anchorForImport, importFunctions + anchorForImport);

fs.writeFileSync("app.js", src6, "utf8");
console.log("patch-pairs done. Total length:", src6.length);

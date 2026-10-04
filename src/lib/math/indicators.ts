import { PAIRS, assertPair, TF_ALLOW } from "../../constants/pairs";
import { Candle, Indicators, MarketAnalysis, Timeframe } from "../../types/market";

function rnd(seed: number) {
  let s = seed % 2147483647;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

export function generateCandles(pairKey: string, timeframe: Timeframe, count = 120): Candle[] {
  const p = PAIRS[assertPair(pairKey)];
  const tf = TF_ALLOW.has(timeframe) ? timeframe : "4h";
  const r = rnd((p.seed || 11) + tf.length * 17);
  const tfMs: Record<Timeframe, number> = {
    "1m": 6e4,
    "5m": 3e5,
    "15m": 9e5,
    "1h": 36e5,
    "4h": 144e5,
    "1D": 864e5,
  };
  const ms = tfMs[tf] || 144e5;
  const candles: Candle[] = [];
  let price = p.price * (0.92 + r() * 0.04);
  const t0 = Date.now() - ms * count;

  for (let i = 0; i < count; i++) {
    const drift = (p.change / 100) / count + (r() - 0.48) * 0.012;
    const open = price;
    const close = open * (1 + drift);
    const high = Math.max(open, close) * (1 + r() * 0.006);
    const low = Math.min(open, close) * (1 - r() * 0.006);
    const volume = (p.vol / count) * (0.4 + r() * 1.4);
    candles.push({ time: t0 + i * ms, open, high, low, close, volume });
    price = close;
  }

  const last = candles[candles.length - 1];
  if (last) {
    last.close = p.price;
    last.high = Math.max(last.open, last.close) * 1.0004;
    last.low = Math.min(last.open, last.close) * 0.9996;
  }
  return candles;
}


/* -------------------------------------------------------------------------- */
/* Live market data                                                            */
/*                                                                            */
/* Production charts must never silently fall back to fabricated candles.     */
/* Arc-listed markets use GeckoTerminal's free public on-chain OHLCV API.     */
/* USYC uses Hashnote's official NAV reports because USYC is priced once per  */
/* business day rather than trading as a normal continuously quoted asset.    */
/* -------------------------------------------------------------------------- */

export type CandleSource =
  | "arc-geckoterminal"
  | "hashnote-usyc"
  | "global-binance"
  | "unavailable";

export interface CandleStats {
  price: number;
  change: number;
  high: number;
  low: number;
  vol: number;
}

export interface CandleResult {
  candles: Candle[];
  source: CandleSource;
  label: string;
  stats?: CandleStats;
  poolAddress?: string;
}

const GECKO_BASE = "https://api.geckoterminal.com/api/v2";
const HASHNOTE_PRICE = "https://usyc.hashnote.com/api/price";
const HASHNOTE_REPORTS = "https://usyc.hashnote.com/api/price-reports";

const ARC_POOL_MAP: Record<string, string> = {
  // Verified live Arc pools indexed by GeckoTerminal.
  "ETH/USDC": "0x6f302decb49fb30b2d2c609bdd16e04e7dd096fc",
  "BTC/USDC": "0x82916bee18fcef517b26c72d7cb5f13694e1db41",
  "EURC/USDC": "0xbe080ac37ad1305dfcc9521f5e6f68cfdc41b7fa",
};

const BINANCE_SYMBOL_MAP: Record<string, string> = {
  // Explicitly global reference markets, not Arc liquidity.
  "ETH/USDC": "ETHUSDT",
  "BTC/USDC": "BTCUSDT",
  "SOL/USDC": "SOLUSDT",
  "AVAX/USDC": "AVAXUSDT",
  "SUI/USDC": "SUIUSDT",
  "ARB/USDC": "ARBUSDT",
  "OP/USDC": "OPUSDT",
  "NEAR/USDC": "NEARUSDT",
  "LINK/USDC": "LINKUSDT",
  "AAVE/USDC": "AAVEUSDT",
  "UNI/USDC": "UNIUSDT",
};

const BINANCE_INTERVAL_MAP: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1D": "1d",
};

const GECKO_RESOLUTION: Record<Timeframe, { bucket: string; aggregate: number }> = {
  "1m": { bucket: "minute", aggregate: 1 },
  "5m": { bucket: "minute", aggregate: 5 },
  "15m": { bucket: "minute", aggregate: 15 },
  "1h": { bucket: "hour", aggregate: 1 },
  "4h": { bucket: "hour", aggregate: 4 },
  "1D": { bucket: "day", aggregate: 1 },
};

async function fetchJson(url: string, timeoutMs = 9000): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Market data request failed: " + res.status);
  return res.json();
}

function statsFromCandles(candles: Candle[]): CandleStats | undefined {
  if (!candles.length) return undefined;
  const valid = candles.filter(
    (c) =>
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.close > 0,
  );
  if (!valid.length) return undefined;

  const latest = valid[valid.length - 1];
  const cutoff = latest.time - 24 * 60 * 60 * 1000;
  const prior = [...valid].reverse().find((c) => c.time <= cutoff);

  return {
    price: latest.close,
    change: prior?.close ? ((latest.close / prior.close) - 1) * 100 : 0,
    high: Math.max(...valid.map((c) => c.high)),
    low: Math.min(...valid.map((c) => c.low)),
    vol: valid.reduce((sum, c) => sum + Math.max(0, c.volume || 0), 0),
  };
}

async function fetchArcPoolCandles(
  pairKey: string,
  timeframe: Timeframe,
  count = 120,
): Promise<CandleResult> {
  const pool = ARC_POOL_MAP[pairKey];
  if (!pool) {
    return {
      candles: [],
      source: "unavailable",
      label: "No indexed Arc market data",
    };
  }

  const resolution = GECKO_RESOLUTION[timeframe];
  const url =
    GECKO_BASE +
    "/networks/arc/pools/" +
    pool +
    "/ohlcv/" +
    resolution.bucket +
    "?aggregate=" +
    resolution.aggregate +
    "&limit=" +
    Math.min(count, 1000) +
    "&currency=usd";

  const json = await fetchJson(url);
  const raw = json?.data?.attributes?.ohlcv_list;
  if (!Array.isArray(raw)) throw new Error("GeckoTerminal returned no OHLCV data");

  // GeckoTerminal OHLCV tuples are [timestamp, open, high, low, close, volume].
  const candles: Candle[] = raw
    .map((k: any[]) => ({
      time: Number(k?.[0]) * 1000,
      open: Number(k?.[1]),
      high: Number(k?.[2]),
      low: Number(k?.[3]),
      close: Number(k?.[4]),
      volume: Number(k?.[5] || 0),
    }))
    .filter(
      (c: Candle) =>
        Number.isFinite(c.time) &&
        Number.isFinite(c.open) &&
        Number.isFinite(c.high) &&
        Number.isFinite(c.low) &&
        Number.isFinite(c.close) &&
        c.close > 0,
    )
    .sort((a: Candle, b: Candle) => a.time - b.time);

  if (candles.length < 2) throw new Error("Arc market returned insufficient OHLCV history");

  return {
    candles,
    source: "arc-geckoterminal",
    label: "Arc DEX · GeckoTerminal",
    stats: statsFromCandles(candles),
    poolAddress: pool,
  };
}

type UnknownRecord = Record<string, any>;

function collectRecords(value: any): UnknownRecord[] {
  if (Array.isArray(value)) return value.flatMap(collectRecords);
  if (value && typeof value === "object") {
    const out: UnknownRecord[] = [value];
    for (const key of ["data", "reports", "priceReports", "results", "items"]) {
      if (value[key] !== undefined) out.push(...collectRecords(value[key]));
    }
    return out;
  }
  return [];
}

function firstNumber(row: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = Number(row[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function firstTimestamp(row: UnknownRecord): number | null {
  for (const key of [
    "timestamp",
    "time",
    "reportedAt",
    "effectiveAt",
    "publishedAt",
    "createdAt",
    "date",
  ]) {
    const raw = row[key];
    if (raw === undefined || raw === null || raw === "") continue;
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && numeric > 0) return numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    const parsed = Date.parse(String(raw));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function fetchHashnoteUsycCandles(count = 120): Promise<CandleResult> {
  const [current, reports] = await Promise.all([
    fetchJson(HASHNOTE_PRICE),
    fetchJson(HASHNOTE_REPORTS),
  ]);

  const rows = [...collectRecords(reports), ...collectRecords(current)];
  const seen = new Set<string>();
  const points = rows
    .map((row) => ({
      time: firstTimestamp(row),
      price: firstNumber(row, ["price", "priceUsd", "price_usd", "nav", "usycPrice", "value"]),
    }))
    .filter((p): p is { time: number; price: number } => !!p.time && !!p.price)
    .sort((a, b) => a.time - b.time);

  const candles: Candle[] = [];
  for (const point of points) {
    const key = String(point.time);
    if (seen.has(key)) continue;
    seen.add(key);
    const previous = candles[candles.length - 1]?.close ?? point.price;
    candles.push({
      time: point.time,
      open: previous,
      high: Math.max(previous, point.price),
      low: Math.min(previous, point.price),
      close: point.price,
      volume: 0,
    });
  }

  const trimmed = candles.slice(-count);
  if (trimmed.length < 2) throw new Error("Hashnote returned insufficient USYC price history");

  return {
    candles: trimmed,
    source: "hashnote-usyc",
    label: "USYC NAV · Hashnote",
    stats: statsFromCandles(trimmed),
  };
}

async function fetchBinanceCandles(
  pairKey: string,
  timeframe: Timeframe,
  count = 120,
): Promise<CandleResult> {
  const symbol = BINANCE_SYMBOL_MAP[pairKey];
  if (!symbol) {
    return {
      candles: [],
      source: "unavailable",
      label: "No market data available",
    };
  }

  const interval = BINANCE_INTERVAL_MAP[timeframe];
  const url =
    "https://api.binance.com/api/v3/klines?symbol=" +
    symbol +
    "&interval=" +
    interval +
    "&limit=" +
    Math.min(count, 1000);
  const data = await fetchJson(url);

  const candles: Candle[] = Array.isArray(data)
    ? data
        .map((k: any[]) => ({
          time: Number(k?.[0]),
          open: Number(k?.[1]),
          high: Number(k?.[2]),
          low: Number(k?.[3]),
          close: Number(k?.[4]),
          volume: Number(k?.[5] || 0),
        }))
        .filter((c: Candle) => Number.isFinite(c.close) && c.close > 0)
    : [];

  if (candles.length < 2) throw new Error("Binance returned insufficient OHLCV history");

  return {
    candles,
    source: "global-binance",
    label: "Global reference · Binance",
    stats: statsFromCandles(candles),
  };
}

/**
 * Live-first production market feed.
 *
 * There is deliberately no synthetic fallback here. The exported
 * generateCandles() below is retained only for deterministic unit tests.
 */
export async function getCandles(
  pairKey: string,
  timeframe: Timeframe,
  count = 120,
): Promise<CandleResult> {
  assertPair(pairKey);
  const tf = TF_ALLOW.has(timeframe) ? timeframe : "4h";

  try {
    if (pairKey === "USYC/USDC") {
      return await fetchHashnoteUsycCandles(count);
    }

    if (ARC_POOL_MAP[pairKey]) {
      return await fetchArcPoolCandles(pairKey, tf, count);
    }

    if (BINANCE_SYMBOL_MAP[pairKey]) {
      return await fetchBinanceCandles(pairKey, tf, count);
    }

    return {
      candles: [],
      source: "unavailable",
      label: "No indexed market data",
    };
  } catch {
    return {
      candles: [],
      source: "unavailable",
      label: "Live market data unavailable",
    };
  }
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] || 0;
  values.forEach((v, i) => {
    prev = i === 0 ? v : v * k + prev * (1 - k);
    out.push(prev);
  });
  return out;
}

export function rsi(closes: number[], period = 14): number[] {
  if (closes.length < period + 1) return closes.map(() => 50);
  const out = Array(period).fill(50);
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  gain /= period;
  loss /= period;
  out.push(100 - 100 / (1 + (loss === 0 ? 100 : gain / loss)));

  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    gain = (gain * (period - 1) + Math.max(d, 0)) / period;
    loss = (loss * (period - 1) + Math.max(-d, 0)) / period;
    out.push(100 - 100 / (1 + (loss === 0 ? 100 : gain / loss)));
  }
  return out;
}

export function macd(closes: number[]) {
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const line = e12.map((v, i) => v - e26[i]);
  const signal = ema(line, 9);
  const hist = line.map((v, i) => v - signal[i]);
  return { line, signal, hist };
}

export function computeIndicators(candles: Candle[]): Indicators {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const e50 = ema(closes, 50);
  const e200 = ema(closes, 200);
  const r = rsi(closes, 14);
  const m = macd(closes);
  const last = candles.length - 1;
  const swingSlice = candles.slice(-30);
  const swingHigh = Math.max(...swingSlice.map((c) => c.high));
  const swingLow = Math.min(...swingSlice.map((c) => c.low));

  return {
    ema20: e20[last] || 0,
    ema50: e50[last] || 0,
    ema200: e200[last] || 0,
    rsi: r[last] ?? 50,
    macdHist: m.hist[last] || 0,
    support: swingLow,
    resistance: swingHigh,
    series: { e20, e50, e200 },
  };
}

export function analyzeMarket(pairKey: string, timeframe: Timeframe, indicators: Indicators | null): MarketAnalysis | null {
  const pair = PAIRS[pairKey];
  if (!pair || !indicators) return null;
  const px = pair.price;
  const trend = px > indicators.ema20 && indicators.ema20 > indicators.ema50
    ? "Bullish"
    : px < indicators.ema20 && indicators.ema20 < indicators.ema50
    ? "Bearish"
    : "Range";

  const momentum = indicators.rsi >= 60 && indicators.macdHist > 0
    ? "Positive"
    : indicators.rsi <= 40 && indicators.macdHist < 0
    ? "Negative"
    : "Neutral";

  const risk = Math.abs(indicators.rsi - 50) > 22 ? "Elevated" : "Medium";
  const invalidation = trend === "Bullish" ? indicators.ema50 * 0.992 : indicators.ema20 * 1.008;
  const regime = trend === "Bullish"
    ? "Expansionary Uptrend"
    : trend === "Bearish"
    ? "Correctional Downtrend"
    : "Consolidation Range";

  const action = trend === "Bullish"
    ? "Accumulate on pullbacks toward 20 EMA"
    : trend === "Bearish"
    ? "Preserve capital or hedge in USYC"
    : "Range-bound mean reversion trade";

  const upsideDist = Math.max(0, indicators.resistance - px);
  const downsideDist = Math.max(0.01, px - invalidation);
  const rr = Math.round((upsideDist / downsideDist) * 10) / 10;

  const fmtUsd = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

  const setup = `${pair.base} trades ${trend.toLowerCase()} at ${fmtUsd(px)}. Structure holds ${px >= indicators.ema20 ? "above" : "below"} 20 EMA (${fmtUsd(indicators.ema20)}) with RSI at ${fmt(indicators.rsi, 1)} and MACD histogram at ${fmt(indicators.macdHist, 2)}.`;

  const thesis = trend === "Bullish"
    ? `Strong demand confluence above ${fmtUsd(indicators.ema20)} with MACD expansion. Immediate resistance rests at the 30-bar swing high of ${fmtUsd(indicators.resistance)}.`
    : trend === "Bearish"
    ? `Supply absorption dominant below ${fmtUsd(indicators.ema20)}. Key support sits at 30-bar swing low of ${fmtUsd(indicators.support)}; watch for exhaustion.`
    : `Consolidation corridor between support (${fmtUsd(indicators.support)}) and resistance (${fmtUsd(indicators.resistance)}). Volume equilibrium intact.`;

  return {
    kind: "market",
    pair: pairKey,
    timeframe,
    price: px,
    trend,
    momentum,
    regime,
    action,
    thesis,
    support: indicators.support,
    resistance: indicators.resistance,
    setup,
    invalidation,
    risk,
    rr: Number.isFinite(rr) && rr > 0 ? rr : 1.5,
    entryZone: `${fmtUsd(px * 0.998)} - ${fmtUsd(px * 1.002)}`,
    confidence: trend === "Bullish" && momentum === "Positive" ? 0.68 : 0.54,
    why: `Deterministic inputs: EMA20 ${fmtUsd(indicators.ema20)}, EMA50 ${fmtUsd(indicators.ema50)}, RSI ${fmt(indicators.rsi, 1)}, MACD histogram ${fmt(indicators.macdHist, 2)}, 30-bar swing high ${fmtUsd(indicators.resistance)} / low ${fmtUsd(indicators.support)}.`,
    invalidateText: `A 4H close through ${fmtUsd(invalidation)} would negate the current ${trend.toLowerCase()} structure.`,
  };
}

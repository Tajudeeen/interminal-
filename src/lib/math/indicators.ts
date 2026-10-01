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

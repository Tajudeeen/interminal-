export interface MarketPair {
  base: string;
  quote: string;
  price: number;
  change: number;
  high: number;
  low: number;
  vol: number;
  tvl: number;
  cat: "rwa_fx" | "bluechip" | "defi" | "arc" | "imported" | string;
  oracle?: string;
  decimals?: number;
  address?: string;
  seed?: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Indicators {
  ema20: number;
  ema50: number;
  ema200: number;
  rsi: number;
  macd?: number;
  signal?: number;
  macdHist: number;
  support: number;
  resistance: number;
  series?: {
    e20: number[];
    e50: number[];
    e200: number[];
  };
}

export interface MarketAnalysis {
  kind: "market";
  pair: string;
  timeframe: string;
  price: number;
  trend: "Bullish" | "Bearish" | "Range";
  momentum: "Positive" | "Negative" | "Neutral";
  regime: string;
  action: string;
  thesis: string;
  support: number;
  resistance: number;
  setup: string;
  invalidation: number;
  risk: "Elevated" | "Medium" | "Low";
  rr: number;
  entryZone: string;
  confidence: number;
  why: string;
  invalidateText: string;
}

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1D";
export type ChartMode = "candles" | "line";

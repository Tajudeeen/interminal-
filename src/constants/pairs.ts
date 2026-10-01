import { MarketPair, Timeframe } from "../types/market";

export const TF_ALLOW = new Set<Timeframe>(["1m", "5m", "15m", "1h", "4h", "1D"]);

export function assertPair(key: string): string {
  if (!PAIRS[key]) throw new Error("Unknown market: " + key);
  return key;
}

export const TOKEN_META: Record<string, { name: string; decimals: number; cat?: string; address?: string }> = {
  USDC:   { name: "Native USD Coin (Gas)", decimals: 18, cat: "stable" },
  USDC_E: { name: "Bridged USD Coin", decimals: 6, cat: "stable", address: "0x3600000000000000000000000000000000000000" },
  WETH:   { name: "Wrapped Ether", decimals: 18, cat: "bluechip", address: "0x128cC466B61f542da60c70e3aA11c10e19B84EDB" },
  EURC:   { name: "Circle Euro Coin", decimals: 6, cat: "rwa_fx", address: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1" },
  USYC:   { name: "Hashnote Tokenized US Treasuries", decimals: 6, cat: "rwa_fx", address: "0x8a5D989Bbb96929F689B0200f435f53dA42bF490" },
  cirBTC: { name: "Arc Bridged Bitcoin", decimals: 8, cat: "bluechip", address: "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0" },
  WBTC:   { name: "Wrapped Bitcoin", decimals: 8, cat: "bluechip", address: "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0" },
  UNI:    { name: "Uniswap Governance", decimals: 18, cat: "defi" },
  LINK:   { name: "Chainlink", decimals: 18, cat: "defi" },
  AAVE:   { name: "Aave", decimals: 18, cat: "defi" },
  SOL:    { name: "Solana", decimals: 9, cat: "bluechip" },
  ARB:    { name: "Arbitrum", decimals: 18, cat: "arc" },
  OP:     { name: "Optimism", decimals: 18, cat: "arc" },
};

export const PAIRS: Record<string, MarketPair> = {
  "ETH/USDC":     { base: "ETH",    quote: "USDC", price: 2733.05, change: 2.54, high: 2780,   low: 2680,   vol: 64100000, tvl: 18420000, seed: 11, cat: "bluechip", oracle: "Pyth V2", decimals: 18, address: "0x128cC466B61f542da60c70e3aA11c10e19B84EDB" },
  "BTC/USDC":     { base: "BTC",    quote: "USDC", price: 84176.37, change: 1.66, high: 85200, low: 83100, vol: 88200000, tvl: 31600000, seed: 33, cat: "bluechip", oracle: "Pyth V2", decimals: 8, address: "0x171A4217b86A807A64eB94757Db6849fb4bDbAA0" },
  "EURC/USDC":    { base: "EURC",   quote: "USDC", price: 1.0845,   change: 0.12, high: 1.087,  low: 1.081,  vol: 14200000, tvl: 29400000, seed: 77, cat: "rwa_fx",   oracle: "ECB · Pyth", decimals: 6, address: "0xbEf5f6d51CB62b58e6A8f77868681825C6fe21c1" },
  "USYC/USDC":    { base: "USYC",   quote: "USDC", price: 1.0664,   change: 0.02, high: 1.0665, low: 1.0663, vol: 28500000, tvl: 85000000, seed: 88, cat: "rwa_fx",   oracle: "Hashnote NAV", decimals: 6, address: "0x8a5D989Bbb96929F689B0200f435f53dA42bF490" },
  "ARC/USDC":     { base: "ARC",    quote: "USDC", price: 1.84,     change: 8.12, high: 1.92,   low: 1.61,   vol: 12400000, tvl: 9100000,  seed: 22, cat: "arc",      oracle: "Arc AMM", decimals: 18 },
  "SOL/USDC":     { base: "SOL",    quote: "USDC", price: 148.9,    change: -0.62, high: 154.2, low: 146.1, vol: 19700000, tvl: 6400000,  seed: 44, cat: "bluechip", oracle: "Pyth V2", decimals: 9 },
  "AVAX/USDC":    { base: "AVAX",   quote: "USDC", price: 28.14,    change: 3.21, high: 28.9,   low: 26.8,   vol: 4800000,  tvl: 2100000,  seed: 55, cat: "bluechip", oracle: "Pyth V2", decimals: 18 },
  "SUI/USDC":     { base: "SUI",    quote: "USDC", price: 2.84,     change: 1.42, high: 2.94,   low: 2.71,   vol: 8100000,  tvl: 3200000,  seed: 91, cat: "bluechip", oracle: "Pyth V2", decimals: 9 },
  "ARB/USDC":     { base: "ARB",    quote: "USDC", price: 0.612,    change: -1.08, high: 0.641, low: 0.598, vol: 6300000,  tvl: 2800000,  seed: 82, cat: "bluechip", oracle: "Pyth V2", decimals: 18 },
  "OP/USDC":      { base: "OP",     quote: "USDC", price: 1.14,     change: 0.93, high: 1.18,   low: 1.10,   vol: 4900000,  tvl: 2000000,  seed: 73, cat: "bluechip", oracle: "Pyth V2", decimals: 18 },
  "NEAR/USDC":    { base: "NEAR",   quote: "USDC", price: 4.08,     change: 2.71, high: 4.22,   low: 3.94,   vol: 5500000,  tvl: 1700000,  seed: 64, cat: "bluechip", oracle: "Pyth V2", decimals: 24 },
  "LINK/USDC":    { base: "LINK",   quote: "USDC", price: 13.62,    change: 0.84, high: 13.91,  low: 13.2,   vol: 3100000,  tvl: 1400000,  seed: 66, cat: "defi",     oracle: "Pyth V2", decimals: 18 },
  "AAVE/USDC":    { base: "AAVE",   quote: "USDC", price: 212.4,    change: 3.55, high: 219.8,  low: 205.1,  vol: 2400000,  tvl: 1100000,  seed: 57, cat: "defi",     oracle: "Pyth V2", decimals: 18 },
  "UNI/USDC":     { base: "UNI",    quote: "USDC", price: 7.38,     change: 1.22, high: 7.61,   low: 7.14,   vol: 3700000,  tvl: 1500000,  seed: 48, cat: "defi",     oracle: "Pyth V2", decimals: 18 },
};

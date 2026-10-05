export type TradeSide = "buy" | "sell";
export type OrderType = "market" | "dca";

export interface TradeQuoteParams {
  side: TradeSide;
  amountUsd: number;
  price: number;
  slippageBps?: number;
}

export interface TradeQuote {
  context?: { pair: string; side: TradeSide; amount: number; slippage: number; address: string | null; mode: string };
  raw?: { amountIn: string; minOut: string; tokenIn: string; tokenOut: string };
  price: number;
  received: number;
  effective: number;
  impact: number;
  minReceived: number;
  slippageBps: number;
  rate?: number;
  gasUsd: number | string;
  expiresAt: number;
}

export interface Eip712Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

export interface TradeTicketMessage {
  trader: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  minAmountOut: string;
  nonce: number;
  deadline: number;
}

export interface TradeTicket {
  types: {
    EIP712Domain: Array<{ name: string; type: string }>;
    TradeTicket: Array<{ name: string; type: string }>;
  };
  primaryType: "TradeTicket";
  domain: Eip712Domain;
  message: TradeTicketMessage;
  raw?: any;
  meta?: any;
}

export interface DcaPlan {
  id: string;
  pair: string;
  totalBudget: number;
  sliceAmount: number;
  intervalSec: number;
  maxSlippageBps?: number;
  totalSlices: number;
  completedSlices?: number;
  slicesExecuted?: number;
  executedBudget?: number;
  totalSpent?: number;
  totalReceived?: number;
  avgFillPrice?: number;
  status: "active" | "paused" | "completed" | "cancelled";
  createdAt?: number;
  nextRun?: number;
}

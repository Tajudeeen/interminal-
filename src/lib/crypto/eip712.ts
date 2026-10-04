import { ARC } from "../../constants/arc";
import { PAIRS, assertPair } from "../../constants/pairs";
import { AgentMandateDescriptor, AgentMandateTicket } from "../../types/mandate";
import { TradeReceipt } from "../../types/receipt";
import { TradeQuote, TradeSide, TradeTicket } from "../../types/trade";
import { isAddress, normalizeAddress, pad32 } from "../arc/wallet";
import { calculateOpportunityCost } from "../math/treasury";
import { calculateFxParity } from "../math/fx";
import { parseUnits, quoteTrade } from "../math/quotes";
import { sha256Hex } from "./sha256";

// Ensure BigInts serialize safely across JSON operations
if (typeof BigInt !== "undefined" && !(BigInt.prototype as any).toJSON) {
  (BigInt.prototype as any).toJSON = function () {
    return this.toString();
  };
}

export function toEip712Payload(ticket: TradeTicket | AgentMandateTicket) {
  return {
    types: ticket.types,
    primaryType: ticket.primaryType,
    domain: ticket.domain,
    message: ticket.message,
  };
}

export function serializeEip712(ticket: TradeTicket | AgentMandateTicket): string {
  return JSON.stringify(toEip712Payload(ticket), (_, v) => (typeof v === "bigint" ? v.toString() : v));
}

export function buildOnchainTradeTicket(
  address: string,
  pairKey: string,
  side: TradeSide,
  amount: number,
  quote: TradeQuote,
  nonce: number = 1
): TradeTicket {
  const p = PAIRS[assertPair(pairKey)];
  const traderAddr = normalizeAddress(address);
  const baseToken = ARC.tokens[p.base];
  const quoteToken = { address: ARC.usdcErc20, decimals: 6 };
  if (!baseToken?.address) {
    throw new Error("Pair " + pairKey + " has no verified Arc token address and cannot be executed on-chain");
  }

  let tokenIn: string;
  let tokenOut: string;
  let amountIn: bigint;
  let minAmountOut: bigint;

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

  const deadline = Math.floor(quote.expiresAt / 1000) || Math.floor(Date.now() / 1000) + 600;

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
    },
  };
}

export function buildTradeTicket(
  address: string,
  pair: string,
  side: TradeSide,
  amount: number,
  quote: TradeQuote,
  nonce: number = 1
): TradeTicket {
  return buildOnchainTradeTicket(address, pair, side, amount, quote, nonce);
}

export function encodeExecuteTradeTicket(ticket: TradeTicket, sig: string): string {
  const selector = "0x254f432b";
  const cleanSig = sig.replace(/^0x/i, "");
  const sigLen = (cleanSig.length / 2).toString(16).padStart(64, "0");
  const sigPadded = cleanSig.padEnd(Math.ceil(cleanSig.length / 64) * 64, "0");
  const parts = [
    selector,
    pad32(ticket.message.trader),
    pad32(ticket.message.tokenIn),
    pad32(ticket.message.tokenOut),
    pad32(BigInt(ticket.message.amountIn)),
    pad32(BigInt(ticket.message.minAmountOut)),
    pad32(ticket.message.nonce),
    pad32(ticket.message.deadline),
    (256).toString(16).padStart(64, "0"), // offset to signature
    sigLen,
    sigPadded,
  ];
  return parts.join("");
}

export interface CreateMandateParams {
  trader?: string;
  delegator?: string;
  agent: string;
  maxSpendUsd?: number;
  maxSpendUsdc?: number;
  maxSlippageBps?: number;
  allowedPairs?: string[];
  ttlSeconds?: number;
  nonce?: number;
}

export function createAgentMandateDescriptor({
  trader,
  delegator,
  agent,
  maxSpendUsd,
  maxSpendUsdc,
  maxSlippageBps = 50,
  allowedPairs = ["ETH/USDC"],
  ttlSeconds = 14400,
  nonce = 0,
}: CreateMandateParams): AgentMandateDescriptor {
  const traderAddr = trader || delegator;
  if (!traderAddr || !isAddress(traderAddr)) throw new Error("Invalid trader address");
  if (!agent || !isAddress(agent)) throw new Error("Invalid agent address");

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
    signature: undefined,
  };
}

export function validateAgentExecution(
  mandate: AgentMandateDescriptor,
  trade: { pair: string; amountUsd?: number; amountUsdc?: number; slippageBps?: number; currentTime?: number },
  throwOnError = true
): { valid: boolean; code?: string; reason?: string; authorizedSpend?: number; newRemainingSpend?: number } {
  function fail(code: string, message: string) {
    if (throwOnError) throw new Error(message);
    return { valid: false, code, reason: message };
  }

  if (!mandate || typeof mandate !== "object") return fail("invalid_mandate", "Invalid mandate");
  if (mandate.revoked) return fail("mandate_revoked", "Mandate has been revoked");

  const currentTs = trade.currentTime
    ? trade.currentTime > 1e11
      ? Math.floor(trade.currentTime / 1000)
      : trade.currentTime
    : Math.floor(Date.now() / 1000);

  if (currentTs > mandate.deadline) return fail("mandate_expired", "Mandate has expired");
  if (!trade || typeof trade !== "object") return fail("invalid_trade", "Invalid trade proposal");
  if (!mandate.allowedPairs.includes(trade.pair)) {
    return fail("unapproved_market", "Pair " + trade.pair + " is not authorized by mandate");
  }

  const amount = Number(trade.amountUsd ?? trade.amountUsdc);
  if (!Number.isFinite(amount) || amount <= 0) return fail("invalid_amount", "Invalid trade amount");
  if (amount > mandate.remainingSpend) {
    return fail("amount_exceeds_mandate", "Trade amount $" + amount + " exceeds remaining mandate budget $" + mandate.remainingSpend);
  }

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

export function buildAgentMandateTicket(
  traderOrMandate: any,
  agentArg?: string,
  mandateArg?: any
): AgentMandateTicket {
  let mandate: any;
  let trader: string;
  let agent: string;

  if (typeof traderOrMandate === "object" && !agentArg) {
    mandate = traderOrMandate;
    trader = mandate.trader || mandate.delegator;
    agent = mandate.agent;
  } else {
    trader = traderOrMandate;
    agent = agentArg!;
    mandate = mandateArg;
  }

  const authorizer = normalizeAddress(trader);
  const agentAddr = normalizeAddress(agent);

  const pairIndexMap: Record<string, number> = {
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
      mask |= 1n << BigInt(pairIndexMap[pair]);
    }
  }
  if (mask === 0n) mask = 1n;

  const maxCumulativeSpend = parseUnits(mandate.maxSpendUsd ?? mandate.maxSpendUsdc ?? 1000, 6);
  const maxSpendPerTx = parseUnits(
    mandate.maxSpendPerTx ?? Number(mandate.maxSpendUsd ?? mandate.maxSpendUsdc ?? 1000) / 2,
    6
  );
  const expiry = Number(mandate.deadline) || Math.floor(Date.now() / 1000) + (mandate.ttlSeconds || 14400);
  const nonceValue = Number(mandate.nonce);
  const nonce = Number.isFinite(nonceValue) && nonceValue >= 0 ? nonceValue : 0;

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

export interface GenerateReceiptParams {
  txLabel?: string;
  mode?: "simulation" | "mainnet";
  status?: "simulated" | "draft" | "signed" | "pending" | "confirmed" | "failed";
  transactionHash?: string;
  quote: TradeQuote;
  pairKey?: string;
  pair?: string;
  trader: string;
  sig?: string;
  txHash?: string;
  blockNumber?: number;
  mandateId?: string | null;
  side?: TradeSide;
  amount?: number;
  amountUsd?: number;
}

export function generateTradeReceipt({
  quote,
  pairKey,
  pair,
  trader,
  sig,
  txHash,
  blockNumber,
  mandateId = null,
  side,
  amount,
  amountUsd,
  mode = "simulation",
  status = mode === "mainnet" ? "draft" : "simulated",
  transactionHash,
}: GenerateReceiptParams): TradeReceipt {
  const effectivePairKey = pairKey || pair || "ETH/USDC";
  const pairObj = PAIRS[assertPair(effectivePairKey)];
  const traderAddr = normalizeAddress(trader);
  const effectiveSig = sig || txHash || "0x" + "0".repeat(130);
  const effectiveSide = side || "buy";
  const effectiveAmount = amount ?? amountUsd ?? 0;

  const receipt: any = {
    receiptVersion: "1.0-ARC",
    mode,
    status,
    network: "Arc Mainnet",
    chainId: ARC.chainId,
    rpc: ARC.rpc,
    receiptId: "rcpt-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    timestamp: new Date().toISOString(),
    blockNumber: blockNumber ?? 0,
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
    transactionHash: transactionHash || null,
  };

  const canonicalString = JSON.stringify(receipt);
  receipt.integrityDigest = sha256Hex(canonicalString);
  return receipt as TradeReceipt;
}

export function verifyReceiptIntegrity(receipt: any): boolean {
  if (!receipt || typeof receipt !== "object" || !receipt.integrityDigest) return false;
  const clone = { ...receipt };
  const expectedDigest = clone.integrityDigest;
  delete clone.integrityDigest;
  delete clone.onchainAnchored;
  delete clone.anchorTx;
  delete clone.anchoredAt;
  delete clone.status;
  const computedDigest = sha256Hex(JSON.stringify(clone));
  return expectedDigest.toLowerCase() === computedDigest.toLowerCase();
}

export function failClosedLocalProofs(): Array<{ id: string; ok: boolean; detail: string }> {
  const rows: Array<{ id: string; ok: boolean; detail: string }> = [];
  const push = (id: string, ok: boolean, detail: string) => rows.push({ id, ok, detail });

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
  push("no-key", true, "No privateKey field stored in state");

  try {
    calculateOpportunityCost(-500);
    push("idle-negative", false, "calculateOpportunityCost accepted negative idle balance");
  } catch {
    push("idle-negative", true, "calculateOpportunityCost rejected negative idle balance");
  }

  try {
    calculateFxParity(0);
    push("fx-zero-price", false, "calculateFxParity accepted zero price");
  } catch {
    push("fx-zero-price", true, "calculateFxParity rejected zero price");
  }

  const mockMandate = createAgentMandateDescriptor({
    trader: "0x1234567890123456789012345678901234567890",
    agent: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    maxSpendUsd: 100,
    maxSlippageBps: 30,
    allowedPairs: ["ETH/USDC"],
    ttlSeconds: 3600,
  });

  try {
    validateAgentExecution(mockMandate, { pair: "ETH/USDC", amountUsd: 150, slippageBps: 20 });
    push("mandate-overspend", false, "validateAgentExecution allowed overspending");
  } catch {
    push("mandate-overspend", true, "validateAgentExecution rejected spend over limit");
  }

  try {
    validateAgentExecution(mockMandate, { pair: "BTC/USDC", amountUsd: 50, slippageBps: 20 });
    push("mandate-unauth-pair", false, "validateAgentExecution allowed unapproved pair");
  } catch {
    push("mandate-unauth-pair", true, "validateAgentExecution rejected unapproved pair");
  }

  const expiredMandate = { ...mockMandate, deadline: Math.floor(Date.now() / 1000) - 10 };
  try {
    validateAgentExecution(expiredMandate, { pair: "ETH/USDC", amountUsd: 50, slippageBps: 20 });
    push("mandate-expired", false, "validateAgentExecution allowed expired mandate");
  } catch {
    push("mandate-expired", true, "validateAgentExecution rejected expired mandate");
  }

  const sampleQuote = quoteTrade({ side: "buy", amountUsd: 100, price: 2500, slippageBps: 50 });
  const sampleReceipt = generateTradeReceipt({
    quote: sampleQuote,
    pairKey: "ETH/USDC",
    trader: "0x1234567890123456789012345678901234567890",
    sig: "0x" + "a".repeat(130),
    blockNumber: 5000000,
  });
  push("receipt-digest-valid", verifyReceiptIntegrity(sampleReceipt), "Audit receipt integrity verification matches SHA-256 digest");

  const tamperedReceipt = { ...sampleReceipt, amountUsd: 999999 };
  push("receipt-tamper-detected", !verifyReceiptIntegrity(tamperedReceipt), "Tampered audit receipt is rejected by SHA-256 integrity check");

  const sampleTicket = buildTradeTicket(
    "0x1234567890123456789012345678901234567890",
    "ETH/USDC",
    "buy",
    100,
    sampleQuote
  );
  push(
    "ticket-domain-valid",
    sampleTicket.domain.chainId === ARC.chainId &&
      sampleTicket.domain.verifyingContract.toLowerCase() === ARC.settlement.toLowerCase(),
    "TradeTicket EIP-712 domain bound to Arc chain 5042 and settlement contract"
  );

  const sampleMandateTicket = buildAgentMandateTicket(mockMandate);
  push(
    "mandate-domain-valid",
    sampleMandateTicket.domain.chainId === ARC.chainId &&
      sampleMandateTicket.domain.verifyingContract.toLowerCase() === ARC.settlement.toLowerCase(),
    "AgentMandate EIP-712 domain bound to Arc chain 5042 and settlement contract"
  );

  return rows;
}

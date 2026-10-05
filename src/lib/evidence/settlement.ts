import { generateTradeReceipt } from "../crypto/eip712";
import { PAIRS } from "../../constants/pairs";
import { ARC } from "../../constants/arc";
import type { TradeReceipt } from "../../types/receipt";
import { publicRpc, decodeTradeSettledExecution } from "../arc/rpcClient";
import { formatUnits, parseUnits } from "../math/quotes";
import { parseReceipt } from "./archive";

export const TRADE_SETTLED_TOPIC = "0x6b3c2ce72b7b275a10cd77f8750ffdb92c7a6bd7e9c40b8b81652fd1448e0bc8";
export type RpcRead = (method: string, params?: unknown[]) => Promise<any>;
export interface SettlementEvidence {
  version: 1;
  chainId: number;
  contract: string;
  transactionHash: string;
  blockNumber: number;
  trader: string;
  tokenIn: string;
  tokenOut: string;
  inputSymbol: string;
  outputSymbol: string;
  amountInRaw: string;
  amountOutRaw: string;
  amountIn: number;
  amountOut: number;
  executionReceiptHash: string;
  isTreasuryFlow: boolean;
  certificateMatched: boolean | null;
  certificateAnchored: boolean | null;
  checkedAt: string;
  anchorError?: string;
}
export async function verifySettlement(txHash: string, certificate?: TradeReceipt, rpc: RpcRead = publicRpc): Promise<SettlementEvidence> {
  if (!/^0x[\da-f]{64}$/i.test(txHash)) throw new Error("Enter a 0x transaction hash with 64 hex characters");
  const [chain, tx] = await Promise.all([rpc("eth_chainId"), rpc("eth_getTransactionReceipt", [txHash])]);
  if (Number(BigInt(chain)) !== ARC.chainId) throw new Error("RPC is not Arc Mainnet");
  if (!tx) throw new Error("Transaction not confirmed or not found on Arc");
  if (tx.status !== "0x1" || String(tx.transactionHash).toLowerCase() !== txHash.toLowerCase() ||
      String(tx.to).toLowerCase() !== ARC.settlement.toLowerCase()) throw new Error("Transaction is not a successful Interminal settlement");
  const blockNumber = Number(BigInt(tx.blockNumber));
  if (!Number.isSafeInteger(blockNumber) || blockNumber <= 0) throw new Error("Invalid settlement block");
  const logs = (tx.logs || []).filter((log: any) =>
    !log.removed && String(log.address).toLowerCase() === ARC.settlement.toLowerCase() &&
    log.topics?.[0]?.toLowerCase() === TRADE_SETTLED_TOPIC && log.topics.length === 3 &&
    /^0x[\da-f]{320}$/i.test(log.data) && log.topics.every((t: unknown) => typeof t === "string" && /^0x[\da-f]{64}$/i.test(t)));
  if (logs.length !== 1) throw new Error("Expected exactly one TradeSettled event from the settlement contract");
  const log = logs[0];
  const trader = "0x" + log.topics[2].slice(-40);
  const tokenIn = "0x" + log.data.slice(2, 66).slice(-40);
  const tokenOut = "0x" + log.data.slice(66, 130).slice(-40);
  const event = decodeTradeSettledExecution({ logs }, ARC.settlement, trader, tokenIn, tokenOut);
  if (!event || event.amountIn <= 0n || event.amountOut <= 0n) throw new Error("Invalid settlement amounts");
  const registry = [{ symbol: "USDC", address: ARC.usdcErc20, decimals: 6 },
    ...Object.entries(ARC.tokens).map(([symbol, meta]) => ({ symbol, ...meta }))];
  const input = registry.find(t => t.address.toLowerCase() === tokenIn.toLowerCase());
  const output = registry.find(t => t.address.toLowerCase() === tokenOut.toLowerCase());
  if (!input || !output) throw new Error("Settlement contains unregistered assets");
  let certificateAnchored: boolean | null = null;
  let anchorError: string | undefined;
  if (certificate) {
    const r = parseReceipt(certificate);
    const pair = PAIRS[r.pair];
    if (!pair?.address || pair.cat === "imported" || pair.address.toLowerCase() !== r.baseContract?.toLowerCase() || pair.base !== r.baseSymbol || r.quoteSymbol !== "USDC") throw new Error("Certificate market metadata does not match the Arc registry");
    const expectedIn = r.side === "buy" ? ARC.usdcErc20 : r.baseContract;
    const expectedOut = r.side === "buy" ? r.baseContract : ARC.usdcErc20;
    const rawIn = r.actualAmountInRaw;
    const rawOut = r.actualAmountOutRaw;
    if (r.mode !== "mainnet" || r.transactionHash?.toLowerCase() !== txHash.toLowerCase() ||
        r.trader.toLowerCase() !== trader.toLowerCase() || r.quoteContract.toLowerCase() !== ARC.usdcErc20.toLowerCase() ||
        expectedIn.toLowerCase() !== tokenIn.toLowerCase() || expectedOut.toLowerCase() !== tokenOut.toLowerCase() ||
        r.executionReceiptHash?.toLowerCase() !== event.receiptHash.toLowerCase() || r.blockNumber !== blockNumber ||
        (rawIn != null && rawIn !== event.amountIn.toString()) || (rawOut != null && rawOut !== event.amountOut.toString()) ||
        (r.side === "buy" && parseUnits(r.amountUsd, 6) !== event.amountIn) ||
        r.actualReceived !== formatUnits("0x" + event.amountOut.toString(16), output.decimals) ||
        event.amountOut < parseUnits(r.minReceived, output.decimals)) {
      throw new Error("Certificate does not match the on-chain settlement event");
    }
    // The certificate digest's anchor is an independent claim from execution provenance.
    try {
    const anchored = await rpc("eth_call", [{ to: ARC.settlement, data: "0x9815336b" + r.integrityDigest.replace(/^0x/, "") }, "latest"]);
    if (typeof anchored !== "string" || !/^0x[\da-f]{128}$/i.test(anchored)) throw new Error("Invalid certificate anchor response");
    certificateAnchored = BigInt("0x" + anchored.slice(2, 66)) === 1n;
    } catch (e) { anchorError = e instanceof Error ? e.message : String(e); }
  }
  return {
    version: 1, chainId: ARC.chainId, contract: ARC.settlement, transactionHash: txHash,
    blockNumber, trader, tokenIn, tokenOut, inputSymbol: input.symbol, outputSymbol: output.symbol,
    amountInRaw: event.amountIn.toString(), amountOutRaw: event.amountOut.toString(),
    amountIn: formatUnits("0x" + event.amountIn.toString(16), input.decimals),
    amountOut: formatUnits("0x" + event.amountOut.toString(16), output.decimals),
    executionReceiptHash: event.receiptHash,
    isTreasuryFlow: new Set([input.symbol, output.symbol]).has("USYC") && new Set([input.symbol, output.symbol]).has("USDC"),
    certificateMatched: certificate ? true : null, certificateAnchored, anchorError, checkedAt: new Date().toISOString(),
  };
}


/** Rebuild event evidence only. Does not recover the original quote or wallet signature. */
export function reconstructReceiptFromEvent(e: SettlementEvidence): TradeReceipt {
  const side = e.inputSymbol === "USDC" ? "buy" : "sell";
  const baseAddress = side === "buy" ? e.tokenOut : e.tokenIn;
  const pairKey = Object.keys(PAIRS).find(key => PAIRS[key].address?.toLowerCase() === baseAddress.toLowerCase() && PAIRS[key].cat !== "imported");
  if (!pairKey || (e.inputSymbol !== "USDC" && e.outputSymbol !== "USDC")) throw new Error("Cannot reconstruct this token route");
  const usd = side === "buy" ? e.amountIn : e.amountOut;
  const base = side === "buy" ? e.amountOut : e.amountIn;
  return generateTradeReceipt({
    pairKey, side, amount: usd, trader: e.trader, mode: "mainnet", status: "confirmed",
    blockNumber: e.blockNumber, transactionHash: e.transactionHash, executionReceiptHash: e.executionReceiptHash,
    actualAmountInRaw: e.amountInRaw, actualAmountOutRaw: e.amountOutRaw, actualReceived: e.amountOut,
    recoveredFromEvent: true, mandateId: "Event recovery. Original quote and wallet signature not recovered.",
    quote: { price: usd / base, effective: usd / base, received: e.amountOut, minReceived: 0, impact: 0,
      slippageBps: 0, gasUsd: "Not recovered", expiresAt: 0 },
  });
}

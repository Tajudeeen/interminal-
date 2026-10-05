import fs from "node:fs";
import { createHash } from "node:crypto";
import { ethers } from "ethers";
import { arcRpc, ARC_RPC } from "./arcRpc.mjs";

const SETTLEMENT = "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36";
const USDC = "0x3600000000000000000000000000000000000000";
const USYC = "0x8a5D989Bbb96929F689B0200f435f53dA42bF490";
const ABI = new ethers.Interface(["event TradeSettled(bytes32 indexed receiptHash,address indexed trader,address tokenIn,address tokenOut,uint256 amountIn,uint256 amountOut,uint256 timestamp)"]);
const args = process.argv.slice(2);
const fileIndex = args.indexOf("--receipt");
let certificate;
if (fileIndex >= 0) {
  if (!args[fileIndex + 1]) throw new Error("Provide the exported receipt JSON path after --receipt");
  const bytes = fs.readFileSync(args[fileIndex + 1]);
  if (bytes.length > 2_000_000) throw new Error("Receipt exceeds 2 MB");
  const parsed = JSON.parse(bytes.toString("utf8"));
  certificate = parsed.certificate || parsed;
}
const txHash = certificate?.transactionHash || args.find(v => /^0x[\da-f]{64}$/i.test(v));
if (!txHash) {
  console.error("Usage: npm run verify:execution -- 0xTRANSACTION_HASH\n       npm run verify:execution -- --receipt exported-receipt.json");
  process.exit(1);
}
function requireMatch(condition, label) { if (!condition) throw new Error(label); }
async function main() {
  const [chain, tx] = await Promise.all([arcRpc("eth_chainId"), arcRpc("eth_getTransactionReceipt", [txHash])]);
  requireMatch(Number(BigInt(chain)) === 5042, "Wrong Arc chain");
  requireMatch(tx?.status === "0x1" && tx.to?.toLowerCase() === SETTLEMENT.toLowerCase() && tx.transactionHash?.toLowerCase() === txHash.toLowerCase(), "Not a successful settlement transaction");
  const events = tx.logs.filter(log => !log.removed && log.address?.toLowerCase() === SETTLEMENT.toLowerCase() && log.topics?.[0] === ABI.getEvent("TradeSettled").topicHash);
  requireMatch(events.length === 1, "Expected exactly one TradeSettled event");
  const event = ABI.parseLog(events[0]).args;
  requireMatch(event.amountIn > 0n && event.amountOut > 0n, "Invalid settled amounts");
  let certificateAnchored = null;
  let anchorError;
  if (certificate) {
    const payload = { ...certificate };
    for (const key of ["integrityDigest", "status", "onchainAnchored", "anchorTx", "anchoredAt"]) delete payload[key];
    const digest = "0x" + createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
    requireMatch(digest.toLowerCase() === certificate.integrityDigest?.toLowerCase(), "Certificate digest mismatch");
    requireMatch(certificate.mode === "mainnet" && certificate.chainId === 5042 &&
      certificate.blockNumber === Number(BigInt(tx.blockNumber)) && certificate.trader?.toLowerCase() === event.trader.toLowerCase() &&
      certificate.executionReceiptHash?.toLowerCase() === event.receiptHash.toLowerCase() && certificate.quoteContract?.toLowerCase() === USDC.toLowerCase(), "Certificate provenance mismatch");
    const tokenIn = certificate.side === "buy" ? USDC : certificate.baseContract;
    const tokenOut = certificate.side === "buy" ? certificate.baseContract : USDC;
    requireMatch(tokenIn?.toLowerCase() === event.tokenIn.toLowerCase() && tokenOut?.toLowerCase() === event.tokenOut.toLowerCase(), "Certificate route mismatch");
    requireMatch(certificate.actualAmountInRaw === event.amountIn.toString() && certificate.actualAmountOutRaw === event.amountOut.toString(), "Exact raw amounts missing or mismatched");
    const decimals = new Map([[USDC.toLowerCase(), 6], [USYC.toLowerCase(), 6],
      ["0x128cc466b61f542da60c70e3aa11c10e19b84edb", 18], ["0xbef5f6d51cb62b58e6a8f77868681825c6fe21c1", 6],
      ["0x171a4217b86a807a64eb94757db6849fb4bdbaa0", 8]]);
    const outputDecimals = decimals.get(event.tokenOut.toLowerCase());
    requireMatch(outputDecimals != null, "Unregistered output asset");
    requireMatch(certificate.actualReceived === Number(ethers.formatUnits(event.amountOut, outputDecimals)), "Certificate displayed output mismatch");
    requireMatch(Number.isFinite(certificate.minReceived) && certificate.minReceived >= 0 && ethers.parseUnits(certificate.minReceived.toFixed(outputDecimals), outputDecimals) <= event.amountOut, "Certificate output floor mismatch");
    if (certificate.side === "buy") requireMatch(ethers.parseUnits(certificate.amountUsd.toFixed(6), 6) === event.amountIn, "Certificate USDC spend mismatch");
    try {
      const anchor = await arcRpc("eth_call", [{ to: SETTLEMENT, data: "0x9815336b" + digest.slice(2) }, "latest"]);
      certificateAnchored = BigInt("0x" + anchor.slice(2, 66)) === 1n;
    } catch (e) { anchorError = e.message; }
  }
  const isTreasuryFlow = [event.tokenIn.toLowerCase(), event.tokenOut.toLowerCase()].includes(USYC.toLowerCase()) &&
    [event.tokenIn.toLowerCase(), event.tokenOut.toLowerCase()].includes(USDC.toLowerCase());
  console.log(JSON.stringify({ verified: true, rpc: ARC_RPC, chainId: 5042, contract: SETTLEMENT, transactionHash: txHash,
    blockNumber: Number(BigInt(tx.blockNumber)), trader: event.trader, tokenIn: event.tokenIn, tokenOut: event.tokenOut,
    amountInRaw: event.amountIn.toString(), amountOutRaw: event.amountOut.toString(), executionReceiptHash: event.receiptHash,
    isTreasuryFlow, certificateMatched: certificate ? true : null, certificateAnchored, anchorError }, null, 2));
  if (!isTreasuryFlow) console.error("This is a token trade. It does not prove the USDC/USYC treasury workflow.");
}
main().catch(e => { console.error("FAIL execution verification:", e.message); process.exitCode = 1; });

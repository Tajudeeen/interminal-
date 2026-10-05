import { describe, it, expect, vi } from "vitest";
import { ARC } from "../constants/arc";
import { verifySettlement, reconstructReceiptFromEvent, TRADE_SETTLED_TOPIC } from "../lib/evidence/settlement";
import { ARCHIVE_KEY, readArchive, saveArchive, parseReceiptFile } from "../lib/evidence/archive";
import { generateTradeReceipt } from "../lib/crypto/eip712";
import { assertCashReserve, readWalletReserve, saveWalletReserve } from "../lib/math/reserve";

const txHash = "0x" + "1".repeat(64);
const eventHash = "0x" + "2".repeat(64);
const trader = "0x" + "a".repeat(40);
const word = (s: string) => s.replace(/^0x/, "").padStart(64, "0");
const makeTx = () => ({
  status: "0x1", transactionHash: txHash, to: ARC.settlement, blockNumber: "0x64",
  logs: [{ address: ARC.settlement, topics: [TRADE_SETTLED_TOPIC, eventHash, "0x" + word(trader)],
    data: "0x" + word(ARC.usdcErc20) + word(ARC.tokens.USYC.address) + word((100_000_000n).toString(16)) + word((88_000_000n).toString(16)) + word("1") }],
});
const receipt = () => generateTradeReceipt({
  quote: { received: 88, minReceived: 87, price: 100 / 88, effective: 100 / 88, impact: 0, slippageBps: 50, gasUsd: "Wallet estimates", expiresAt: Date.now() + 60_000 },
  pairKey: "USYC/USDC", trader, side: "buy", amount: 100, mode: "mainnet", status: "confirmed",
  transactionHash: txHash, executionReceiptHash: eventHash, blockNumber: 100, actualReceived: 88,
  actualAmountInRaw: "100000000", actualAmountOutRaw: "88000000",
});
const rpcFor = (tx = makeTx(), anchor = true) => async (method: string) =>
  method === "eth_chainId" ? ARC.chainIdHex : method === "eth_getTransactionReceipt" ? tx : "0x" + word(anchor ? "1" : "0") + word("1");

describe("independent execution evidence", () => {
  it("verifies the treasury event and exact certificate raw amounts", async () => {
    const r = await verifySettlement(txHash, receipt(), rpcFor());
    expect(r.isTreasuryFlow).toBe(true);
    expect(r.amountInRaw).toBe("100000000");
    expect(r.amountOut).toBe(88);
    expect(r.certificateMatched).toBe(true);
    expect(r.certificateAnchored).toBe(true);
  });
  it("reconstructs verifiable event evidence without inventing an original quote", async () => {
    const event = await verifySettlement(txHash, undefined, rpcFor());
    const recovered = reconstructReceiptFromEvent(event);
    expect(recovered.recoveredFromEvent).toBe(true);
    expect(recovered.minReceived).toBe(0);
    expect(recovered.mandateId).toContain("not recovered");
    expect((await verifySettlement(txHash, recovered, rpcFor())).certificateMatched).toBe(true);
  });
  it("does not equate a confirmed trade with an anchored certificate", async () => {
    expect((await verifySettlement(txHash, receipt(), rpcFor(makeTx(), false))).certificateAnchored).toBe(false);
    expect((await verifySettlement(txHash, undefined, rpcFor())).certificateMatched).toBeNull();
  });
  it("rejects reverted, unrelated, pending, wrong-chain and wrong-topic transactions", async () => {
    const reverted = makeTx(); reverted.status = "0x0";
    const unrelated = makeTx(); unrelated.to = trader;
    const wrongTopic = makeTx(); wrongTopic.logs[0].topics[0] = eventHash;
    for (const tx of [reverted, unrelated, wrongTopic]) await expect(verifySettlement(txHash, undefined, rpcFor(tx))).rejects.toThrow();
    await expect(verifySettlement(txHash, undefined, async method => method === "eth_chainId" ? "0x1" : makeTx())).rejects.toThrow("not Arc");
    await expect(verifySettlement(txHash, undefined, async method => method === "eth_chainId" ? ARC.chainIdHex : null)).rejects.toThrow("not confirmed");
  });
  it("rejects tampering even if the attacker rehashes a certificate", async () => {
    const forged = generateTradeReceipt({
      quote: { received: 90, minReceived: 87, price: 1, effective: 1, impact: 0, slippageBps: 50, gasUsd: 0, expiresAt: 1 },
      pairKey: "USYC/USDC", trader, side: "buy", amount: 100, mode: "mainnet", status: "confirmed",
      transactionHash: txHash, executionReceiptHash: eventHash, blockNumber: 100, actualReceived: 90,
      actualAmountInRaw: "100000000", actualAmountOutRaw: "90000000",
    });
    await expect(verifySettlement(txHash, forged, rpcFor())).rejects.toThrow("does not match");
    const tampered = { ...receipt(), amountUsd: 1 };
    await expect(verifySettlement(txHash, tampered, rpcFor())).rejects.toThrow("digest");
  });
  it("retains execution verification when the optional digest anchor query fails", async () => {
    const report = await verifySettlement(txHash, receipt(), async method => {
      if (method === "eth_call") throw new Error("RPC timeout");
      return rpcFor()(method);
    });
    expect(report.certificateMatched).toBe(true);
    expect(report.certificateAnchored).toBeNull();
    expect(report.anchorError).toBe("RPC timeout");
  });
});

describe("device receipt archive", () => {
  const memory = () => {
    const data = new Map<string, string>();
    return { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, val: string) => { data.set(key, val); } };
  };
  it("survives fresh reads and workspace clears, and saves updated anchoring without duplicates", () => {
    const storage = memory(); const r = receipt();
    expect(saveArchive([r], storage)).toBe(true);
    expect(readArchive(storage)).toHaveLength(1);
    saveArchive([], storage);
    saveArchive([{ ...r, onchainAnchored: true, anchorTx: eventHash }], storage);
    expect(readArchive(storage)).toHaveLength(1);
    expect(readArchive(storage)[0].onchainAnchored).toBe(true);
  });
  it("ignores corrupt storage and rejects altered imported files", () => {
    const storage = memory(); storage.setItem(ARCHIVE_KEY, "oops");
    expect(readArchive(storage)).toEqual([]);
    expect(() => parseReceiptFile(JSON.stringify({ ...receipt(), amountUsd: 999 }))).toThrow();
    expect(() => parseReceiptFile("x".repeat(2_000_001))).toThrow("2 MB");
  });
  it("reports storage failure without treating it as settlement failure", () => {
    expect(saveArchive([receipt()], { getItem: () => null, setItem: () => { throw new Error("Quota"); } })).toBe(false);
  });
});

describe("cash reserve boundaries", () => {
  it("permits exact reserve and blocks one raw USDC unit below it", () => {
    expect(() => assertCashReserve(100_000_000n, 80_000_000n, 20)).not.toThrow();
    expect(() => assertCashReserve(100_000_000n, 80_000_001n, 20)).toThrow("reserve protected");
    expect(() => assertCashReserve(100_000_000n, 80_000_000n, 20.0000001)).toThrow();
    expect(() => assertCashReserve(100n, 1n, NaN)).toThrow();
  });
});


describe("wallet-specific reserve persistence", () => {
  it("restores an explicit zero reserve and isolates other wallets", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
    try {
      expect(saveWalletReserve(trader, 0)).toBe(true);
      expect(readWalletReserve(trader.toUpperCase(), 20)).toBe(0);
      expect(readWalletReserve("0x" + "b".repeat(40), 20)).toBe(20);
    } finally { vi.unstubAllGlobals(); }
  });
});

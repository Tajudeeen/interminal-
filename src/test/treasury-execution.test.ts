import { beforeEach, describe, expect, it, vi } from "vitest";
import { simulateTrade, simulateTreasury } from "../lib/math/simulation";
import { parseUnits } from "../lib/math/quotes";
import { ARC, TOKEN_ALLOW } from "../constants/arc";
import { PAIRS } from "../constants/pairs";

vi.mock("../lib/arc/rpcClient", () => ({
  routerAmountOut: vi.fn(async () => 2n * 10n ** 18n),
  loadOnchainPortfolio: vi.fn(async () => ({ USDC: 100 })),
  refreshLivePairValuation: vi.fn(async () => {}),
  readTraderNonce: vi.fn(async () => 0),
  erc20Allowance: vi.fn(async () => 10n ** 30n),
  sendApproval: vi.fn(),
  waitForTransactionReceipt: vi.fn(async () => ({
    blockNumber: 100,
    status: "0x1",
  })),
  decodeTradeSettledExecution: vi.fn(() => ({
    amountIn: 100_000_000n,
    amountOut: 2n * 10n ** 18n,
    receiptHash: "0x" + "1".repeat(64),
  })),
  publicRpc: vi.fn(async () => "0x" + (1000_000_000n).toString(16)),
  readMandateNonce: vi.fn(),
  verifyArcLive: vi.fn(),
  readErc20Metadata: vi.fn(),
}));
vi.mock("../lib/arc/receiptAnchor", () => ({
  anchorReceiptOnchain: vi.fn(async () => {
    throw new Error("Anchor rejected");
  }),
  checkReceiptAnchoredOnchain: vi.fn(async () => false),
}));
vi.mock("../lib/math/indicators", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getCandles: vi.fn(async () => ({
    candles: [],
    source: "unavailable",
    label: "offline",
  })),
}));
vi.mock("../lib/arc/wallet", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  walletRpc: vi.fn(async (method: string) =>
    method === "eth_chainId"
      ? ARC.chainIdHex
      : method === "eth_accounts"
        ? [trader]
        : method === "eth_signTypedData_v4"
          ? "0x" + "1".repeat(130)
          : "0x" + "2".repeat(64),
  ),
}));
import { useAppStore } from "../store/useAppStore";
import { routerAmountOut, readErc20Metadata, publicRpc } from "../lib/arc/rpcClient";
import { walletRpc } from "../lib/arc/wallet";
const trader = "0x" + "a".repeat(40);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(publicRpc).mockReset().mockResolvedValue("0x" + (1000_000_000n).toString(16));
  useAppStore.setState({
    environmentMode: "demo",
    livePortfolio: false,
    connected: true,
    address: null,
    wrongNetwork: false,
    executing: false,
    connecting: false,
    pair: "ETH/USDC",
    side: "buy",
    amount: 100,
    targetBufferUsd: 0,
    slippage: 0.5,
    balances: { USDC: 1000, USYC: 100 },
    pendingTransactions: [],
    pendingQuote: null,
    reviewOpen: false,
    auditReceipts: [],
    activity: [],
    lastTx: null,
    toasts: [],
  });
});

describe("asset conservation", () => {
  it("deducts USYC when a simulated buy exceeds liquid cash", () => {
    const next = simulateTrade(
      { USDC: 10, USYC: 100 },
      "ETH",
      "buy",
      60,
      30,
      2,
      1.25,
      0,
    );
    expect(next.USDC).toBe(0);
    expect(next.USYC).toBe(60);
    expect(next.ETH).toBe(2);
  });
  it("rejects unfunded buys and sells", () => {
    expect(() =>
      simulateTrade({ USDC: 10 }, "ETH", "buy", 60, 30, 2, 1.25, 0),
    ).toThrow();
    expect(() =>
      simulateTrade({ ETH: 1 }, "ETH", "sell", 60, 30, 60, 1.25, 0),
    ).toThrow();
  });
  it("unwinds token units at NAV and conserves total treasury value", () => {
    const next = simulateTreasury({ USDC: 10, USYC: 100 }, 40, "unwind", 1.25);
    expect(next).toEqual({ USDC: 60, USYC: 60 });
    expect(next.USDC + next.USYC * 1.25).toBe(135);
    expect(() => simulateTreasury(next, 61, "unwind", 1.25)).toThrow();
    expect(() => simulateTreasury(next, 61, "sweep", 1.25)).toThrow();
  });
  it("rejects malformed unit strings instead of silently taking a prefix", () => {
    expect(parseUnits("1oops", 6)).toBe(0n);
    expect(parseUnits("-1", 6)).toBe(0n);
    expect(parseUnits("1", -1)).toBe(0n);
    expect(parseUnits("1", 100)).toBe(0n);
  });
});

describe("reviewed execution", () => {
  it("blocks the unsupported live route before requesting any quote", async () => {
    useAppStore.setState({environmentMode:"mainnet",livePortfolio:true,address:trader});
    await useAppStore.getState().prepareTradeReview();
    expect(useAppStore.getState().reviewOpen).toBe(false);
    expect(routerAmountOut).not.toHaveBeenCalled();
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("blocks a changed amount after review", async () => {
    await useAppStore.getState().prepareTradeReview();
    useAppStore.setState({ amount: 200 });
    await useAppStore.getState().executeTrade();
    expect(useAppStore.getState().auditReceipts).toHaveLength(0);
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("blocks an expired review and duplicate execution", async () => {
    await useAppStore.getState().prepareTradeReview();
    useAppStore.setState({
      pendingQuote: { ...useAppStore.getState().pendingQuote!, expiresAt: 1 },
    });
    await useAppStore.getState().executeTrade();
    expect(useAppStore.getState().auditReceipts).toHaveLength(0);
    await useAppStore.getState().prepareTradeReview();
    useAppStore.setState({ executing: true });
    await useAppStore.getState().executeTrade();
    expect(useAppStore.getState().auditReceipts).toHaveLength(0);
  });
  it("refuses a restored legacy mainnet review at the broadcast boundary", async () => {
    await useAppStore.getState().prepareTradeReview();
    useAppStore.setState({environmentMode:"mainnet",livePortfolio:true,address:trader});
    await useAppStore.getState().executeTrade();
    expect(walletRpc).not.toHaveBeenCalled();
    expect(useAppStore.getState().auditReceipts).toEqual([]);
  });
  it("does not pretend mainnet automatically unwinds USYC", async () => {
    useAppStore.setState({
      environmentMode: "mainnet",
      livePortfolio: true,
      address: trader,
      balances: { USDC: 1, USYC: 1000 },
    });
    await useAppStore.getState().prepareTradeReview();
    expect(useAppStore.getState().reviewOpen).toBe(false);
  });
  it("clears balances and receipts when entering testnet", () => {
    useAppStore.getState().launchTestnet();
    expect(useAppStore.getState().balances).toEqual({});
    expect(useAppStore.getState().auditReceipts).toEqual([]);
  });
  it("does not import reference markets into executable mainnet review", async () => {
    useAppStore.setState({
      environmentMode: "mainnet",
      livePortfolio: true,
      address: trader,
      pair: "ARC/USDC",
    });
    expect(PAIRS["ARC/USDC"].address).toBeUndefined();
    await useAppStore.getState().prepareTradeReview();
    expect(useAppStore.getState().reviewOpen).toBe(false);
  });
});


describe("import isolation", () => {
  it("preserves the verified pair and its RPC allowlist during a colliding metadata import", async () => {
    const registered = PAIRS["ETH/USDC"];
    vi.mocked(readErc20Metadata).mockResolvedValue({ address: ARC.tokens.WETH.address.toLowerCase(), name: "Wrapped Ether", symbol: "ETH", decimals: 18 });
    await useAppStore.getState().importCustomToken(ARC.tokens.WETH.address);
    expect(TOKEN_ALLOW.has(ARC.tokens.WETH.address.toLowerCase())).toBe(true);
    expect(PAIRS["ETH/USDC"]).toBe(registered);
    expect(PAIRS[useAppStore.getState().pair].cat).toBe("imported");
  });
  it("removes temporary allowlist entries if arbitrary metadata reads fail", async () => {
    const address = "0x" + "b".repeat(40);
    vi.mocked(readErc20Metadata).mockRejectedValue(new Error("Metadata unavailable"));
    await useAppStore.getState().importCustomToken(address);
    expect(TOKEN_ALLOW.has(address)).toBe(false);
  });
});


describe("treasury readiness regressions", () => {
  it("blocks reserve-breaking buys before a review opens", async () => {
    useAppStore.setState({ targetBufferUsd: 950 });
    await useAppStore.getState().prepareTradeReview();
    expect(useAppStore.getState().reviewOpen).toBe(false);
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("invalidates a reviewed quote when the reserve changes", async () => {
    await useAppStore.getState().prepareTradeReview();
    useAppStore.getState().setTargetBufferUsd(950);
    await useAppStore.getState().executeTrade();
    expect(useAppStore.getState().pendingQuote).toBeNull();
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("rechecks fresh USDC before signing instead of trusting displayed balances", async () => {
    useAppStore.setState({ environmentMode: "mainnet", livePortfolio: true, address: trader, targetBufferUsd: 20 });
    await useAppStore.getState().prepareTradeReview();
    vi.mocked(publicRpc).mockResolvedValueOnce("0x" + (119_000_000n).toString(16));
    await useAppStore.getState().executeTrade();
    expect(walletRpc).not.toHaveBeenCalled();
    expect(useAppStore.getState().auditReceipts).toHaveLength(0);
  });
  it("requires confirmation before a demo treasury move changes balances or creates evidence", async () => {
    const before = { ...useAppStore.getState().balances };
    useAppStore.setState({ targetBufferUsd: 900 });
    await useAppStore.getState().executeSweepOnchain(100, "sweep");
    expect(useAppStore.getState().reviewOpen).toBe(true);
    expect(useAppStore.getState().balances).toEqual(before);
    expect(useAppStore.getState().auditReceipts).toHaveLength(0);
    const output = useAppStore.getState().pendingQuote!.received;
    await useAppStore.getState().executeTrade();
    const state = useAppStore.getState();
    expect(state.balances.USYC).toBeCloseTo(before.USYC + output, 8);
    expect(state.balances.USDC).toBe(900);
    expect(state.auditReceipts[0].mode).toBe("simulation");
    expect(state.auditReceipts[0].amountUsd).toBe(100);
    expect(state.auditReceipts[0].gasUsd).toBe(0);
    expect(state.auditReceipts[0].mandateId).toBe("NONE (Unsigned Simulation)");
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("preserves exact demo unwind units through review and confirmation", async () => {
    const before = { ...useAppStore.getState().balances };
    await useAppStore.getState().executeSweepOnchain(50, "unwind");
    expect(useAppStore.getState().balances).toEqual(before);
    const output = useAppStore.getState().pendingQuote!.received;
    await useAppStore.getState().executeTrade();
    expect(useAppStore.getState().balances.USYC).toBeCloseTo(50, 8);
    expect(useAppStore.getState().balances.USDC).toBeCloseTo(before.USDC + output, 8);
    expect(useAppStore.getState().auditReceipts[0].side).toBe("sell");
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("restarts the walkthrough with repeatable controls and no inherited review", () => {
    useAppStore.setState({ amount: 25000, side: "sell", slippage: 5, ticketNonce: 12, nativeGasBalance: 10 });
    useAppStore.getState().startJudgeTour();
    const state = useAppStore.getState();
    expect(state.amount).toBe(500);
    expect(state.side).toBe("buy");
    expect(state.slippage).toBe(0.5);
    expect(state.ticketNonce).toBe(0);
    expect(state.nativeGasBalance).toBe(0);
    expect(state.balances).toEqual({ USDC: 10000, USYC: 2500 });
    expect(state.auditReceipts).toEqual([]);
    expect(state.reviewOpen).toBe(false);
  });
  it("blocks legacy live treasury sweeps", async () => {
    useAppStore.setState({environmentMode:"mainnet",livePortfolio:true,address:trader});
    await useAppStore.getState().executeSweepOnchain(100,"sweep");
    expect(useAppStore.getState().reviewOpen).toBe(false);
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("blocks legacy live USYC unwinds", async () => {
    useAppStore.setState({environmentMode:"mainnet",livePortfolio:true,address:trader});
    await useAppStore.getState().executeSweepOnchain(50,"unwind");
    expect(useAppStore.getState().pendingQuote).toBeNull();
    expect(walletRpc).not.toHaveBeenCalled();
  });
});


describe("submitted transaction ambiguity", () => {
  it("blocks new wallet writes while an earlier submission is unresolved", async () => {
    useAppStore.setState({ environmentMode: "mainnet", livePortfolio: true, address: trader });
    await useAppStore.getState().prepareTradeReview();
    useAppStore.setState({ pendingTransactions: ["0x" + "f".repeat(64)] });
    await useAppStore.getState().executeTrade();
    expect(walletRpc).not.toHaveBeenCalled();
  });
});


describe("final balance guard", () => {
  it("never signs legacy mainnet tickets", async () => {
    useAppStore.setState({environmentMode:"mainnet",livePortfolio:true,address:trader,targetBufferUsd:20});
    await useAppStore.getState().prepareTradeReview();
    await useAppStore.getState().executeTrade();
    expect(walletRpc).not.toHaveBeenCalled();
  });
  it("resolves a reverted submitted hash without claiming settlement", async () => {
    const hash = "0x" + "f".repeat(64);
    useAppStore.setState({ pendingTransactions: [hash] });
    vi.mocked(publicRpc).mockResolvedValueOnce({ status: "0x0" });
    await useAppStore.getState().resolvePendingTransaction(hash);
    expect(useAppStore.getState().pendingTransactions).toEqual([]);
    expect(useAppStore.getState().auditReceipts).toEqual([]);
  });
});

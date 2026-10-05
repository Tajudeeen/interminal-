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
  publicRpc: vi.fn(async () => "0x0"),
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
import { routerAmountOut, readErc20Metadata } from "../lib/arc/rpcClient";
import { walletRpc } from "../lib/arc/wallet";
const trader = "0x" + "a".repeat(40);

beforeEach(() => {
  vi.clearAllMocks();
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
    slippage: 0.5,
    balances: { USDC: 1000, USYC: 100 },
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
  it("fetches the actual router quote before opening mainnet review", async () => {
    useAppStore.setState({
      environmentMode: "mainnet",
      livePortfolio: true,
      address: trader,
    });
    await useAppStore.getState().prepareTradeReview();
    const { pendingQuote, reviewOpen } = useAppStore.getState();
    expect(reviewOpen).toBe(true);
    expect(routerAmountOut).toHaveBeenCalledOnce();
    expect(pendingQuote?.received).toBe(2);
    expect(pendingQuote?.raw?.amountIn).toBe("100000000");
    expect(pendingQuote?.raw?.minOut).toBe("1990000000000000000");
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
  it("preserves confirmed settlement when separate anchoring fails, and signs reviewed bounds", async () => {
    useAppStore.setState({
      environmentMode: "mainnet",
      livePortfolio: true,
      address: trader,
    });
    await useAppStore.getState().prepareTradeReview();
    await useAppStore.getState().executeTrade();
    const state = useAppStore.getState();
    expect(state.auditReceipts).toHaveLength(1);
    expect(state.auditReceipts[0].status).toBe("confirmed");
    expect(state.auditReceipts[0].onchainAnchored).toBe(false);
    expect(state.lastTx.hash).toBe("0x" + "2".repeat(64));
    expect(routerAmountOut).toHaveBeenCalledOnce();
    const signatureCall = vi
      .mocked(walletRpc)
      .mock.calls.find(([method]) => method === "eth_signTypedData_v4")!;
    const ticket = JSON.parse(signatureCall[1]![1]);
    expect(ticket.message.amountIn).toBe("100000000");
    expect(ticket.message.minAmountOut).toBe("1990000000000000000");
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

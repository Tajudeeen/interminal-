import { verifySettlement, reconstructReceiptFromEvent } from "../lib/evidence/settlement";
import { readPending, writePending } from "../lib/evidence/pending";
import { assertCashReserve, readWalletReserve, saveWalletReserve } from "../lib/math/reserve";
import { readArchive, saveArchive, mergeReceipts } from "../lib/evidence/archive";
import { simulateTrade, simulateTreasury } from "../lib/math/simulation";
import { create } from "zustand";
import { ARC, TOKEN_ALLOW } from "../constants/arc";
import { EnvironmentMode, NETWORKS } from "../constants/networks";
import { PAIRS, assertPair } from "../constants/pairs";
import { Candle, ChartMode, Indicators, MarketAnalysis, Timeframe } from "../types/market";
import { TradeQuote, TradeSide } from "../types/trade";
import { AgentMandateDescriptor } from "../types/mandate";
import { TradeReceipt } from "../types/receipt";
import {
  buildTradeTicket,
  buildAgentMandateTicket,
  createAgentMandateDescriptor,
  failClosedLocalProofs,
  generateTradeReceipt,
  serializeEip712,
} from "../lib/crypto/eip712";
import { CandleSource, computeIndicators, analyzeMarket, getCandles } from "../lib/math/indicators";
import { formatUnits, parseUnits, quoteTrade } from "../lib/math/quotes";
import { deriveLiveControlSizing } from "../lib/math/liveSizing";
import {
  getInjected,
  isAddress,
  normalizeAddress,
  providerName,
  shortAddr,
  walletRpc,
  isMobileBrowser,
  openMobileWallet,
  switchOrAddNetwork,
  subscribeWalletEvents,
} from "../lib/arc/wallet";
import {
  loadOnchainPortfolio,
  refreshLivePairValuation,
  publicRpc,
  readTraderNonce,
  readMandateNonce,
  routerAmountOut,
  decodeTradeSettledExecution,
  verifyArcLive,
  erc20Allowance,
  sendApproval,
  waitForTransactionReceipt,
  readErc20Metadata,
} from "../lib/arc/rpcClient";
import { anchorReceiptOnchain, checkReceiptAnchoredOnchain } from "../lib/arc/receiptAnchor";

export interface ToastItem {
  id: string;
  title: string;
  body: string;
  kind: "ok" | "err" | "info" | "warn";
}

export interface AppState {
  theme: "dark" | "light";
  view: "landing" | "portfolio" | "terminal" | "markets" | "ai" | "ledger" | "proof" | "testnet";
  environmentMode: EnvironmentMode;
  testnetTaskComplete: boolean;
  testnetTxHash: string | null;
  connected: boolean;
  connecting: boolean;
  address: string | null;
  chainId: number | null;
  wrongNetwork: boolean;
  providerLabel: string | null;
  livePortfolio: boolean;
  walletError: string;
  balances: Record<string, number>;
  nativeGasBalance: number;
  gasRefueling: boolean;
  pair: string;
  timeframe: Timeframe;
  chartMode: ChartMode;
  side: TradeSide;
  amount: number;
  slippage: number;
  targetBufferUsd: number;
  stressTestAmount: number;
  candles: Candle[];
  indicators: Indicators | null;
  candleSource: CandleSource;
  analysis: MarketAnalysis | null;
  activity: any[];
  mandates: AgentMandateDescriptor[];
  auditReceipts: TradeReceipt[];
  archiveWarning: boolean;
  pendingTransactions: string[];
  resolvePendingTransaction: (hash: string) => Promise<void>;
  lastTx: any | null;
  pendingQuote: TradeQuote | null;
  reviewOpen: boolean;
  activeReceiptModal: TradeReceipt | null;
  mandateModalOpen: boolean;
  mandateSpend: number;
  mandateSlip: number;
  mandateTtl: number;
  gasTankModalOpen: boolean;
  searchOpen: boolean;
  searchQuery: string;
  importTokenOpen: boolean;
  importingToken: boolean;
  importTokenError: string;
  customTokens: any[];
  proof: { running: boolean; live: any; local: any; checkedAt: number | null };
  block: number;
  latency: number;
  marketFeedStatus: { source: string; live: boolean; lastUpdate: number | null; error: string | null };
  marketRequestId: number;
  toasts: ToastItem[];
  showLevels: boolean;
  executing: boolean;
  ticketNonce: number;
  settlementContractAddress: string;

  // Actions
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  setView: (view: AppState["view"]) => void;
  openMainnetReview: () => void;
  launchTestnet: () => void;
  performMainnetFromTestnet: () => void;
  setPair: (pair: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setChartMode: (mode: ChartMode) => void;
  setSide: (side: TradeSide) => void;
  setAmount: (amt: number) => void;
  setSlippage: (slip: number) => void;
  setTargetBufferUsd: (amt: number) => void;
  setStressTestAmount: (amt: number) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setGasTankModalOpen: (open: boolean) => void;
  setMandateModalOpen: (open: boolean) => void;
  setReviewOpen: (open: boolean) => void;
  setActiveReceiptModal: (receipt: TradeReceipt | null) => void;
  importReceipt: (receipt: TradeReceipt) => void;
  updateReceipt: (receipt: TradeReceipt) => void;
  setImportTokenOpen: (open: boolean) => void;
  setShowLevels: (show: boolean) => void;
  addToast: (title: string, body: string, kind?: ToastItem["kind"]) => void;
  removeToast: (id: string) => void;
  connectWallet: (target?: "testnet" | "mainnet") => Promise<void>;
  switchToCurrentNetwork: () => Promise<void>;
  runTestnetProof: () => Promise<void>;
  launchDemo: () => void;
  disconnectWallet: () => void;
  syncMarketData: () => Promise<void>;
  runAiAnalysis: () => void;
  prepareTradeReview: (exactInputTokens?: number) => Promise<void>;
  executeTrade: () => Promise<void>;
  refuelGasTank: (amountUsdc: number) => Promise<void>;
  createAgentMandate: (params: { spendUsd: number; slipBps: number; ttlHours: number; pairs: string[]; agent?: string }) => Promise<void>;
  runProof: () => Promise<void>;
  importCustomToken: (address: string) => Promise<void>;
  executeSweepOnchain: (sweepAmountUsdc: number, direction: "sweep" | "unwind") => Promise<void>;
  judgeTourOpen: boolean;
  judgeTourStep: number;
  setJudgeTourOpen: (open: boolean) => void;
  setJudgeTourStep: (step: number) => void;
  startJudgeTour: () => void;
}

const DEMO_ADDRESS = "0x000000000000000000000000000000000000dEee";
let walletSession = 0;
let walletRefresh = 0;
let walletEventCleanup: (() => void) | null = null;

function getInitialTheme(): "dark" | "light" {
  if (typeof window !== "undefined") {
    let saved: string | null = null;
    try { saved = localStorage.getItem("interminal_theme"); } catch {}
    if (saved === "light" || saved === "dark") return saved;
  }
  return "dark";
}

function getInitialAuditReceipts(): TradeReceipt[] {
  try {
    const r1 = generateTradeReceipt({
      quote: {
        received: 4.025,
        effective: 2484.47,
        impact: 0.0012,
        minReceived: 4.005,
        gasUsd: 0.0012,
        slippageBps: 30,
        price: 2481.42,
        expiresAt: Date.now() + 600000,
      },
      pairKey: "ETH/USDC",
      trader: "0x000000000000000000000000000000000000dEee",
      side: "buy",
      amountUsd: 10000,
      amount: 10000,
      blockNumber: 0,
    });
    const r2 = generateTradeReceipt({
      quote: {
        received: 27112.5,
        effective: 1.0845,
        impact: 0.0008,
        minReceived: 27050.0,
        gasUsd: 0.0012,
        slippageBps: 20,
        price: 1.0845,
        expiresAt: Date.now() + 600000,
      },
      pairKey: "EURC/USDC",
      trader: "0x71C5689E281249b6b6C1864A496E25bCc4965042",
      side: "sell",
      amountUsd: 25000,
      amount: 25000,
      blockNumber: 0,
    });
    const r3 = generateTradeReceipt({
      quote: {
        received: 0.0778,
        effective: 64268.0,
        impact: 0.0015,
        minReceived: 0.0774,
        gasUsd: 0.0012,
        slippageBps: 50,
        price: 64210.0,
        expiresAt: Date.now() + 600000,
      },
      pairKey: "BTC/USDC",
      trader: "0x71C5689E281249b6b6C1864A496E25bCc4965042",
      side: "buy",
      amountUsd: 5000,
      amount: 5000,
      mandateId: "mandate-twap-btc-01",
      blockNumber: 0,
    });

    return [r1, r2, r3];
  } catch {
    return [];
  }
}

function getInitialActivity() {
  const now = Date.now();
  return [
    {
      ts: now - 3600000 * 2,
      type: "sweep",
      label: "Simulated Yield Sweep: $12,500 USDC -> USYC",
      detail: "Simulation only · reference USYC yield is used for the demo model.",
    },
    {
      ts: now - 3600000 * 7,
      type: "trade",
      label: "Simulated FX Rebalance: EURC/USDC",
      detail: "Simulation only · no Arc transaction is associated with this activity.",
    },
    {
      ts: now - 3600000 * 18,
      type: "mandate",
      label: "Simulated Receipt Review",
      detail: "Simulation only · demonstrates the evidence flow without claiming Arc history.",
    },
  ];
}

export const useAppStore = create<AppState>((set, get) => {
  const initialPair = "ETH/USDC";

  return {
    theme: getInitialTheme(),
    view: "landing",
    environmentMode: "demo",
    testnetTaskComplete: false,
    testnetTxHash: null,
    connected: false,
    connecting: false,
    address: null,
    chainId: null,
    wrongNetwork: false,
    providerLabel: null,
    livePortfolio: false,
    walletError: "",
    balances: {
      USDC: 15000,
      USYC: 185000,
      EURC: 25000,
      ETH: 6.5,
      cirBTC: 0.35,
      WETH: 2.0,
    },
    nativeGasBalance: 0,
    gasRefueling: false,
    pair: initialPair,
    timeframe: "4h",
    chartMode: "candles",
    side: "buy",
    amount: 500,
    slippage: 0.5,
    targetBufferUsd: 5000,
    stressTestAmount: 25000,
    candles: [],
    indicators: null,
    candleSource: "unavailable",
    analysis: null,
    activity: getInitialActivity(),
    mandates: [],
    auditReceipts: getInitialAuditReceipts(),
    archiveWarning: false,
    pendingTransactions: readPending(),
    resolvePendingTransaction: async (hash) => {
      const receipt = await publicRpc("eth_getTransactionReceipt", [hash]);
      if (!receipt || !["0x0", "0x1"].includes(receipt.status)) throw new Error("Transaction not yet resolved. Do not repeat it.");
      if (receipt.status === "0x1") {
        const evidence = await verifySettlement(hash);
        get().importReceipt(reconstructReceiptFromEvent(evidence));
      }
      const remaining = get().pendingTransactions.filter(item => item.toLowerCase() !== hash.toLowerCase());
      writePending(remaining);
      set({ pendingTransactions: remaining });
      get().addToast(receipt.status === "0x1" ? "Settlement confirmed" : "Transaction reverted", "Resolved from Arc RPC. Reconnect to refresh balances before another trade.", "info");
      set({ livePortfolio: false });
    },
    importReceipt: (receipt) => set(s => ({ auditReceipts: mergeReceipts(s.auditReceipts, [receipt]) })),
    updateReceipt: (receipt) => set(s => ({ auditReceipts: s.auditReceipts.map(r => r.receiptId === receipt.receiptId ? receipt : r), activeReceiptModal: receipt })),
    lastTx: null,
    pendingQuote: null,
    reviewOpen: false,
    activeReceiptModal: null,
    mandateModalOpen: false,
    mandateSpend: 250,
    mandateSlip: 30,
    mandateTtl: 14400,
    gasTankModalOpen: false,
    searchOpen: false,
    searchQuery: "",
    importTokenOpen: false,
    importingToken: false,
    importTokenError: "",
    customTokens: [],
    proof: { running: false, live: null, local: null, checkedAt: null },
    block: 0,
    latency: 12,
    marketFeedStatus: { source: "Waiting for live market data", live: false, lastUpdate: null, error: null },
    marketRequestId: 0,
    toasts: [],
    showLevels: false,
    executing: false,
    ticketNonce: 0,
    settlementContractAddress: ARC.settlement,
    judgeTourOpen: false,
    judgeTourStep: 1,
    setJudgeTourOpen: (open) => set({ judgeTourOpen: open }),
    setJudgeTourStep: (step) => set({ judgeTourStep: step }),
    startJudgeTour: () => {
      if (get().executing || get().connecting) return;
      get().launchDemo();
      set({ judgeTourOpen: true, judgeTourStep: 1, view: "portfolio" });
    },

    setTheme: (theme) => {
      set({ theme });
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.body.style.background = theme === "dark" ? "#000000" : "#FFFFFF";
        document.body.style.color = theme === "dark" ? "#FFFFFF" : "#0A0A0A";
        try { localStorage.setItem("interminal_theme", theme); } catch {}
      }
    },

    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        const transition = (document as any).startViewTransition(() => {
          get().setTheme(next);
        });
        void transition.ready.catch(() => {});
      } else {
        get().setTheme(next);
      }
    },

    openMainnetReview: () => {
      if (get().executing || get().connecting) return;
      walletSession += 1;
      walletEventCleanup?.();
      walletEventCleanup = null;
      set({
        environmentMode: "mainnet",
        testnetTaskComplete: false,
        testnetTxHash: null,
        connected: false,
        connecting: false,
        address: null,
        chainId: null,
        wrongNetwork: false,
        providerLabel: "Mainnet Review · Wallet Required",
        livePortfolio: false,
        walletError: "",
        balances: {},
        nativeGasBalance: 0,
        targetBufferUsd: 0,
        stressTestAmount: 0,
        amount: 0,
        dcaSpendTotal: 0,
        dcaSliceSize: 0,
        mandateSpend: 0,
        pendingQuote: null,
        reviewOpen: false,
        lastTx: null,
        auditReceipts: readArchive().filter(r => r.mode === "mainnet"),
        activity: [],
            mandates: [],
        judgeTourOpen: false,
        activeReceiptModal: null,
        view: "portfolio",
      });
      get().addToast(
        "Arc Mainnet Review",
        "Connect your wallet to load real holdings, live market prices, and executable controls. Testnet is optional.",
        "info",
      );
    },

    launchTestnet: () => {
      if (get().executing || get().connecting) return;
      walletSession += 1;
      walletEventCleanup?.();
      walletEventCleanup = null;
      set({
        environmentMode: "testnet",
        judgeTourOpen: false,
        balances: {}, nativeGasBalance: 0, amount: 0, targetBufferUsd: 0, stressTestAmount: 0,
        pendingQuote: null, reviewOpen: false, activeReceiptModal: null, lastTx: null,
        auditReceipts: [], activity: [], mandates: [],
        marketRequestId: get().marketRequestId + 1, analysis: null,
        testnetTaskComplete: false,
        testnetTxHash: null,
        connected: false,
        connecting: false,
        address: null,
        chainId: null,
        wrongNetwork: false,
        livePortfolio: false,
        providerLabel: null,
        walletError: "",
        view: "testnet",
      });
      get().addToast("Arc Testnet Lab", "Test the treasury policy flow on Arc Testnet before touching mainnet.", "info");
    },

    performMainnetFromTestnet: () => {
      get().openMainnetReview();
    },


    runTestnetProof: async () => {
      if (get().executing) return;
      const { environmentMode, address, connected, wrongNetwork } = get();
      if (environmentMode !== "testnet") {
        get().addToast("Open Testnet Lab", "Run the rehearsal from the Arc Testnet Lab.", "warn");
        return;
      }
      if (!connected || !address || !isAddress(address)) {
        get().addToast("Wallet Required", "Connect a funded Arc Testnet wallet first.", "err");
        return;
      }
      if (wrongNetwork) {
        get().addToast("Wrong Network", "Switch the wallet to Arc Testnet (5042002) first.", "err");
        return;
      }

      set({ executing: true });
      try {
        const trader = normalizeAddress(address);
        const testValue = parseUnits("0.01", 18);
        get().addToast("Testnet Execution", "Sending 0.01 native USDC to ourselves to prove wallet signing, network selection, submission, and receipt confirmation.", "info");

        const txHash = await walletRpc("eth_sendTransaction", [{
          from: trader,
          to: trader,
          value: "0x" + testValue.toString(16),
        }]);

        if (typeof txHash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
          throw new Error("Wallet returned an invalid testnet transaction hash");
        }

        get().addToast("Testnet Pending", "Waiting for Arc Testnet confirmation.", "info");

        let confirmed: any = null;
        for (let i = 0; i < 30; i++) {
          confirmed = await walletRpc("eth_getTransactionReceipt", [txHash]);
          if (confirmed) break;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        if (!confirmed) throw new Error("Arc Testnet transaction was not confirmed within the polling window");
        if (confirmed.status !== "0x1" && confirmed.status !== 1) {
          throw new Error("Arc Testnet transaction reverted");
        }

        const blockNumber = typeof confirmed.blockNumber === "string"
          ? Number.parseInt(confirmed.blockNumber, 16)
          : Number(confirmed.blockNumber || 0);

        set((s) => ({
          executing: false,
          testnetTaskComplete: true,
          testnetTxHash: txHash,
          activity: [{
            ts: Date.now(),
            type: "testnet",
            label: "Testnet Execution Check · 0.01 USDC self-transfer",
            detail: "Arc Testnet · chain 5042002 · confirmed block #" + blockNumber.toLocaleString(),
            hash: txHash,
          }, ...s.activity],
        }));

        get().addToast(
          "Testnet Check Confirmed",
          "Arc Testnet confirmed the transaction. Mainnet review is already available directly; this rehearsal remains optional.",
          "ok",
        );
      } catch (err: any) {
        set({ executing: false });
        get().addToast(
          "Testnet Task Failed",
          err?.code === 4001 ? "Wallet action rejected." : (err?.message || String(err)),
          "err",
        );
      }
    },

    setView: (view) => {
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        const transition = (document as any).startViewTransition(() => {
          set({ view, searchOpen: false });
          requestAnimationFrame(() => {
            document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
          });
        });
        void transition.ready.catch(() => {});
      } else {
        set({ view, searchOpen: false });
        requestAnimationFrame(() => {
          document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    },

    setPair: (pair) => {
      if (get().executing) return;
      set({ pendingQuote: null, reviewOpen: false, analysis: null });
      try {
        if (get().environmentMode === "testnet") {
          assertPair(pair);
          set({
            pair,
            timeframe: pair === "USYC/USDC" ? "1D" : get().timeframe,
            candles: [],
            indicators: null,
            candleSource: "unavailable",
            marketFeedStatus: {
              source: "Testnet Lab · mainnet market feed disabled",
              live: false,
              lastUpdate: Date.now(),
              error: null,
            },
          });
          return;
        }
        assertPair(pair);
        const tf = pair === "USYC/USDC" ? "1D" : get().timeframe;
        const requestId = get().marketRequestId + 1;

        set({
          pair,
          timeframe: tf,
          candles: [],
          indicators: null,
          candleSource: "unavailable",
          marketRequestId: requestId,
          marketFeedStatus: {
            source: "Loading live market data · " + tf,
            live: false,
            lastUpdate: null,
            error: null,
          },
        });

        void getCandles(pair, tf).then((result) => {
          const state = get();
          if (
            state.pair !== pair ||
            state.timeframe !== tf ||
            state.marketRequestId !== requestId
          ) {
            return;
          }

          const indicators = result.candles.length ? computeIndicators(result.candles) : null;
          const current = PAIRS[pair];
          if (current && result.stats) {
            current.price = result.stats.price;
            current.change = result.stats.change;
            current.high = result.stats.high;
            current.low = result.stats.low;
            current.vol = result.stats.vol;
          }

          set({
            candles: result.candles,
            indicators,
            candleSource: result.source,
            marketFeedStatus: {
              source: result.label,
              live: result.source !== "unavailable",
              lastUpdate: Date.now(),
              error: result.source === "unavailable" ? result.label : null,
            },
          });
        });
      } catch (e: any) {
        get().addToast("Unknown pair", e.message || String(e), "err");
      }
    },

    setTimeframe: (tf) => {
      const pair = get().pair;
      if (get().environmentMode === "testnet") {
        const nextTf = pair === "USYC/USDC" ? "1D" : tf;
        set({
          timeframe: nextTf,
          candles: [],
          indicators: null,
          candleSource: "unavailable",
          marketFeedStatus: {
            source: "Testnet Lab · mainnet market feed disabled",
            live: false,
            lastUpdate: Date.now(),
            error: null,
          },
        });
        return;
      }
      const nextTf = pair === "USYC/USDC" ? "1D" : tf;
      const requestId = get().marketRequestId + 1;

      set({
        timeframe: nextTf,
        candles: [],
        indicators: null,
        analysis: null,
        candleSource: "unavailable",
        marketRequestId: requestId,
        marketFeedStatus: {
          source: "Loading live market data · " + nextTf,
          live: false,
          lastUpdate: get().marketFeedStatus.lastUpdate,
          error: null,
        },
      });

      void getCandles(pair, nextTf).then((result) => {
        const state = get();
        if (
          state.pair !== pair ||
          state.timeframe !== nextTf ||
          state.marketRequestId !== requestId
        ) {
          return;
        }

        const indicators = result.candles.length ? computeIndicators(result.candles) : null;
        const current = PAIRS[pair];
        if (current && result.stats) {
          current.price = result.stats.price;
          current.change = result.stats.change;
          current.high = result.stats.high;
          current.low = result.stats.low;
          current.vol = result.stats.vol;
        }

        set({
          candles: result.candles,
          indicators,
          candleSource: result.source,
          marketFeedStatus: {
            source: result.label,
            live: result.source !== "unavailable",
            lastUpdate: Date.now(),
            error: result.source === "unavailable" ? result.label : null,
          },
        });
      });
    },

    setChartMode: (chartMode) => set({ chartMode }),
    setSide: (side) => { if (!get().executing) set({ side, pendingQuote: null, reviewOpen: false }); },
    setAmount: (amount) => { if (!get().executing) set({ amount, pendingQuote: null, reviewOpen: false }); },
    setSlippage: (slippage) => { if (!get().executing) set({ slippage, pendingQuote: null, reviewOpen: false }); },
    setTargetBufferUsd: (targetBufferUsd) => {
      if (get().executing || !Number.isFinite(targetBufferUsd) || targetBufferUsd < 0) return;
      set({ targetBufferUsd, pendingQuote: null, reviewOpen: false });
      const address = get().address;
      if (get().environmentMode === "mainnet" && address && !saveWalletReserve(address, targetBufferUsd)) get().addToast("Reserve saved for this session", "Device storage is unavailable. Recheck your reserve after reconnecting.", "warn");
    },
    setStressTestAmount: (stressTestAmount) => set({ stressTestAmount }),
    setSearchOpen: (searchOpen) => set({ searchOpen }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setGasTankModalOpen: (gasTankModalOpen) => set({ gasTankModalOpen }),
    setMandateModalOpen: (mandateModalOpen) => set({ mandateModalOpen }),
    setReviewOpen: (reviewOpen) => set({ reviewOpen }),
    setActiveReceiptModal: (activeReceiptModal) => set({ activeReceiptModal }),
    setImportTokenOpen: (importTokenOpen) => set({ importTokenOpen }),
    setShowLevels: (showLevels) => set({ showLevels }),

    addToast: (title, body, kind = "info") => {
      const id = "toast-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const newItem: ToastItem = { id, title, body, kind };
      set((s) => ({ toasts: [...s.toasts, newItem] }));
      setTimeout(() => {
        get().removeToast(id);
      }, 4500);
    },

    removeToast: (id) => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    connectWallet: async (target) => {
      if (get().connecting || get().executing) return;
      // Testnet is an explicit rehearsal mode only. A generic wallet connect
      // action can never silently redirect a user to Arc Testnet.
      const explicitTestnet = target === "testnet" && (
        get().environmentMode === "testnet" || get().view === "testnet"
      );
      const requested = explicitTestnet
        ? "testnet"
        : target === "mainnet"
          ? "mainnet"
          : "mainnet";
      const eth = getInjected();
      if (!eth) {
        if (isMobileBrowser()) {
          openMobileWallet("metamask");
          get().addToast("Opening MetaMask", "Continue the connection inside the MetaMask mobile app.", "info");
          return;
        }
        set({ walletError: "No injected EVM wallet found. Install MetaMask, Rabby, or another EIP-1193 wallet." });
        get().addToast("Wallet Missing", "Install a desktop wallet extension or open Interminal inside a mobile wallet app.", "err");
        return;
      }
      const session = ++walletSession;
      set({ connecting: true, walletError: "" });
      try {
        const network = NETWORKS[requested];

        walletEventCleanup?.();
        walletEventCleanup = subscribeWalletEvents(eth, {
          accountsChanged: async (accounts) => {
            if (session !== walletSession) return;
            const refreshId = ++walletRefresh;
            set({ livePortfolio: false, pendingQuote: null, reviewOpen: false, balances: {}, nativeGasBalance: 0, auditReceipts: [], activity: [], lastTx: null });
            if (!accounts?.length) {
              walletEventCleanup?.();
              walletEventCleanup = null;
              set({
                connected: false,
                address: null,
                chainId: null,
                wrongNetwork: false,
                livePortfolio: false,
                balances: {},
                nativeGasBalance: 0,
                view: "landing",
              });
              get().addToast("Wallet Disconnected", "The wallet account was disconnected from Interminal.", "warn");
              return;
            }

            const nextAddress = normalizeAddress(accounts[0]);
            set({ address: nextAddress });
            const currentMode = get().environmentMode;
            const rawNextChain = await walletRpc("eth_chainId");
            const nextChainId = Number.parseInt(String(rawNextChain), 16);
            const nextNetwork = currentMode === "testnet" ? NETWORKS.testnet : NETWORKS.mainnet;
            const nextWrongNetwork = nextChainId !== nextNetwork.chainId;

            if (currentMode === "mainnet" && !nextWrongNetwork) {
              const balances = await loadOnchainPortfolio(nextAddress);
              await refreshLivePairValuation();
              const liveSizing = deriveLiveControlSizing(balances);
              let ticketNonce = 0;
              try { ticketNonce = await readTraderNonce(nextAddress); } catch {}
              let nextNativeGasBalance = 0;
              try {
                nextNativeGasBalance = formatUnits(await walletRpc("eth_getBalance", [nextAddress, "latest"]), ARC.nativeDecimals);
              } catch {}
              if (session !== walletSession || refreshId !== walletRefresh) return;
              set({
                connected: true,
                address: nextAddress,
                chainId: nextChainId,
                wrongNetwork: false,
                livePortfolio: true,
                providerLabel: providerName(eth),
                balances,
                nativeGasBalance: nextNativeGasBalance,
                ticketNonce,
                targetBufferUsd: readWalletReserve(nextAddress, liveSizing.targetBufferUsd),
                stressTestAmount: liveSizing.stressTestAmount,
                amount: liveSizing.tradeDefaultUsd,
                dcaSpendTotal: liveSizing.dcaSpendTotal,
                dcaSliceSize: liveSizing.dcaSliceSize,
                mandateSpend: liveSizing.mandateSpendUsd,
              });
              get().addToast("Wallet Refreshed", "Account changed. Mainnet holdings, prices, and controls were reloaded.", "ok");
            } else {
              if (session !== walletSession || refreshId !== walletRefresh) return;
              set({
                connected: true,
                address: nextAddress,
                chainId: nextChainId,
                wrongNetwork: nextWrongNetwork,
                livePortfolio: false,
                providerLabel: providerName(eth) + " · " + nextNetwork.name,
              });
            }
          },
          chainChanged: async (rawChainId) => {
            if (session !== walletSession) return;
            const refreshId = ++walletRefresh;
            set({ livePortfolio: false, pendingQuote: null, reviewOpen: false, balances: {}, nativeGasBalance: 0 });
            const nextChainId = Number.parseInt(String(rawChainId), 16);
            const currentMode = get().environmentMode;
            const nextNetwork = currentMode === "testnet" ? NETWORKS.testnet : NETWORKS.mainnet;
            const wrongNetwork = nextChainId !== nextNetwork.chainId;

            if (currentMode === "mainnet" && !wrongNetwork) {
              const nextAddress = get().address;
              if (!nextAddress || !isAddress(nextAddress)) return;
              const balances = await loadOnchainPortfolio(nextAddress);
              await refreshLivePairValuation();
              const liveSizing = deriveLiveControlSizing(balances);
              if (session !== walletSession || refreshId !== walletRefresh) return;
              set({
                connected: true,
                chainId: nextChainId,
                wrongNetwork: false,
                livePortfolio: true,
                balances,
                targetBufferUsd: readWalletReserve(nextAddress, liveSizing.targetBufferUsd),
                stressTestAmount: liveSizing.stressTestAmount,
                amount: liveSizing.tradeDefaultUsd,
                dcaSpendTotal: liveSizing.dcaSpendTotal,
                dcaSliceSize: liveSizing.dcaSliceSize,
                mandateSpend: liveSizing.mandateSpendUsd,
              });
              get().addToast("Arc Mainnet Ready", "Wallet moved back to Arc Mainnet. Live treasury state was refreshed.", "ok");
            } else {
              set({ chainId: nextChainId, wrongNetwork, livePortfolio: false });
              get().addToast(
                wrongNetwork ? "Wrong Network" : "Network Ready",
                wrongNetwork
                  ? "Wallet moved to chain " + nextChainId + ". Switch back to " + nextNetwork.name + " before live execution."
                  : "Wallet network is now " + nextNetwork.name + ".",
                wrongNetwork ? "warn" : "ok",
              );
            }
          },
        });
        const accounts = await walletRpc("eth_requestAccounts");
        if (!accounts?.length) throw new Error("No account authorized");
        const address = normalizeAddress(accounts[0]);
        const rawChain = await walletRpc("eth_chainId");
        const id = Number.parseInt(String(rawChain), 16);
        const wrongNetwork = id !== network.chainId;
        let nativeGasBalance = 0;
        try {
          nativeGasBalance = formatUnits(await walletRpc("eth_getBalance", [address, "latest"]), network.nativeCurrency.decimals);
        } catch {}

        if (requested === "mainnet" && !wrongNetwork) {
          const balances = await loadOnchainPortfolio(address);
          await refreshLivePairValuation();
          const liveSizing = deriveLiveControlSizing(balances);
          let ticketNonce = 0;
          try { ticketNonce = await readTraderNonce(address); } catch {}
          if (session !== walletSession) return;
          set({
            connected: true,
            connecting: false,
            address,
            chainId: id,
            wrongNetwork: false,
            providerLabel: providerName(eth),
            livePortfolio: true,
            balances,
            nativeGasBalance,
            ticketNonce,
            targetBufferUsd: readWalletReserve(address, liveSizing.targetBufferUsd),
            stressTestAmount: liveSizing.stressTestAmount,
            amount: liveSizing.tradeDefaultUsd,
            dcaSpendTotal: liveSizing.dcaSpendTotal,
            dcaSliceSize: liveSizing.dcaSliceSize,
            mandateSpend: liveSizing.mandateSpendUsd,
            environmentMode: "mainnet",
            view: "portfolio",
          });
        } else {
          if (session !== walletSession) return;
          set({
            connected: true,
            connecting: false,
            address,
            chainId: id,
            wrongNetwork,
            providerLabel: providerName(eth) + " · " + network.name,
            livePortfolio: false,
            nativeGasBalance,
            environmentMode: requested,
            view: requested === "testnet" ? "testnet" : "terminal",
          });
        }

        get().addToast(
          wrongNetwork ? "Wallet Connected · Wrong Network" : "Wallet Connected",
          wrongNetwork
            ? "Connected " + shortAddr(address) + " · switch to " + network.name + " (" + network.chainId + ")."
            : "Connected " + shortAddr(address) + " on " + network.name + ".",
          wrongNetwork ? "warn" : "ok",
        );
      } catch (err: any) {
        set({ connecting: false, walletError: err.message || String(err) });
        get().addToast("Connection Rejected", err.message || String(err), "err");
      }
    },

    switchToCurrentNetwork: async () => {
      const mode = get().environmentMode;
      if (mode === "demo") return;
      const eth = getInjected();
      if (!eth) {
        if (isMobileBrowser()) openMobileWallet("metamask");
        get().addToast("Wallet Required", "Open Interminal in MetaMask or another mobile wallet app first.", "err");
        return;
      }
      try {
        await switchOrAddNetwork(eth, mode);
        const chainId = Number.parseInt(String(await walletRpc("eth_chainId")), 16);
        if (mode === "mainnet") {
          const currentAddress = get().address;
          if (!currentAddress || !isAddress(currentAddress)) throw new Error("No wallet account available after network switch");
          const balances = await loadOnchainPortfolio(currentAddress);
          await refreshLivePairValuation();
          const liveSizing = deriveLiveControlSizing(balances);
          let ticketNonce = 0;
          try { ticketNonce = await readTraderNonce(currentAddress); } catch {}
          set({
            chainId,
            wrongNetwork: false,
            connected: true,
            livePortfolio: true,
            balances,
            ticketNonce,
            targetBufferUsd: readWalletReserve(currentAddress, liveSizing.targetBufferUsd),
            stressTestAmount: liveSizing.stressTestAmount,
            amount: liveSizing.tradeDefaultUsd,
            dcaSpendTotal: liveSizing.dcaSpendTotal,
            dcaSliceSize: liveSizing.dcaSliceSize,
            mandateSpend: liveSizing.mandateSpendUsd,
            nativeGasBalance: formatUnits(await walletRpc("eth_getBalance", [currentAddress, "latest"]), ARC.nativeDecimals),
            view: "portfolio",
          });
        } else {
          set({ chainId, wrongNetwork: false });
        }
        get().addToast("Network Ready", mode === "mainnet"
          ? "Arc Mainnet is ready. Live balances and prices have been loaded."
          : "Connected to " + NETWORKS[mode].name + " (" + NETWORKS[mode].chainId + ").", "ok");
      } catch (err: any) {
        get().addToast("Network Switch Failed", err.message || String(err), "err");
      }
    },
    launchDemo: () => {
      if (get().executing || get().connecting) return;
      walletSession += 1;
      walletEventCleanup?.();
      walletEventCleanup = null;
      const demoPair = "ETH/USDC";
      set({
        environmentMode: "demo",
        judgeTourOpen: false,
        pendingQuote: null, reviewOpen: false, activeReceiptModal: null, lastTx: null, walletError: "",
        auditReceipts: [], activity: [], mandates: [], 
        testnetTaskComplete: false,
        testnetTxHash: null,
        connected: true,
        address: null,
        chainId: 5042,
        wrongNetwork: false,
        providerLabel: "Demo Simulation",
        livePortfolio: false,
        balances: { ETH: 3.5, WETH: 1.2, USDC: 14250, EURC: 5000, USYC: 10000, cirBTC: 0.15 },
        targetBufferUsd: 500,
        stressTestAmount: 2500,
        view: "portfolio",
        pair: demoPair,
        timeframe: "4h",
        candles: [],
        indicators: null,
        analysis: null,
        candleSource: "unavailable",
        marketFeedStatus: { source: "Loading live market data", live: false, lastUpdate: null, error: null },
      });

      void get().syncMarketData();

      get().addToast(
        "Treasury Cockpit Active",
        "Simulation balances loaded. Market charts use live public market data and never fabricate candles.",
        "ok"
      );
    },

    disconnectWallet: () => {
      if (get().executing || get().connecting) return;
      walletSession += 1;
      walletEventCleanup?.();
      walletEventCleanup = null;
      set({
        connected: false,
        balances: {}, nativeGasBalance: 0, pendingQuote: null, reviewOpen: false,
        auditReceipts: [], activity: [], mandates: [], activeReceiptModal: null, lastTx: null,
        address: null,
        chainId: null,
        wrongNetwork: false,
        providerLabel: null,
        livePortfolio: false,
        view: "landing",
      });
      get().addToast("Wallet Disconnected", "Session cleared.", "info");
    },

    syncMarketData: async () => {
      if (get().environmentMode === "testnet") {
        set({
          candles: [],
          indicators: null,
          candleSource: "unavailable",
          marketFeedStatus: {
            source: "Testnet Lab · mainnet market feed disabled",
            live: false,
            lastUpdate: Date.now(),
            error: null,
          },
        });
        return;
      }
      const activePair = get().pair;
      const activeTf = activePair === "USYC/USDC" ? "1D" : get().timeframe;
      const requestId = get().marketRequestId + 1;

      set({
        marketRequestId: requestId,
        marketFeedStatus: {
          source: "Loading live market data · " + activeTf,
          live: false,
          lastUpdate: get().marketFeedStatus.lastUpdate,
          error: null,
        },
      });

      try {
        const result = await getCandles(activePair, activeTf);
        const state = get();
        if (
          state.pair !== activePair ||
          state.timeframe !== activeTf ||
          state.marketRequestId !== requestId
        ) {
          return;
        }

        const indicators = result.candles.length ? computeIndicators(result.candles) : null;
        const current = PAIRS[activePair];

        if (current && result.stats) {
          current.price = result.stats.price;
          current.change = result.stats.change;
          current.high = result.stats.high;
          current.low = result.stats.low;
          current.vol = result.stats.vol;
        }

        set({
          candles: result.candles,
          indicators,
          candleSource: result.source,
          marketFeedStatus: {
            source: result.label,
            live: result.source !== "unavailable",
            lastUpdate: Date.now(),
            error: result.source === "unavailable" ? result.label : null,
          },
        });
      } catch (err: any) {
        const state = get();
        if (
          state.pair !== activePair ||
          state.timeframe !== activeTf ||
          state.marketRequestId !== requestId
        ) {
          return;
        }

        set({
          candles: [],
          indicators: null,
          candleSource: "unavailable",
          marketFeedStatus: {
            source: "Live market data unavailable · " + activeTf,
            live: false,
            lastUpdate: Date.now(),
            error: err.message || String(err),
          },
        });
      }
    },

    runAiAnalysis: () => {
      const { pair, timeframe, indicators } = get();
      const analysis = analyzeMarket(pair, timeframe, indicators);
      if (!analysis) {
        get().addToast("Analysis failed", "No market indicators available.", "err");
        return;
      }
      set({ analysis, showLevels: true });
      get().addToast(
        "Market context refreshed",
        `Observed ${analysis.trend.toLowerCase()} structure · support ${analysis.support.toFixed(2)} / resistance ${analysis.resistance.toFixed(2)}. Reference only.`,
        "info"
      );
    },

    prepareTradeReview: async (exactInputTokens?: number) => {
      const { pair: pairKey, side, amount, slippage, balances, environmentMode, address } = get();
      if (get().executing) return;
      const p = PAIRS[assertPair(pairKey)];
      try {
        const quote = quoteTrade({ side, amountUsd: amount, price: p.price, slippageBps: slippage * 100 });
        quote.context = { pair: pairKey, side, amount, slippage, address, mode: environmentMode };
        if (environmentMode === "testnet") throw new Error("Use the testnet self-transfer check in the Testnet Lab.");
        if (environmentMode === "mainnet") {
          if (!get().livePortfolio || !address || get().wrongNetwork) throw new Error("Connect your wallet on Arc Mainnet first.");
          if (!p.address || p.cat === "imported") throw new Error("This market is view-only until its contract is independently verified.");
          const tokenIn = side === "buy" ? ARC.usdcErc20 : p.address;
          const tokenOut = side === "buy" ? p.address : ARC.usdcErc20;
          const inputDecimals = side === "buy" ? 6 : (p.decimals ?? 18);
          const outputDecimals = side === "buy" ? (p.decimals ?? 18) : 6;
          set({ executing: true });
          let price = p.price;
          if (side === "sell") price = formatUnits("0x" + (await routerAmountOut(tokenIn, tokenOut, parseUnits(1, inputDecimals))).toString(16), 6);
          if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid router price");
          const input = side === "buy" ? amount : (exactInputTokens ?? amount / price);
          if (!Number.isFinite(input) || input <= 0) throw new Error("Invalid token input");
          // The deployed trade contract does not automatically unwind USYC.
          if (input > (balances[side === "buy" ? "USDC" : p.base] || 0)) throw new Error("Input exceeds wallet balance. Unwind USYC separately before buying.");
          const amountIn = parseUnits(input, inputDecimals);
          if (side === "buy") assertCashReserve(parseUnits(balances.USDC || 0, 6), amountIn, get().targetBufferUsd);
          const output = await routerAmountOut(tokenIn, tokenOut, amountIn);
          if (amountIn <= 0n || output <= 0n) throw new Error("Router returned zero output");
          const minOut = output * BigInt(10_000 - Math.round(slippage * 100)) / 10_000n;
          quote.price = price;
          quote.received = formatUnits("0x" + output.toString(16), outputDecimals);
          quote.minReceived = formatUnits("0x" + minOut.toString(16), outputDecimals);
          quote.effective = side === "buy" ? amount / quote.received : quote.received / input;
          quote.impact = 0;
          quote.raw = { amountIn: amountIn.toString(), minOut: minOut.toString(), tokenIn, tokenOut };
          quote.expiresAt = Date.now() + 60_000;
        } else {
          if (side === "buy") assertCashReserve(parseUnits(balances.USDC || 0, 6), parseUnits(amount, 6), get().targetBufferUsd);
          simulateTrade(balances, p.base, side, amount, p.price, quote.received, PAIRS["USYC/USDC"].price, slippage * 100);
        }
        const now = get();
        if (now.pair !== pairKey || now.side !== side || now.amount !== amount || now.slippage !== slippage || now.address !== address || now.environmentMode !== environmentMode) throw new Error("Trade changed while quoting. Review it again.");
        set({ pendingQuote: quote, reviewOpen: true });
      } catch (err: any) {
        get().addToast("Review unavailable", err.message || String(err), "err");
      } finally { set({ executing: false }); }
    },

    executeTrade: async () => {
      const {
        pair: pairKey,
        side,
        amount,
        pendingQuote,
        address,
        balances,
        ticketNonce,
        auditReceipts,
        activity,
        wrongNetwork,
        environmentMode,
      } = get();

      const liveIntent = environmentMode === "mainnet";
      if (liveIntent && get().pendingTransactions.length) {
        get().addToast("Resolve submitted transaction first", "Open Activity & receipts and query its Arc status. A timeout does not mean a transaction failed.", "warn");
        return;
      }
      if (get().executing || !pendingQuote) return;
      const context = pendingQuote.context;
      if (!context || context.pair !== pairKey || context.side !== side || context.amount !== amount || context.slippage !== get().slippage || context.address !== address || context.mode !== environmentMode) {
        set({ pendingQuote: null, reviewOpen: false });
        get().addToast("Review changed", "Review the current trade before signing.", "err");
        return;
      }
      if (liveIntent) {
        if (!address || !isAddress(address)) {
          get().addToast("Wallet Required", "Connect an Arc Mainnet wallet to execute a live trade.", "err");
          return;
        }
        if (wrongNetwork) {
          get().addToast("Wrong Network", "Switch the wallet to Arc Mainnet (Chain 5042) before executing.", "err");
          return;
        }
      }
      if (Date.now() > pendingQuote.expiresAt) {
        get().addToast("Quote Expired", "Please request a fresh trade quote.", "err");
        set({ reviewOpen: false });
        return;
      }

      const p = PAIRS[assertPair(pairKey)];
      if (liveIntent && (!p.address || p.cat === "imported")) {
        get().addToast(
          "Live Market Unavailable",
          p.cat === "imported"
            ? pairKey + " is an imported token and cannot be executed until its contract is independently verified."
            : pairKey + " has no verified Arc token contract in the registry. This market is simulation-only.",
          "err",
        );
        return;
      }

      set({ executing: true });

      try {
        const trader = normalizeAddress(address || DEMO_ADDRESS);

        if (!liveIntent) {
          if (side === "buy") assertCashReserve(parseUnits(balances.USDC || 0, 6), parseUnits(amount, 6), get().targetBufferUsd);
          const receipt = generateTradeReceipt({
            quote: pendingQuote,
            pairKey,
            trader,
            side,
            amount,
            mode: "simulation",
            status: "simulated",
            blockNumber: 0,
          });

          const nextBalances = simulateTrade(balances, p.base, side, amount, pendingQuote.price, pendingQuote.received, PAIRS["USYC/USDC"].price, pendingQuote.slippageBps);

          const label =
            side === "buy"
              ? "Simulated buy " + pendingQuote.received.toFixed(4) + " " + p.base + " for $" + amount.toFixed(2) + " USDC"
              : "Simulated sell " + (amount / p.price).toFixed(4) + " " + p.base + " for $" + pendingQuote.received.toFixed(2) + " USDC";

          set({
            balances: nextBalances,
            ticketNonce: ticketNonce + 1,
            auditReceipts: [receipt, ...auditReceipts].slice(0, 50),
            activity: [
              {
                ts: Date.now(),
                type: "trade",
                label,
                detail: "Simulation only · no Arc transaction was broadcast.",
                hash: receipt.signature,
                receiptId: receipt.receiptId,
                receipt,
              },
              ...activity,
            ],
            lastTx: { show: true, hash: receipt.signature, price: pendingQuote.effective, label, receipt },
            reviewOpen: false,
            pendingQuote: null,
            executing: false,
          });

          get().addToast("Simulation Complete", "No wallet transaction was sent. The receipt is marked simulated.", "info");
          return;
        }

        const tokenIn = side === "buy" ? ARC.usdcErc20 : p.address!;
        const tokenOut = side === "buy" ? p.address! : ARC.usdcErc20;
        const inputDecimals = side === "buy" ? 6 : (p.decimals ?? 18);
        const outputDecimals = side === "buy" ? (p.decimals ?? 18) : 6;

        // Execute precisely the raw input and minimum that the user reviewed.
        if (!pendingQuote.raw) throw new Error("Missing reviewed router quote");
        const amountInRaw = BigInt(pendingQuote.raw.amountIn);
        const minOutRaw = BigInt(pendingQuote.raw.minOut);
        const livePriceUsd = pendingQuote.price;
        const liveQuote = pendingQuote;

        const validateFreshInput = async () => {
          const raw = await publicRpc("eth_call", [{ to: tokenIn, data: "0x70a08231" + trader.slice(2).padStart(64, "0") }, "latest"]);
          if (typeof raw !== "string" || !/^0x[\da-f]+$/i.test(raw)) throw new Error("Input balance unavailable");
          const balance = BigInt(raw);
          if (balance < amountInRaw) throw new Error("Wallet input balance changed. Review again.");
          if (side === "buy") assertCashReserve(balance, amountInRaw, get().targetBufferUsd);
        };
        await validateFreshInput();
        const onchainNonce = await readTraderNonce(trader);
        const ticket = buildTradeTicket(trader, pairKey, side, amount, liveQuote, onchainNonce, livePriceUsd);
        ticket.message.amountIn = amountInRaw.toString();
        ticket.message.minAmountOut = minOutRaw.toString();

        const currentAllowance = await erc20Allowance(tokenIn, trader, ARC.settlement);
        if (currentAllowance < amountInRaw) {
          get().addToast("Approval Required", "Approve the exact input amount for this Arc settlement.", "info");
          const approveTx = await sendApproval(trader, tokenIn, ARC.settlement, amountInRaw);
          await waitForTransactionReceipt(approveTx);
        }

        if (Date.now() > pendingQuote.expiresAt) throw new Error("Quote expired during approval. Review again.");
        const walletChain = Number.parseInt(String(await walletRpc("eth_chainId")), 16);
        const walletAccounts = await walletRpc("eth_accounts");
        if (walletChain !== ARC.chainId || String(walletAccounts?.[0]).toLowerCase() !== trader) throw new Error("Wallet account or network changed. Review again.");
        const payload = {
          types: ticket.types,
          primaryType: ticket.primaryType,
          domain: ticket.domain,
          message: ticket.message,
        };

        get().addToast("Signature Required", "Sign the EIP-712 trade ticket in your wallet.", "info");
        const sig = await walletRpc("eth_signTypedData_v4", [trader, JSON.stringify(payload)]);

        if (typeof sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(sig)) {
          throw new Error("Wallet returned malformed EIP-712 signature");
        }

        const cleanSig = sig.replace(/^0x/i, "");
        const pad32 = (v: bigint | number | string) =>
          typeof v === "bigint" || typeof v === "number"
            ? BigInt(v).toString(16).padStart(64, "0")
            : String(v).replace(/^0x/i, "").toLowerCase().padStart(64, "0");
        const sigLen = (cleanSig.length / 2).toString(16).padStart(64, "0");
        const sigPadded = cleanSig.padEnd(Math.ceil(cleanSig.length / 64) * 64, "0");
        const calldata =
          "0x254f432b" +
          pad32(ticket.message.trader) +
          pad32(ticket.message.tokenIn) +
          pad32(ticket.message.tokenOut) +
          pad32(BigInt(ticket.message.amountIn)) +
          pad32(BigInt(ticket.message.minAmountOut)) +
          pad32(ticket.message.nonce) +
          pad32(ticket.message.deadline) +
          (256).toString(16).padStart(64, "0") +
          sigLen +
          sigPadded;

        if (Date.now() > pendingQuote.expiresAt) throw new Error("Quote expired while signing. Review again.");
        if (!get().livePortfolio || get().address !== trader || get().wrongNetwork) throw new Error("Wallet session changed before broadcast");
        await validateFreshInput();
        get().addToast("Broadcasting", "Sending executeTradeTicket to the deployed Arc settlement contract.", "info");
        const txHash = await walletRpc("eth_sendTransaction", [
          { from: trader, to: ARC.settlement, data: calldata, gas: "0x55730" },
        ]);

        const pending = [...get().pendingTransactions, txHash];
        const savedPending = writePending(pending);
        set({ pendingTransactions: pending });
        if (!savedPending) get().addToast("Save the transaction hash", `Device storage unavailable. Track ${txHash} on Arc Explorer before trying another trade.`, "warn");
        get().addToast("Pending", "Arc accepted the transaction. Waiting for confirmation.", "info");
        const confirmed = await waitForTransactionReceipt(txHash);

        const settled = decodeTradeSettledExecution(
          confirmed,
          ARC.settlement,
          trader,
          tokenIn,
          tokenOut,
        );
        if (!settled) {
          throw new Error("Arc transaction confirmed, but the deployed settlement event could not be verified");
        }

        if (settled.amountIn !== amountInRaw || settled.amountOut < minOutRaw) throw new Error("Confirmed event does not match reviewed input/output bounds. Resolve and inspect the submitted transaction before retrying.");
        const remainingPending = get().pendingTransactions.filter(hash => hash !== txHash);
        writePending(remainingPending);
        set({ pendingTransactions: remainingPending });

        const settledReceived = formatUnits(
          "0x" + settled.amountOut.toString(16),
          outputDecimals,
        );
        const settledInput = formatUnits(
          "0x" + settled.amountIn.toString(16),
          inputDecimals,
        );

        const confirmedEffective =
          side === "buy"
            ? amount / Math.max(settledReceived, Number.EPSILON)
            : settledReceived / Math.max(Number(settledInput), Number.EPSILON);

        const confirmedQuote = {
          ...liveQuote,
          received: settledReceived,
          effective: confirmedEffective,
          rate: confirmedEffective,
        };

        const receipt = generateTradeReceipt({
          quote: confirmedQuote,
          pairKey,
          trader,
          sig,
          transactionHash: txHash,
          executionReceiptHash: settled.receiptHash,
          actualAmountInRaw: settled.amountIn.toString(),
          actualAmountOutRaw: settled.amountOut.toString(),
          actualReceived: Number(settledReceived),
          side,
          amount,
          mode: "mainnet",
          status: "confirmed",
          blockNumber: confirmed.blockNumber,
        });

        // A confirmed settlement stays confirmed even if its optional anchor fails.
        set({ auditReceipts: [receipt, ...get().auditReceipts].slice(0, 50), lastTx: { show: true, hash: txHash, price: confirmedEffective, label: "Trade confirmed", receipt } });
        try {
          get().addToast("Anchoring Audit Proof", "Writing the certificate digest to Arc in a separate transaction.", "info");
          await anchorReceiptOnchain(receipt, trader);
          if (!(await checkReceiptAnchoredOnchain(receipt))) throw new Error("Anchor verification unavailable");
        } catch {
          receipt.onchainAnchored = false;
          get().addToast("Trade confirmed · anchor incomplete", "The trade settled. Its receipt is retained in Activity; the separate certificate anchor was not verified. Don't repeat the trade.", "warn");
        }
        let freshBalances = get().balances;
        try { freshBalances = await loadOnchainPortfolio(trader); await refreshLivePairValuation(); }
        catch { set({ livePortfolio: false }); get().addToast("Trade confirmed", "Wallet refresh failed. Reconnect to refresh your holdings before another trade.", "warn"); }
        const liveSizing = deriveLiveControlSizing(freshBalances);
        let nativeGasBalance = get().nativeGasBalance;
        try {
          const nativeHex = await publicRpc("eth_getBalance", [trader, "latest"]);
          nativeGasBalance = formatUnits(nativeHex, ARC.nativeDecimals);
        } catch {}

        const label =
          side === "buy"
            ? "Confirmed buy " + Number(settledReceived).toFixed(4) + " " + p.base + " for $" + amount.toFixed(2) + " USDC"
            : "Confirmed sell " + Number(settledInput).toFixed(4) + " " + p.base + " for $" + Number(settledReceived).toFixed(2) + " USDC";

        set({
          balances: freshBalances,
          nativeGasBalance,
          ticketNonce: onchainNonce + 1,
          // Keep explicit user edits, but nudge defaults only when their values
          // were still using the old demo defaults at the time of execution.
          targetBufferUsd: get().targetBufferUsd,
          stressTestAmount: get().stressTestAmount === 25000 ? liveSizing.stressTestAmount : get().stressTestAmount,
          auditReceipts: [receipt, ...auditReceipts].slice(0, 50),
          activity: [
            {
              ts: Date.now(),
              type: "trade",
              label,
              detail: "Arc Mainnet · confirmed block #" + confirmed.blockNumber.toLocaleString() + " · " + (receipt.onchainAnchored ? "certificate anchor verified" : "certificate anchor incomplete"),
              hash: txHash,
              receiptId: receipt.receiptId,
              receipt,
            },
            ...activity,
          ],
          lastTx: { show: true, hash: txHash, price: confirmedEffective, label, receipt },
          reviewOpen: false,
          pendingQuote: null,
          executing: false,
        });

        get().addToast(
          "Trade Confirmed",
          "Arc block #" + confirmed.blockNumber.toLocaleString() + " confirmed. " + (receipt.onchainAnchored ? "Audit digest verified." : "Receipt saved; anchor incomplete."),
          "ok",
        );
      } catch (err: any) {
        set({ executing: false });
        get().addToast(
          "Trade Failed",
          err?.code === 4001 ? "Wallet action rejected." : (err?.message || String(err)),
          "err",
        );
      }
    },

    refuelGasTank: async (amountUsdc: number) => {
      const { balances, livePortfolio } = get();
      if (livePortfolio) {
        get().addToast(
          "Live Gas Tank Disabled",
          "Arc uses native USDC directly for gas. Interminal reads the wallet's native USDC balance instead of simulating a conversion.",
          "warn",
        );
        return;
      }
      if (!Number.isFinite(amountUsdc) || amountUsdc <= 0 || (balances.USDC || 0) < amountUsdc) {
        get().addToast("Invalid Gas Refill", "Enter a valid amount within the simulated USDC balance.", "err");
        return;
      }
      set({ gasRefueling: true });
      await new Promise((r) => setTimeout(r, 500));
      set((s) => ({
        gasRefueling: false,
        gasTankModalOpen: false,
        nativeGasBalance: s.nativeGasBalance + amountUsdc,
        balances: {
          ...s.balances,
          USDC: Math.max(0, (s.balances.USDC || 0) - amountUsdc),
        },
        activity: [
          {
            ts: Date.now(),
            type: "gas",
            label: "Simulated Gas Tank Refill: $" + amountUsdc.toFixed(2) + " USDC",
            detail: "Simulation only · no Arc transaction was broadcast.",
          },
          ...s.activity,
        ],
      }));
      get().addToast("Simulation Gas Refilled", "Native gas balance is simulated for the demo only.", "info");
    },

    createAgentMandate: async ({ spendUsd, slipBps, ttlHours, pairs, agent: requestedAgent }) => {
      const { address, mandates, livePortfolio, environmentMode } = get();
      const liveIntent = environmentMode === "mainnet";

      // The deployed Arc settlement address is the v1 contract. Its live agent
      // executor does not bind execution.tokenIn/tokenOut to the signed pair mask,
      // so an authorized agent could spend an approved ERC-20 allowance on an
      // unintended token. Never sign new live mandates against that deployment.
      if (liveIntent) {
        get().addToast(
          "Live Agent Mandates Disabled",
          "The deployed settlement is v1. Live agent delegation stays locked until the hardened successor is deployed and verified.",
          "warn",
        );
        return;
      }
      if (liveIntent && (!address || !isAddress(address))) {
        get().addToast("Wallet Required", "Connect an Arc Mainnet wallet to sign a live mandate.", "err");
        return;
      }
      const trader = normalizeAddress(address || DEMO_ADDRESS);
      const agent = requestedAgent ? normalizeAddress(requestedAgent) : trader;

      try {
        const mandate = createAgentMandateDescriptor({
          trader,
          agent,
          maxSpendUsd: spendUsd,
          maxSlippageBps: slipBps,
          allowedPairs: pairs,
          ttlSeconds: ttlHours * 3600,
          nonce: liveIntent ? await readMandateNonce(trader) : 0,
        });

        let signedMandate = mandate;
        if (liveIntent) {
          const ticket = buildAgentMandateTicket(mandate);
          const payload = serializeEip712(ticket);
          const signature = await walletRpc("eth_signTypedData_v4", [trader, payload]);
          signedMandate = { ...mandate, signature };
        }

        set({
          mandates: [signedMandate, ...mandates],
          mandateModalOpen: false,
        });

        get().addToast(
          liveIntent ? "Mandate Signed" : "Simulation Mandate Created",
          liveIntent
            ? "EIP-712 mandate signed for agent " + shortAddr(agent) + ". No background executor is running in this browser."
            : "Simulation only · no Arc transaction was broadcast.",
          livePortfolio ? "ok" : "info",
        );
      } catch (e: any) {
        get().addToast("Mandate Error", e.message || String(e), "err");
      }
    },

    runProof: async () => {
      if (get().proof.running) return;
      set((s) => ({ proof: { ...s.proof, running: true, local: failClosedLocalProofs() } }));
      try {
        const live = await verifyArcLive();
        const head = live.rows.find((r) => r.block);
        set((s) => ({
          block: head?.block || s.block,
          proof: { running: false, live, local: failClosedLocalProofs(), checkedAt: Date.now() },
        }));
        const passed = live.chainOk && live.rows.every(r => r.ok) && failClosedLocalProofs().every(r => r.ok);
        get().addToast(passed ? "Checks passed" : "Verification incomplete", "Review each result below. Infrastructure checks do not prove a treasury trade executed.", passed ? "ok" : "warn");
      } catch (e: any) {
        set({
          proof: {
            running: false,
            live: { chainId: null, chainOk: false, rows: [{ id: "rpc", ok: false, detail: e.message || String(e) }] },
            local: failClosedLocalProofs(),
            checkedAt: Date.now(),
          },
        });
      }
    },

    executeSweepOnchain: async (sweepAmountUsdc: number, direction: "sweep" | "unwind") => {
      if (get().executing || get().environmentMode === "testnet") return;
      const { address, environmentMode } = get();
      const liveIntent = environmentMode === "mainnet";

      if (!Number.isFinite(sweepAmountUsdc) || sweepAmountUsdc <= 0) {
        get().addToast("Invalid Treasury Amount", "Amount must be greater than zero.", "warn");
        return;
      }

      if (liveIntent) {
        if (!get().livePortfolio || !address || !isAddress(address)) {
          get().addToast("Wallet Required", "Connect an Arc Mainnet wallet to execute a live treasury action.", "err");
          return;
        }
        if (get().wrongNetwork) {
          get().addToast("Wrong Network", "Switch the wallet to Arc Mainnet (Chain 5042) first.", "err");
          return;
        }
      }

      if (!liveIntent) {
        let nextBalances;
        try {
          if (direction === "sweep") assertCashReserve(parseUnits(get().balances.USDC || 0, 6), parseUnits(sweepAmountUsdc, 6), get().targetBufferUsd);
          nextBalances = simulateTreasury(get().balances, sweepAmountUsdc, direction, PAIRS["USYC/USDC"].price); }
        catch (err: any) { get().addToast("Treasury action blocked", err.message, "err"); return; }
        if (direction === "sweep") {
          const receipt = generateTradeReceipt({
            quote: {
              price: PAIRS["USYC/USDC"].price,
              effective: PAIRS["USYC/USDC"].price,
              received: sweepAmountUsdc / PAIRS["USYC/USDC"].price,
              minReceived: sweepAmountUsdc / PAIRS["USYC/USDC"].price * 0.9995,
              impact: 0,
              slippageBps: 5,
              gasUsd: 0,
              expiresAt: Date.now() + 600000,
            },
            pairKey: "USYC/USDC",
            trader: normalizeAddress(address || DEMO_ADDRESS),
            side: "buy",
            amountUsd: sweepAmountUsdc,
            mode: "simulation",
            status: "simulated",
            blockNumber: 0,
          });
          set((s) => ({
            balances: nextBalances,
            auditReceipts: [receipt, ...s.auditReceipts.filter(item => item.receiptId !== receipt.receiptId)].slice(0, 50),
            activity: [
              {
                ts: Date.now(),
                type: "sweep",
                label: "Simulated Yield Sweep: $" + sweepAmountUsdc.toLocaleString() + " USDC → USYC",
                detail: "Simulation only · no Arc transaction was broadcast.",
                hash: receipt.signature,
                receiptId: receipt.receiptId,
                receipt,
              },
              ...s.activity,
            ],
          }));
          get().addToast("Simulation Sweep Complete", "No Arc transaction was broadcast.", "info");
        } else {
          const receipt = generateTradeReceipt({
            quote: {
              price: PAIRS["USYC/USDC"].price,
              effective: PAIRS["USYC/USDC"].price,
              received: sweepAmountUsdc * PAIRS["USYC/USDC"].price,
              minReceived: sweepAmountUsdc * PAIRS["USYC/USDC"].price * 0.9995,
              impact: 0,
              slippageBps: 5,
              gasUsd: 0,
              expiresAt: Date.now() + 600000,
            },
            pairKey: "USYC/USDC",
            trader: normalizeAddress(address || DEMO_ADDRESS),
            side: "sell",
            amountUsd: sweepAmountUsdc * PAIRS["USYC/USDC"].price,
            mode: "simulation",
            status: "simulated",
            blockNumber: 0,
          });
          set((s) => ({
            balances: nextBalances,
            auditReceipts: [receipt, ...s.auditReceipts.filter(item => item.receiptId !== receipt.receiptId)].slice(0, 50),
            activity: [
              {
                ts: Date.now(),
                type: "sweep",
                label: "Simulated JIT Unwind: $" + sweepAmountUsdc.toLocaleString() + " USYC → USDC",
                detail: "Simulation only · no Arc transaction was broadcast.",
                hash: receipt.signature,
                receiptId: receipt.receiptId,
                receipt,
              },
              ...s.activity,
            ],
          }));
          get().addToast("Simulation Unwind Complete", "No Arc transaction was broadcast.", "info");
        }
        return;
      }

      // Every live treasury action must enter the shared review flow.
      get().setPair("USYC/USDC");
      get().setSide(direction === "sweep" ? "buy" : "sell");
      get().setAmount(direction === "sweep" ? sweepAmountUsdc : sweepAmountUsdc * PAIRS["USYC/USDC"].price);
      await get().prepareTradeReview(direction === "unwind" ? sweepAmountUsdc : undefined);
    },

    importCustomToken: async (address: string) => {
      if (!isAddress(address)) {
        set({ importTokenError: "Invalid EVM contract address" });
        return;
      }
      if (get().importingToken || get().executing) return;
      set({ importingToken: true, importTokenError: "" });
      try {
        const addr = normalizeAddress(address);
      // Temporarily allow the user-supplied contract for read-only metadata lookup.
      // Never persist arbitrary imports in the global RPC target allowlist.
      const alreadyAllowed = TOKEN_ALLOW.has(addr);
      TOKEN_ALLOW.add(addr);
      let metadata;
      try {
        metadata = await readErc20Metadata(addr);
      } finally {
        if (!alreadyAllowed) TOKEN_ALLOW.delete(addr);
      }

      const sym = metadata.symbol;
      // Keep normal symbol pairs in the UI when the symbol is not already claimed
      // by a verified market. If it collides, retain the symbol and add a short
      // address suffix so the imported contract cannot hijack the verified pair.
      const symbolPairKey = sym + "/USDC";
      const pairKey = PAIRS[symbolPairKey]
        ? sym + "-" + addr.slice(2, 8).toUpperCase() + "/USDC"
        : symbolPairKey;
      PAIRS[pairKey] = {
        base: sym,
        quote: "USDC",
        price: 1.0,
        change: 0,
        high: 1.0,
        low: 1.0,
        vol: 0,
        tvl: 0,
        seed: 99,
        cat: "imported",
        address: metadata.address,
        decimals: metadata.decimals,
        oracle: "Imported ERC-20 · view-only until independently verified",
      };

      set((s) => ({
        importingToken: false,
        importTokenOpen: false,
        customTokens: [
          ...s.customTokens,
          { address: metadata.address, name: metadata.name, symbol: sym, decimals: metadata.decimals, pairKey },
        ],
        pair: pairKey,
        view: "terminal",
      }));
      get().addToast("Token Imported", `${sym} · ${metadata.name} registered from Arc contract metadata.`, "ok");
      } catch (err: any) {
        set({ importingToken: false, importTokenError: err.message || String(err) });
      }
    },
  };
});

// Archive certificates only. Wallet authorization, balances, and pending reviews are never persisted.
useAppStore.subscribe((state, previous) => {
  if (state.auditReceipts !== previous.auditReceipts && state.auditReceipts.length) {
    const saved = saveArchive(state.auditReceipts);
    if (typeof window !== "undefined" && state.archiveWarning === saved) {
      useAppStore.setState({ archiveWarning: !saved });
    }
  }
});

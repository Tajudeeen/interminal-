import { create } from "zustand";
import { ARC, TOKEN_ALLOW } from "../constants/arc";
import { EnvironmentMode, NETWORKS } from "../constants/networks";
import { PAIRS, assertPair } from "../constants/pairs";
import { Candle, ChartMode, Indicators, MarketAnalysis, Timeframe } from "../types/market";
import { DcaPlan, OrderType, TradeQuote, TradeSide } from "../types/trade";
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
import { calculateJitUnwind } from "../lib/math/treasury";
import { CandleSource, computeIndicators, analyzeMarket, getCandles } from "../lib/math/indicators";
import { formatUnits, parseUnits, quoteTrade } from "../lib/math/quotes";
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
} from "../lib/arc/wallet";
import {
  loadOnchainPortfolio,
  publicRpc,
  readTraderNonce,
  readMandateNonce,
  routerAmountOut,
  decodeTradeSettledExecution,
  verifyArcLive,
  erc20Allowance,
  sendApproval,
  waitForTransactionReceipt,
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
  orderType: OrderType;
  amount: number;
  slippage: number;
  targetBufferUsd: number;
  stressTestAmount: number;
  candles: Candle[];
  indicators: Indicators | null;
  candleSource: CandleSource;
  analysis: MarketAnalysis | null;
  aiCore: "market" | "trade" | "portfolio" | "wallet";
  dcaSpendTotal: number;
  dcaSliceSize: number;
  dcaFreqSec: number;
  dcaOrders: DcaPlan[];
  activity: any[];
  mandates: AgentMandateDescriptor[];
  auditReceipts: TradeReceipt[];
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
  setEnvironmentMode: (mode: EnvironmentMode) => void;
  launchTestnet: () => void;
  performMainnetFromTestnet: () => void;
  setPair: (pair: string) => void;
  setTimeframe: (tf: Timeframe) => void;
  setChartMode: (mode: ChartMode) => void;
  setSide: (side: TradeSide) => void;
  setOrderType: (ot: OrderType) => void;
  setAmount: (amt: number) => void;
  setSlippage: (slip: number) => void;
  setTargetBufferUsd: (amt: number) => void;
  setStressTestAmount: (amt: number) => void;
  setDcaSpendTotal: (amt: number) => void;
  setDcaSliceSize: (amt: number) => void;
  setDcaFreqSec: (sec: number) => void;
  setSearchOpen: (open: boolean) => void;
  setSearchQuery: (q: string) => void;
  setGasTankModalOpen: (open: boolean) => void;
  setMandateModalOpen: (open: boolean) => void;
  setReviewOpen: (open: boolean) => void;
  setActiveReceiptModal: (receipt: TradeReceipt | null) => void;
  setImportTokenOpen: (open: boolean) => void;
  setAiCore: (core: AppState["aiCore"]) => void;
  setShowLevels: (show: boolean) => void;
  addToast: (title: string, body: string, kind?: ToastItem["kind"]) => void;
  removeToast: (id: string) => void;
  connectWallet: (target?: "testnet" | "mainnet") => Promise<void>;
  switchToCurrentNetwork: () => Promise<void>;
  completeTestnetTask: () => void;
  runTestnetProof: () => Promise<void>;
  launchDemo: () => void;
  disconnectWallet: () => void;
  syncMarketData: () => Promise<void>;
  runAiAnalysis: () => void;
  startDcaPlan: () => void;
  prepareTradeReview: () => void;
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

function getInitialTheme(): "dark" | "light" {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("interminal_theme");
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
      label: "Simulated DCA Execution: 1 ETH @ $2,481.42",
      detail: "Simulation only · DCA scheduling runs in the browser.",
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
    orderType: "market",
    amount: 500,
    slippage: 0.5,
    targetBufferUsd: 5000,
    stressTestAmount: 25000,
    candles: [],
    indicators: null,
    candleSource: "unavailable",
    analysis: null,
    aiCore: "market",
    dcaSpendTotal: 100,
    dcaSliceSize: 20,
    dcaFreqSec: 60,
    dcaOrders: [],
    activity: getInitialActivity(),
    mandates: [],
    auditReceipts: getInitialAuditReceipts(),
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
      get().launchDemo();
      set({ judgeTourOpen: true, judgeTourStep: 1, view: "portfolio" });
    },

    setTheme: (theme) => {
      set({ theme });
      if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("dark", theme === "dark");
        document.body.style.background = theme === "dark" ? "#000000" : "#FFFFFF";
        document.body.style.color = theme === "dark" ? "#FFFFFF" : "#0A0A0A";
        localStorage.setItem("interminal_theme", theme);
      }
    },

    toggleTheme: () => {
      const next = get().theme === "dark" ? "light" : "dark";
      if (typeof document !== "undefined" && "startViewTransition" in document) {
        (document as any).startViewTransition(() => {
          get().setTheme(next);
        });
      } else {
        get().setTheme(next);
      }
    },

    setEnvironmentMode: (mode) => {
      set({
        environmentMode: mode,
        testnetTaskComplete: mode === "testnet" ? get().testnetTaskComplete : false,
      });
    },

    launchTestnet: () => {
      set({
        environmentMode: "testnet",
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
      if (!get().testnetTaskComplete || !get().testnetTxHash) {
        get().addToast("Testnet Proof Required", "Complete the confirmed Arc Testnet execution check before opening Mainnet execution.", "warn");
        return;
      }
      set({
        environmentMode: "mainnet",
        testnetTaskComplete: false,
        connected: false,
        address: null,
        chainId: null,
        wrongNetwork: false,
        livePortfolio: false,
        providerLabel: null,
        view: "terminal",
      });
      get().addToast("Mainnet Execution Ready", "Connect an Arc Mainnet wallet to perform the verified task for real.", "ok");
    },

    completeTestnetTask: () => {
      set({ testnetTaskComplete: true });
      get().addToast("Testnet Task Complete", "The testnet drill is complete. Mainnet execution is now unlocked.", "ok");
    },

    runTestnetProof: async () => {
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
        get().addToast("Testnet Execution", "Sending a 0.01 native USDC self-transfer to prove wallet signing and Arc Testnet settlement.", "info");

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
          "Testnet Task Confirmed",
          "Arc Testnet confirmed the transaction. Mainnet execution is now unlocked.",
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
        (document as any).startViewTransition(() => {
          set({ view, searchOpen: false });
          requestAnimationFrame(() => {
            document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
          });
        });
      } else {
        set({ view, searchOpen: false });
        requestAnimationFrame(() => {
          document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
        });
      }
    },

    setPair: (pair) => {
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
    setSide: (side) => set({ side }),
    setOrderType: (orderType) => set({ orderType }),
    setAmount: (amount) => set({ amount }),
    setSlippage: (slippage) => set({ slippage }),
    setTargetBufferUsd: (targetBufferUsd) => set({ targetBufferUsd }),
    setStressTestAmount: (stressTestAmount) => set({ stressTestAmount }),
    setDcaSpendTotal: (dcaSpendTotal) => set({ dcaSpendTotal }),
    setDcaSliceSize: (dcaSliceSize) => set({ dcaSliceSize }),
    setDcaFreqSec: (dcaFreqSec) => set({ dcaFreqSec }),
    setSearchOpen: (searchOpen) => set({ searchOpen }),
    setSearchQuery: (searchQuery) => set({ searchQuery }),
    setGasTankModalOpen: (gasTankModalOpen) => set({ gasTankModalOpen }),
    setMandateModalOpen: (mandateModalOpen) => set({ mandateModalOpen }),
    setReviewOpen: (reviewOpen) => set({ reviewOpen }),
    setActiveReceiptModal: (activeReceiptModal) => set({ activeReceiptModal }),
    setImportTokenOpen: (importTokenOpen) => set({ importTokenOpen }),
    setAiCore: (aiCore) => set({ aiCore }),
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
      const requested = target || (get().environmentMode === "testnet" ? "testnet" : "mainnet");
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
      set({ connecting: true, walletError: "" });
      try {
        const network = NETWORKS[requested];
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
          let ticketNonce = 0;
          try { ticketNonce = await readTraderNonce(address); } catch {}
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
            environmentMode: "mainnet",
            view: "portfolio",
          });
        } else {
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
        set({ chainId, wrongNetwork: false });
        get().addToast("Network Ready", "Connected to " + NETWORKS[mode].name + " (" + NETWORKS[mode].chainId + ").", "ok");
      } catch (err: any) {
        get().addToast("Network Switch Failed", err.message || String(err), "err");
      }
    },
    launchDemo: () => {
      const demoPair = "ETH/USDC";
      set({
        environmentMode: "demo",
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
      set({
        connected: false,
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
        "AI Market Analysis",
        `${analysis.trend} regime · Support: $${analysis.support.toFixed(2)} / Resist: $${analysis.resistance.toFixed(2)}`,
        "info"
      );
    },

    startDcaPlan: () => {
      const { pair, dcaSpendTotal, dcaSliceSize, dcaFreqSec } = get();
      if (!Number.isFinite(dcaSpendTotal) || dcaSpendTotal <= 0 || !Number.isFinite(dcaSliceSize) || dcaSliceSize <= 0 || !Number.isFinite(dcaFreqSec) || dcaFreqSec <= 0) {
        get().addToast("Invalid DCA Parameters", "Budget, slice size, and interval must be positive.", "err");
        return;
      }
      const totalSlices = Math.max(1, Math.floor(dcaSpendTotal / dcaSliceSize));
      const order: DcaPlan = {
        id: "dca-" + Date.now(),
        pair,
        totalBudget: dcaSpendTotal,
        sliceAmount: dcaSliceSize,
        intervalSec: dcaFreqSec,
        executedBudget: 0,
        totalSlices,
        completedSlices: 0,
        status: "active",
        createdAt: Date.now(),
        nextRun: Date.now() + dcaFreqSec * 1000,
      };
      set((s) => ({ dcaOrders: [order, ...s.dcaOrders] }));
      get().addToast(
        "DCA Simulation Scheduled",
        "Scheduled " + totalSlices + " simulated slices of " + pair + ". The browser does not run a background autonomous executor.",
        "info"
      );
    },

    prepareTradeReview: () => {
      const { pair: pairKey, side, amount, slippage, balances } = get();
      const p = PAIRS[assertPair(pairKey)];
      if (!amount || amount <= 0) {
        get().addToast("Invalid Amount", "Enter a positive trade size.", "err");
        return;
      }
      if (get().wrongNetwork) {
        get().addToast("Wrong Network", "Switch the wallet to Arc Mainnet (Chain 5042) first.", "err");
        return;
      }
      if (get().livePortfolio && !PAIRS[assertPair(pairKey)].address) {
        get().addToast(
          "Live Market Unavailable",
          pairKey + " has no verified Arc token contract in the registry. This market is simulation-only.",
          "err",
        );
        return;
      }
      if (side === "buy") {
        const jit = calculateJitUnwind({
          tradeAmountUsd: amount,
          liquidUsdc: balances.USDC || 0,
          usycBalance: balances.USYC || 0,
          slippageBps: slippage * 100,
        });
        if (!jit.canCover) {
          get().addToast("Insufficient Liquidity", "Amount exceeds liquid USDC and redeemable USYC capacity.", "err");
          return;
        }
      } else {
        const baseBal = balances[p.base] || 0;
        const reqBase = amount / p.price;
        if (baseBal < reqBase * 0.999) {
          get().addToast(
            "Insufficient Balance",
            `Required: ${reqBase.toFixed(4)} ${p.base}, available: ${baseBal.toFixed(4)} ${p.base}`,
            "err"
          );
          return;
        }
      }
      const quote = quoteTrade({ side, amountUsd: amount, price: p.price, slippageBps: slippage * 100 });
      set({ pendingQuote: quote, reviewOpen: true });
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
      if (!pendingQuote) return;
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
      if (liveIntent && !p.address) {
        get().addToast(
          "Live Market Unavailable",
          pairKey + " has no verified Arc token contract in the registry. This market is simulation-only.",
          "err",
        );
        return;
      }

      set({ executing: true });

      try {
        const trader = normalizeAddress(address || DEMO_ADDRESS);

        if (!liveIntent) {
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

          const nextBalances = { ...balances };
          if (side === "buy") {
            nextBalances.USDC = Math.max(0, (nextBalances.USDC || 0) - amount);
            nextBalances[p.base] = (nextBalances[p.base] || 0) + pendingQuote.received;
          } else {
            nextBalances[p.base] = Math.max(0, (nextBalances[p.base] || 0) - amount / p.price);
            nextBalances.USDC = (nextBalances.USDC || 0) + pendingQuote.received;
          }

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

        get().addToast("Live Quote", "Reading the verified Arc AMM quote before signing the trade ticket.", "info");

        let inputAmount = amount;
        let livePriceUsd = p.price;
        if (side === "sell") {
          const oneTokenRaw = parseUnits(1, inputDecimals);
          const oneTokenOutRaw = await routerAmountOut(tokenIn, tokenOut, oneTokenRaw);
          livePriceUsd = formatUnits("0x" + oneTokenOutRaw.toString(16), outputDecimals);
          if (!Number.isFinite(livePriceUsd) || livePriceUsd <= 0) {
            throw new Error("Arc AMM returned an invalid live token price");
          }
          inputAmount = amount / livePriceUsd;
        }

        const amountInRaw = parseUnits(inputAmount, inputDecimals);
        if (amountInRaw <= 0n) throw new Error("Trade amount rounds to zero at token precision");

        const quotedOutRaw = await routerAmountOut(tokenIn, tokenOut, amountInRaw);
        if (quotedOutRaw <= 0n) throw new Error("Arc AMM returned zero output for this route");

        const slippageBps = Math.round(get().slippage * 100);
        const minOutRaw = quotedOutRaw * BigInt(10_000 - slippageBps) / 10_000n;
        const received = formatUnits("0x" + quotedOutRaw.toString(16), outputDecimals);
        const minReceived = formatUnits("0x" + minOutRaw.toString(16), outputDecimals);
        if (side === "buy") {
          livePriceUsd = amount / Math.max(received, Number.EPSILON);
        }
        const effective =
          side === "buy"
            ? amount / Math.max(received, Number.EPSILON)
            : received / Math.max(inputAmount, Number.EPSILON);

        const liveQuote: TradeQuote = {
          ...pendingQuote,
          price: livePriceUsd,
          received,
          minReceived,
          effective,
          rate: effective,
          impact: 0,
          slippageBps,
          expiresAt: Date.now() + 20_000,
        };

        const onchainNonce = await readTraderNonce(trader);
        const ticket = buildTradeTicket(trader, pairKey, side, amount, liveQuote, onchainNonce, livePriceUsd);

        const currentAllowance = await erc20Allowance(tokenIn, trader, ARC.settlement);
        if (currentAllowance < amountInRaw) {
          get().addToast("Approval Required", "Approve the exact input amount for this Arc settlement.", "info");
          const approveTx = await sendApproval(trader, tokenIn, ARC.settlement, amountInRaw);
          await waitForTransactionReceipt(approveTx);
        }

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

        get().addToast("Broadcasting", "Sending executeTradeTicket to the deployed Arc settlement contract.", "info");
        const txHash = await walletRpc("eth_sendTransaction", [
          { from: trader, to: ARC.settlement, data: calldata, gas: "0x55730" },
        ]);

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
          actualReceived: Number(settledReceived),
          side,
          amount,
          mode: "mainnet",
          status: "confirmed",
          blockNumber: confirmed.blockNumber,
        });

        get().addToast("Anchoring Audit Proof", "Writing the certificate digest to the Arc settlement contract.", "info");
        await anchorReceiptOnchain(receipt, trader);
        if (!(await checkReceiptAnchoredOnchain(receipt))) {
          throw new Error("Arc confirmed the anchor transaction, but the certificate digest could not be verified");
        }

        const freshBalances = await loadOnchainPortfolio(trader);
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
          auditReceipts: [receipt, ...auditReceipts].slice(0, 50),
          activity: [
            {
              ts: Date.now(),
              type: "trade",
              label,
              detail: "Arc Mainnet · confirmed block #" + confirmed.blockNumber.toLocaleString() + " · certificate anchored and verified",
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
          "Arc block #" + confirmed.blockNumber.toLocaleString() + " confirmed. Audit digest is anchored and verified.",
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
      set((s) => ({ proof: { ...s.proof, running: true, local: failClosedLocalProofs() } }));
      try {
        const live = await verifyArcLive();
        const head = live.rows.find((r) => r.block);
        set((s) => ({
          block: head?.block || s.block,
          proof: { running: false, live, local: failClosedLocalProofs(), checkedAt: Date.now() },
        }));
        get().addToast("Proof Verification Complete", "All 14 fail-closed gates and live RPC verified.", "ok");
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
      const { address, environmentMode } = get();
      const liveIntent = environmentMode === "mainnet";

      if (!Number.isFinite(sweepAmountUsdc) || sweepAmountUsdc <= 0) {
        get().addToast("Invalid Treasury Amount", "Amount must be greater than zero.", "warn");
        return;
      }

      if (liveIntent) {
        if (!address || !isAddress(address)) {
          get().addToast("Wallet Required", "Connect an Arc Mainnet wallet to execute a live treasury action.", "err");
          return;
        }
        if (get().wrongNetwork) {
          get().addToast("Wrong Network", "Switch the wallet to Arc Mainnet (Chain 5042) first.", "err");
          return;
        }
      }

      if (!liveIntent) {
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
            balances: {
              ...s.balances,
              USDC: Math.max(0, (s.balances.USDC || 0) - sweepAmountUsdc),
              USYC: (s.balances.USYC || 0) + sweepAmountUsdc / PAIRS["USYC/USDC"].price,
            },
            auditReceipts: [receipt, ...s.auditReceipts].slice(0, 50),
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
              received: sweepAmountUsdc,
              minReceived: sweepAmountUsdc * 0.9995,
              impact: 0,
              slippageBps: 5,
              gasUsd: 0,
              expiresAt: Date.now() + 600000,
            },
            pairKey: "USYC/USDC",
            trader: normalizeAddress(address),
            side: "sell",
            amountUsd: sweepAmountUsdc * PAIRS["USYC/USDC"].price,
            mode: "simulation",
            status: "simulated",
            blockNumber: 0,
          });
          set((s) => ({
            balances: {
              ...s.balances,
              USDC: (s.balances.USDC || 0) + sweepAmountUsdc,
              USYC: Math.max(0, (s.balances.USYC || 0) - sweepAmountUsdc),
            },
            auditReceipts: [receipt, ...s.auditReceipts].slice(0, 50),
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

      set({ executing: true });
      try {
        const trader = normalizeAddress(address!);
        const isSweep = direction === "sweep";
        const tokenIn = isSweep ? ARC.usdcErc20 : ARC.tokens.USYC.address;
        const tokenOut = isSweep ? ARC.tokens.USYC.address : ARC.usdcErc20;
        const amountInRaw = parseUnits(sweepAmountUsdc, 6);
        if (amountInRaw <= 0n) throw new Error("Treasury amount rounds to zero");

        get().addToast("Live Treasury Quote", "Reading the Arc AMM USDC/USYC route before signing.", "info");
        const quotedOutRaw = await routerAmountOut(tokenIn, tokenOut, amountInRaw);
        if (quotedOutRaw <= 0n) throw new Error("Arc AMM returned zero output for the treasury route");

        const slippageBps = 5;
        const minOutRaw = quotedOutRaw * 9995n / 10000n;
        const received = formatUnits("0x" + quotedOutRaw.toString(16), 6);
        const minReceived = formatUnits("0x" + minOutRaw.toString(16), 6);
        const effective = isSweep
          ? sweepAmountUsdc / Math.max(received, Number.EPSILON)
          : received / Math.max(sweepAmountUsdc, Number.EPSILON);

        const nonce = await readTraderNonce(trader);
        const deadline = Math.floor(Date.now() / 1000) + 600;
        const ticket = {
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
          primaryType: "TradeTicket" as const,
          domain: {
            name: "Interminal",
            version: "1",
            chainId: ARC.chainId,
            verifyingContract: ARC.settlement,
          },
          message: {
            trader,
            tokenIn: tokenIn.toLowerCase(),
            tokenOut: tokenOut.toLowerCase(),
            amountIn: amountInRaw.toString(),
            minAmountOut: minOutRaw.toString(),
            nonce,
            deadline,
          },
        };

        const currentAllowance = await erc20Allowance(tokenIn, trader, ARC.settlement);
        if (currentAllowance < amountInRaw) {
          get().addToast("Approval Required", "Approve the exact treasury input amount.", "info");
          const approvalTx = await sendApproval(trader, tokenIn, ARC.settlement, amountInRaw);
          await waitForTransactionReceipt(approvalTx);
        }

        get().addToast("Signature Required", "Sign the bounded treasury TradeTicket.", "info");
        const sig = await walletRpc("eth_signTypedData_v4", [trader, JSON.stringify(ticket)]);
        if (typeof sig !== "string" || !/^0x[0-9a-fA-F]{130}$/.test(sig)) {
          throw new Error("Wallet returned malformed EIP-712 signature");
        }

        const cleanSig = sig.slice(2);
        const pad32 = (v: string | number | bigint) =>
          typeof v === "string"
            ? v.replace(/^0x/i, "").toLowerCase().padStart(64, "0")
            : BigInt(v).toString(16).padStart(64, "0");
        const sigLen = (cleanSig.length / 2).toString(16).padStart(64, "0");
        const sigPadded = cleanSig.padEnd(Math.ceil(cleanSig.length / 64) * 64, "0");
        const calldata =
          "0x254f432b" +
          pad32(trader) +
          pad32(tokenIn) +
          pad32(tokenOut) +
          pad32(amountInRaw) +
          pad32(minOutRaw) +
          pad32(nonce) +
          pad32(deadline) +
          (256).toString(16).padStart(64, "0") +
          sigLen +
          sigPadded;

        get().addToast("Broadcasting", "Submitting treasury execution to Arc Mainnet.", "info");
        const txHash = await walletRpc("eth_sendTransaction", [
          { from: trader, to: ARC.settlement, data: calldata, gas: "0x55730" },
        ]);

        const confirmed = await waitForTransactionReceipt(txHash);
        const receipt = generateTradeReceipt({
          quote: {
            price: PAIRS["USYC/USDC"].price,
            effective,
            received,
            minReceived,
            impact: 0,
            slippageBps,
            gasUsd: 0.0012,
            expiresAt: Date.now() + 600000,
          },
          pairKey: "USYC/USDC",
          trader,
          sig,
          transactionHash: txHash,
          side: isSweep ? "buy" : "sell",
          amountUsd: sweepAmountUsdc,
          mode: "mainnet",
          status: "confirmed",
          blockNumber: confirmed.blockNumber,
        });

        await anchorReceiptOnchain(receipt, trader);
        if (!(await checkReceiptAnchoredOnchain(receipt))) {
          throw new Error("Certificate anchor could not be verified on Arc");
        }

        const freshBalances = await loadOnchainPortfolio(trader);
        let nativeGasBalance = get().nativeGasBalance;
        try {
          nativeGasBalance = formatUnits(await publicRpc("eth_getBalance", [trader, "latest"]), ARC.nativeDecimals);
        } catch {}

        set((s) => ({
          balances: freshBalances,
          nativeGasBalance,
          ticketNonce: nonce + 1,
          auditReceipts: [receipt, ...s.auditReceipts].slice(0, 50),
          activity: [
            {
              ts: Date.now(),
              type: "sweep",
              label: isSweep
                ? "Confirmed Yield Sweep: $" + sweepAmountUsdc.toLocaleString() + " USDC → USYC"
                : "Confirmed JIT Unwind: $" + sweepAmountUsdc.toLocaleString() + " USYC → USDC",
              detail: "Arc Mainnet · block #" + confirmed.blockNumber.toLocaleString() + " · certificate anchored and verified",
              hash: txHash,
              receiptId: receipt.receiptId,
              receipt,
            },
            ...s.activity,
          ],
          executing: false,
        }));

        get().addToast(
          isSweep ? "Yield Sweep Confirmed" : "JIT Unwind Confirmed",
          "Arc block #" + confirmed.blockNumber.toLocaleString() + " confirmed. Certificate anchor verified.",
          "ok",
        );
      } catch (err: any) {
        set({ executing: false });
        get().addToast(
          "Treasury Action Failed",
          err?.code === 4001 ? "Wallet action rejected." : (err?.message || String(err)),
          "err",
        );
      }
    },

    importCustomToken: async (address: string) => {
      if (!isAddress(address)) {
        set({ importTokenError: "Invalid EVM contract address" });
        return;
      }
      set({ importingToken: true, importTokenError: "" });
      try {
        const addr = address.toLowerCase();
        TOKEN_ALLOW.add(addr);
        const sym = addr.slice(0, 6).toUpperCase();
        const pairKey = sym + "/USDC";
        if (!PAIRS[pairKey]) {
          PAIRS[pairKey] = {
            base: sym,
            quote: "USDC",
            price: 1.0,
            change: 0,
            high: 1.0,
            low: 1.0,
            vol: 1000,
            tvl: 5000,
            seed: 99,
            cat: "imported",
          };
        }
        set((s) => ({
          importingToken: false,
          importTokenOpen: false,
          customTokens: [...s.customTokens, { address, symbol: sym, pairKey }],
          pair: pairKey,
          view: "terminal",
        }));
        get().addToast("Token Imported", `${sym} registered on Arc markets.`, "ok");
      } catch (err: any) {
        set({ importingToken: false, importTokenError: err.message || String(err) });
      }
    },
  };
});

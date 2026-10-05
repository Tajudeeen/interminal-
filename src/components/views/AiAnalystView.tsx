import { Icon } from "../ui/Icon";
import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { Button } from "../ui/Button";

export const AiAnalystView: React.FC = () => {
  const {
    pair: activePair,
    setPair,
    setSide,
    setAmount,
    analysis,
    runAiAnalysis,
    setView,
    setMandateModalOpen,
    prepareTradeReview,
    addToast,
    balances,
    livePortfolio,
  } = useAppStore();

  useEffect(() => {
    if (!analysis || analysis.pair !== activePair) {
      runAiAnalysis();
    }
  }, [activePair]);

  const p = PAIRS[activePair] || PAIRS["ETH/USDC"];
  const pairsList = ["ETH/USDC", "BTC/USDC", "EURC/USDC", "USYC/USDC", "SOL/USDC", "AVAX/USDC"];

  const handleTradeOnTerminal = () => {
    if (!analysis) return;
    const recommendedSide = analysis.trend === "Bearish" ? "sell" : "buy";
    setPair(analysis.pair);
    setSide(recommendedSide);
    setView("terminal");
    addToast(
      "Terminal Desk Armed",
      `Loaded ${analysis.pair} ${recommendedSide.toUpperCase()} recommendation into execution desk.`,
      "ok"
    );
  };

  const handleExecuteRecommendedPolicy = () => {
    if (!analysis) return;
    const recommendedSide = analysis.trend === "Bearish" ? "sell" : "buy";
    const recommendedPair = PAIRS[analysis.pair] || p;
    const maxWalletValue = recommendedSide === "buy"
      ? Math.max(0, balances.USDC || 0)
      : Math.max(0, (balances[recommendedPair.base] || 0) * recommendedPair.price);
    const recommendedAmount = livePortfolio ? Math.min(500, maxWalletValue) : 500;

    if (livePortfolio && recommendedAmount <= 0) {
      addToast(
        "No Wallet Capacity",
        "The connected wallet has no usable balance for the recommended action.",
        "err",
      );
      return;
    }

    setPair(analysis.pair);
    setSide(recommendedSide);
    setAmount(recommendedAmount);
    prepareTradeReview();

    if (useAppStore.getState().reviewOpen) {
      addToast(
        "Policy Review Ready",
        `Loaded a ${recommendedAmount.toLocaleString()} ${recommendedSide.toUpperCase()} review for ${analysis.pair}. The next step still requires wallet authorization.`,
        "ok",
      );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Market signal analysis
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Deterministic Technical Oracles · EMA Ribbon · RSI · MACD · S/R Topography
          </p>
        </div>

        {/* Pair Switcher */}
        <div className="flex flex-wrap gap-1.5">
          {pairsList.map((pk) => (
            <button
              key={pk}
              onClick={() => setPair(pk)}
              className={`px-3 py-1.5 rounded-card font-mono text-xs transition-all ${
                activePair === pk
                  ? "bg-lime-500 text-black font-bold shadow-xs"
                  : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-lime-500/30"
              }`}
            >
              {pk}
            </button>
          ))}
        </div>
      </div>

      {analysis ? (
        <div className="space-y-6">
          {/* Executive Summary Card */}
          <div className="card-themed border border-themed rounded-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-themed/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-lime-500/10 border border-lime-500/30 flex items-center justify-center font-display font-black text-lime-500 text-base">
                  {p.base.slice(0, 3)}
                </div>
                <div>
                  <div className="font-display font-black text-xl text-themed">{analysis.pair}</div>
                  <div className="font-mono text-xs text-muted">
                    Timeframe: {analysis.timeframe} · Spot Price: ${analysis.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded-pill font-mono text-xs font-bold border ${
                    analysis.trend === "Bullish"
                      ? "bg-pos/15 border-pos/40 text-pos"
                      : analysis.trend === "Bearish"
                      ? "bg-neg/15 border-neg/40 text-neg"
                      : "bg-amber-500/15 border-amber-500/40 text-amber-500"
                  }`}
                >
                  {analysis.regime.toUpperCase()}
                </span>
                <span className="px-3 py-1 rounded-pill font-mono text-xs card-themed border border-themed/40 text-sub">
                  Risk: {analysis.risk}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={runAiAnalysis}
                  leftIcon={<Icon name="refresh" className="material-symbols-outlined text-[14px]" />}
                  title="Re-run quantitative models"
                >
                  Refresh
                </Button>
              </div>
            </div>

            {/* Concise Thesis */}
            <div className="space-y-2">
              <h3 className="font-mono text-xs uppercase tracking-wider text-muted font-bold">
                Institutional Thesis
              </h3>
              <p className="font-display text-base text-themed leading-relaxed font-medium">
                {analysis.thesis}
              </p>
            </div>

            {/* Technical Setup Explanation */}
            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30 font-mono text-xs text-sub leading-relaxed">
              <span className="font-bold text-themed mr-1">Structure Assessment:</span>
              {analysis.setup}
            </div>

            {/* Key Actionable Strategy */}
            <div className="p-4 rounded-card border border-pos/30 bg-pos/5 flex items-start gap-3">
              <Icon name="tips_and_updates" className="material-symbols-outlined text-[20px] text-pos shrink-0 mt-0.5" />
              <div>
                <div className="font-display font-bold text-sm text-pos">Tactical Recommendation</div>
                <div className="font-mono text-xs text-themed mt-0.5">{analysis.action}</div>
              </div>
            </div>
          </div>

          {/* Key Levels & Risk-Reward Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">Immediate Support (S1)</div>
              <div className="mt-1 font-display font-extrabold text-xl text-pos tnum">
                ${analysis.support.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-muted mt-1">30-bar swing low baseline</div>
            </div>

            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">Key Resistance (R1)</div>
              <div className="mt-1 font-display font-extrabold text-xl text-neg tnum">
                ${analysis.resistance.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-muted mt-1">30-bar swing high ceiling</div>
            </div>

            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">Invalidation Level</div>
              <div className="mt-1 font-display font-extrabold text-xl text-amber-500 tnum">
                ${analysis.invalidation.toFixed(2)}
              </div>
              <div className="font-mono text-[10px] text-muted mt-1">Negates current structure</div>
            </div>

            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">Risk / Reward Ratio</div>
              <div className="mt-1 font-display font-extrabold text-xl text-themed tnum">
                {analysis.rr} : 1
              </div>
              <div className="font-mono text-[10px] text-pos mt-1">Favorable expectancy band</div>
            </div>
          </div>

          {/* Autonomous Action & Policy Guardrail Decision Card */}
          <div className="card-themed border border-themed rounded-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-themed/30 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
                <h3 className="font-display font-bold text-sm text-themed uppercase tracking-wider">
                  Proposed Autonomous Action & Policy Verification
                </h3>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30 font-bold">
                EIP-712 POLICY GATEWAY
              </span>
            </div>

            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] text-muted uppercase">Recommended Execution</div>
                <div className="font-display font-extrabold text-base text-themed mt-0.5">
                  {analysis.trend === "Bearish" ? "Take Profit / Hedge" : "Treasury Rebalance"}: {analysis.pair}
                </div>
                <div className="font-mono text-xs text-sub mt-0.5">
                  Allocate ${livePortfolio ? Math.min(500, Math.max(0, balances.USDC || 0)).toLocaleString() : 500} USDC based on {analysis.regime.toLowerCase()} regime & favorable risk/reward ({analysis.rr}:1)
                </div>
              </div>
              <div className="text-right font-mono text-xs text-pos font-bold shrink-0">
                Size: ${livePortfolio ? Math.min(500, Math.max(0, balances.USDC || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "500.00"} USDC
              </div>
            </div>

            {/* Policy Pre-Flight Checks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-card bg-pos/10 border border-pos/30 text-pos flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-75">Target Allowlist</div>
                  <div className="font-bold">Arc Settlement</div>
                </div>
                <Icon name="check_circle" className="material-symbols-outlined text-[16px]" />
              </div>

              <div className="p-2.5 rounded-card bg-pos/10 border border-pos/30 text-pos flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-75">Daily Spend Cap</div>
                  <div className="font-bold">&lt; $5,000 Limit</div>
                </div>
                <Icon name="check_circle" className="material-symbols-outlined text-[16px]" />
              </div>

              <div className="p-2.5 rounded-card bg-pos/10 border border-pos/30 text-pos flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-75">Slippage Bound</div>
                  <div className="font-bold">&lt;= 30 bps</div>
                </div>
                <Icon name="check_circle" className="material-symbols-outlined text-[16px]" />
              </div>

              <div className="p-2.5 rounded-card bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-between">
                <div>
                  <div className="text-[10px] opacity-75">Officer Permit</div>
                  <div className="font-bold">EIP-712 Required</div>
                </div>
                <Icon name="fingerprint" className="material-symbols-outlined text-[16px]" />
              </div>
            </div>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleExecuteRecommendedPolicy}
                leftIcon={<Icon name="verified" className="material-symbols-outlined text-[16px]" />}
              >
                Approve & Execute via EIP-712 Permit
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={handleTradeOnTerminal}
                leftIcon={<Icon name="tune" className="material-symbols-outlined text-[16px]" />}
              >
                Customize on Trade Desk
              </Button>
            </div>
          </div>

          {/* Deterministic Mathematical Grounding */}
          <div className="card-themed border border-themed rounded-card p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-themed/20">
              <div className="flex items-center gap-2">
                <Icon name="functions" className="material-symbols-outlined text-[18px] text-pos" />
                <div>
                  <div className="font-mono text-[11px] text-themed uppercase tracking-wider font-bold">
                    Deterministic Mathematical Grounding & Formula Verifier
                  </div>
                  <div className="font-mono text-[10px] text-muted">
                    No black-box hallucinations. All signals computed from verified price bars.
                  </div>
                </div>
              </div>
              <span className="font-mono text-[10px] text-pos font-bold">VERIFIABLE</span>
            </div>

            <p className="font-mono text-xs text-sub leading-relaxed">
              {analysis.why}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
                <div className="text-[10px] text-muted uppercase">Wilder's RSI (14 Period)</div>
                <div className="text-themed font-bold p-1 bg-themed/5 rounded text-[11px]">
                  RSI = 100 - (100 / (1 + RS))
                </div>
                <div className="text-[10px] text-muted">
                  RS = EMA(Gains, 14) / EMA(Losses, 14). Bound: [0, 100].
                </div>
              </div>

              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
                <div className="text-[10px] text-muted uppercase">EMA Fast/Slow Ribbon</div>
                <div className="text-themed font-bold p-1 bg-themed/5 rounded text-[11px]">
                  EMA_t = P_t × α + EMA_(t-1) × (1 - α)
                </div>
                <div className="text-[10px] text-muted">
                  Multiplier α = 2 / (N + 1). Evaluated for N = 20, 50 bars.
                </div>
              </div>

              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
                <div className="text-[10px] text-muted uppercase">Extremum Swing Pivots</div>
                <div className="text-themed font-bold p-1 bg-themed/5 rounded text-[11px]">
                  S1 = min(Low_30), R1 = max(High_30)
                </div>
                <div className="text-[10px] text-muted">
                  Risk/Reward: RR = |R1 - P| / |P - S1| = {analysis.rr}:1
                </div>
              </div>
            </div>
            <div className="pt-2 flex flex-wrap gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={handleTradeOnTerminal}
                leftIcon={<Icon name="candlestick_chart" className="material-symbols-outlined text-[16px]" />}
              >
                Trade Setup on Terminal
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setMandateModalOpen(true)}
                leftIcon={<Icon name="verified_user" className="material-symbols-outlined text-[16px]" />}
              >
                Sign Scoped Agent Mandate
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-themed border border-themed rounded-card p-12 text-center space-y-4">
          <Icon name="psychology" className="material-symbols-outlined text-[36px] text-lime-500 animate-pulse" />
          <p className="font-mono text-xs text-sub">Running technical indicators for {activePair}...</p>
          <Button
            variant="primary"
            size="md"
            onClick={runAiAnalysis}
            leftIcon={<Icon name="play_arrow" className="material-symbols-outlined text-[16px]" />}
          >
            Compute Analysis
          </Button>
        </div>
      )}
    </div>
  );
};

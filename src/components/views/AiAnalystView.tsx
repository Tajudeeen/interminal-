import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";

export const AiAnalystView: React.FC = () => {
  const {
    pair: activePair,
    setPair,
    analysis,
    runAiAnalysis,
    setView,
    setMandateModalOpen,
  } = useAppStore();

  useEffect(() => {
    if (!analysis || analysis.pair !== activePair) {
      runAiAnalysis();
    }
  }, [activePair]);

  const p = PAIRS[activePair] || PAIRS["ETH/USDC"];
  const pairsList = ["ETH/USDC", "BTC/USDC", "EURC/USDC", "USYC/USDC", "SOL/USDC", "AVAX/USDC"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            AI Quant Market Analyst
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
              className={`px-3 py-1 rounded-pill font-mono text-xs transition-colors ${
                activePair === pk
                  ? "bg-text text-bg font-bold shadow-xs"
                  : "card-themed border border-themed/40 text-sub hover:text-themed"
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
                <div className="w-10 h-10 rounded-card bg-pos/10 border border-pos/30 flex items-center justify-center font-display font-black text-pos text-base">
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
              <span className="material-symbols-outlined text-[20px] text-pos shrink-0 mt-0.5">
                tips_and_updates
              </span>
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

          {/* Deterministic Mathematical Grounding */}
          <div className="card-themed border border-themed rounded-card p-4 space-y-2">
            <div className="font-mono text-[11px] text-muted uppercase tracking-wider font-semibold">
              Deterministic Mathematical Grounding
            </div>
            <p className="font-mono text-xs text-sub leading-relaxed">
              {analysis.why}
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => setView("terminal")}
                className="px-4 py-2 rounded-card bg-text text-bg font-display font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[16px]">candlestick_chart</span>
                Trade Setup on Terminal
              </button>
              <button
                onClick={() => setMandateModalOpen(true)}
                className="px-4 py-2 rounded-card card-themed border border-themed font-display font-semibold text-xs text-sub hover:text-themed transition-colors flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">verified_user</span>
                Deploy Scoped Agent Mandate
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="card-themed border border-themed rounded-card p-12 text-center space-y-3">
          <span className="material-symbols-outlined text-[32px] text-muted">psychology</span>
          <p className="font-mono text-xs text-sub">Running technical indicators for {activePair}...</p>
          <button
            onClick={runAiAnalysis}
            className="px-4 py-2 rounded-card bg-text text-bg font-display font-bold text-xs"
          >
            Compute Analysis
          </button>
        </div>
      )}
    </div>
  );
};

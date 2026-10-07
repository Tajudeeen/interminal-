import { Icon } from "../ui/Icon";
import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { Button } from "../ui/Button";

export const AiAnalystView: React.FC = () => {
  const {
    pair: activePair,
    setPair,
    analysis,
    indicators,
    timeframe,
    runAiAnalysis,
    setView,
  } = useAppStore();

  useEffect(() => {
    if (indicators) runAiAnalysis();
  }, [activePair, timeframe, indicators, runAiAnalysis]);

  const p = PAIRS[activePair] || PAIRS["ETH/USDC"];
  const pairsList = ["ETH/USDC", "BTC/USDC", "EURC/USDC", "USYC/USDC"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Optional read-only tool</p>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Arc market context
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Deterministic indicators from selected public feeds. Context only, not a trade recommendation.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {pairsList.map((pk) => (
            <button
              key={pk}
              onClick={() => setPair(pk)}
              className={
                "px-3 py-1.5 rounded-card font-mono text-xs transition-all " +
                (activePair === pk
                  ? "bg-lime-500 text-black font-bold shadow-xs"
                  : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-lime-500/30")
              }
            >
              {pk}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-cyan/30 bg-cyan/5 p-4 text-sm text-sub leading-relaxed">
        This screen does not choose a trade side, size a position, create an agent mandate, or open a pre-filled trade.
        The Arc Microgrant proof path remains Treasury → Execute → Receipts → Verify.
      </div>

      {analysis ? (
        <div className="space-y-6">
          <div className="card-themed border border-themed rounded-card p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-themed/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-card bg-lime-500/10 border border-lime-500/30 flex items-center justify-center font-display font-black text-lime-500 text-base">
                  {p.base.slice(0, 3)}
                </div>
                <div>
                  <div className="font-display font-black text-xl text-themed">{analysis.pair}</div>
                  <div className="font-mono text-xs text-muted">
                    {analysis.timeframe} · Reference price {"$"}{analysis.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-pill font-mono text-xs font-bold border border-themed text-themed">
                  Regime: {analysis.regime}
                </span>
                <span className="px-3 py-1 rounded-pill font-mono text-xs border border-themed text-sub">
                  Risk flag: {analysis.risk}
                </span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={runAiAnalysis}
                  leftIcon={<Icon name="refresh" className="material-symbols-outlined text-[14px]" />}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-card bg-themed-card/50 border border-themed/30">
                <div className="font-mono text-[10px] text-muted uppercase">Observed trend</div>
                <div className="font-display font-bold text-lg text-themed mt-1">{analysis.trend}</div>
                <div className="font-mono text-[10px] text-muted mt-1">Derived from the current indicator set</div>
              </div>
              <div className="p-4 rounded-card bg-themed-card/50 border border-themed/30">
                <div className="font-mono text-[10px] text-muted uppercase">Momentum</div>
                <div className="font-display font-bold text-lg text-themed mt-1">{analysis.momentum}</div>
                <div className="font-mono text-[10px] text-muted mt-1">Descriptive, not prescriptive</div>
              </div>
              <div className="p-4 rounded-card bg-themed-card/50 border border-themed/30">
                <div className="font-mono text-[10px] text-muted uppercase">Feed status</div>
                <div className="font-display font-bold text-lg text-themed mt-1">Reference only</div>
                <div className="font-mono text-[10px] text-muted mt-1">Execution requests a separate Arc router quote</div>
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30 font-mono text-xs text-sub leading-relaxed">
              <span className="font-bold text-themed mr-1">Indicator summary:</span>
              {analysis.setup}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">30-bar support reference</div>
              <div className="mt-1 font-display font-extrabold text-xl text-themed tnum">
                {"$"}{analysis.support.toFixed(2)}
              </div>
            </div>
            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">30-bar resistance reference</div>
              <div className="mt-1 font-display font-extrabold text-xl text-themed tnum">
                {"$"}{analysis.resistance.toFixed(2)}
              </div>
            </div>
            <div className="card-themed border border-themed rounded-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted">Structure invalidation reference</div>
              <div className="mt-1 font-display font-extrabold text-xl text-themed tnum">
                {"$"}{analysis.invalidation.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="card-themed border border-themed rounded-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Icon name="functions" className="material-symbols-outlined text-[18px] text-pos" />
              <div>
                <div className="font-mono text-[11px] text-themed uppercase tracking-wider font-bold">
                  Deterministic indicator notes
                </div>
                <div className="font-mono text-[10px] text-muted">
                  Feed accuracy is not independently attested and these values are not execution quotes.
                </div>
              </div>
            </div>
            <p className="font-mono text-xs text-sub leading-relaxed">{analysis.why}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20">
                <div className="text-[10px] text-muted uppercase">RSI (14)</div>
                <div className="text-themed font-bold mt-1">RSI = 100 - (100 / (1 + RS))</div>
              </div>
              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20">
                <div className="text-[10px] text-muted uppercase">EMA ribbon</div>
                <div className="text-themed font-bold mt-1">EMA_t = P_t × α + EMA_(t-1) × (1 - α)</div>
              </div>
              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20">
                <div className="text-[10px] text-muted uppercase">Swing references</div>
                <div className="text-themed font-bold mt-1">S1 = min(Low_30), R1 = max(High_30)</div>
              </div>
            </div>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setView("terminal")}
              leftIcon={<Icon name="swap_horiz" className="material-symbols-outlined text-[16px]" />}
            >
              Open execution desk without pre-filling a trade
            </Button>
          </div>
        </div>
      ) : (
        <div className="card-themed border border-themed rounded-card p-12 text-center space-y-4">
          <Icon name="query_stats" className="material-symbols-outlined text-[36px] text-lime-500 animate-pulse" />
          <p className="font-mono text-xs text-sub">Computing read-only context for {activePair}...</p>
          <Button variant="primary" size="md" onClick={runAiAnalysis}>
            Compute context
          </Button>
        </div>
      )}
    </div>
  );
};

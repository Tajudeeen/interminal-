import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { USYC_APY } from "../../constants/arc";
import {
  calculateJitUnwind,
  calculateOpportunityCost,
  calculateYieldSweep,
} from "../../lib/math/treasury";
import { portfolioSnapshot } from "../../lib/math/risk";

export const TreasuryCockpitView: React.FC = () => {
  const {
    balances,
    targetBufferUsd,
    setTargetBufferUsd,
    stressTestAmount,
    setStressTestAmount,
    livePortfolio,
    addToast,
    setView,
  } = useAppStore();

  const liquidUsdc = balances.USDC || 0;
  const usycBalance = balances.USYC || 0;

  const cost = calculateOpportunityCost(liquidUsdc, USYC_APY);
  const sweep = calculateYieldSweep(liquidUsdc, targetBufferUsd);
  const jit = calculateJitUnwind({
    tradeAmountUsd: stressTestAmount,
    liquidUsdc,
    usycBalance,
    slippageBps: 20,
  });

  const snapshot = portfolioSnapshot(balances, livePortfolio);

  const bufferPresets = [500, 1000, 2500, 5000];
  const stressPresets = [1000, 2500, 5000, 10000];

  const handleSweepNow = () => {
    if (!sweep.recommended || sweep.sweepAmount <= 0) {
      addToast("Sweep Not Needed", "Liquid USDC is within the target operating cash buffer.", "info");
      return;
    }
    const sweepAmt = sweep.sweepAmount;
    useAppStore.setState((s) => ({
      balances: {
        ...s.balances,
        USDC: Math.max(0, (s.balances.USDC || 0) - sweepAmt),
        USYC: (s.balances.USYC || 0) + sweepAmt,
      },
      activity: [
        {
          ts: Date.now(),
          type: "sweep",
          label: `Yield Sweep: $${sweepAmt.toLocaleString()} USDC -> USYC T-Bills`,
          detail: `Earns +$${sweep.annualExtraYield.toFixed(2)}/yr @ 4.95% APY`,
        },
        ...s.activity,
      ],
    }));
    addToast(
      "Yield Sweep Complete",
      `Swept $${sweepAmt.toLocaleString()} USDC into USYC T-Bills (+4.95% APY).`,
      "ok"
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Treasury Cockpit
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Continuous Cash Sweeps · 4.95% USYC T-Bill Engine · JIT Liquidity Unwind
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setView("terminal")}
            className="px-4 py-2 rounded-card bg-text text-bg font-display font-bold text-xs flex items-center gap-1.5 transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[15px]">candlestick_chart</span>
            Open Trade Desk
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* NAV */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>Portfolio NAV</span>
            <span className="material-symbols-outlined text-[16px]">account_balance</span>
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-themed tnum">
            ${snapshot.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            Stables allocation: {snapshot.stables.toFixed(1)}%
          </div>
        </div>

        {/* Operating Buffer */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>Liquid Cash (USDC)</span>
            <span className="material-symbols-outlined text-[16px]">payments</span>
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-themed tnum">
            ${liquidUsdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-pos">
            Buffer: ${targetBufferUsd.toLocaleString()}
          </div>
        </div>

        {/* USYC T-Bills */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>USYC Treasury Yield</span>
            <span className="material-symbols-outlined text-[16px] text-pos">trending_up</span>
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-pos tnum">
            ${usycBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-pos font-semibold">
            +4.95% APY (${(usycBalance * 0.0495).toFixed(2)}/yr)
          </div>
        </div>

        {/* Idle Cash Drag */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>Idle Opportunity Drag</span>
            <span className="material-symbols-outlined text-[16px] text-amber-500">warning</span>
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-amber-500 tnum">
            ${cost.annualYieldUsd.toFixed(2)}/yr
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            Forfeiting ${cost.dailyYieldUsd.toFixed(3)}/day
          </div>
        </div>
      </div>

      {/* Main Interactive Controls: Target Operating Buffer & Yield Sweep */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module 1: Target Operating Cash Buffer Selector */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-themed">
                Target Operating Cash Buffer
              </h2>
              <p className="font-mono text-xs text-muted mt-1 leading-relaxed">
                Retain liquid USDC for gas & immediate operations; automatically sweep remainder into yield.
              </p>
            </div>
            <span className="font-display font-black text-xl text-pos tnum">
              ${targetBufferUsd.toLocaleString()}
            </span>
          </div>

          {/* Clickable Preset Buttons (Fixed user complaint) */}
          <div>
            <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-2">
              Select Preset Buffer Amount
            </div>
            <div className="grid grid-cols-4 gap-2">
              {bufferPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setTargetBufferUsd(val)}
                  className={`py-2 px-3 rounded-card font-mono text-xs transition-all ${
                    targetBufferUsd === val
                      ? "bg-text text-bg font-extrabold shadow-md scale-102"
                      : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-themed"
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Buffer Slider */}
          <div className="pt-2">
            <div className="flex justify-between text-[11px] font-mono text-muted mb-1">
              <span>Fine Adjustment</span>
              <span className="text-themed font-bold">${targetBufferUsd}</span>
            </div>
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={targetBufferUsd}
              onChange={(e) => setTargetBufferUsd(Number(e.target.value))}
              className="w-full accent-pos cursor-pointer"
            />
          </div>

          {/* Sweep Status Card */}
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Excess Idle Cash:</span>
              <span className="text-themed font-bold tnum">
                ${Math.max(0, liquidUsdc - targetBufferUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Projected Extra Yield:</span>
              <span className="text-pos font-bold tnum">
                +${sweep.annualExtraYield.toFixed(2)}/yr
              </span>
            </div>
            <div className="pt-2 border-t border-themed/20">
              <button
                type="button"
                onClick={handleSweepNow}
                disabled={!sweep.recommended}
                className="w-full py-2.5 rounded-card bg-text text-bg font-display font-extrabold text-xs tracking-wide transition-opacity disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                {sweep.recommended
                  ? `Sweep $${sweep.sweepAmount.toLocaleString()} USDC to USYC T-Bills`
                  : "Cash Buffer Fully Balanced"}
              </button>
            </div>
          </div>
        </div>

        {/* Module 2: JIT Liquidity Unwind Simulator */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-themed">
                Just-In-Time (JIT) Liquidity Bridge
              </h2>
              <p className="font-mono text-xs text-muted mt-1 leading-relaxed">
                When an outgoing wire or trade exceeds liquid USDC, USYC T-Bills redeem at par instantly.
              </p>
            </div>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-pill border ${
                jit.canCover
                  ? "bg-pos/15 border-pos/40 text-pos"
                  : "bg-neg/15 border-neg/40 text-neg"
              }`}
            >
              {jit.canCover ? "SOLVENT" : "SHORTFALL"}
            </span>
          </div>

          {/* Stress Test Presets */}
          <div>
            <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-2">
              Simulate Outgoing Wire / Trade Size
            </div>
            <div className="grid grid-cols-4 gap-2">
              {stressPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setStressTestAmount(val)}
                  className={`py-2 px-3 rounded-card font-mono text-xs transition-all ${
                    stressTestAmount === val
                      ? "bg-text text-bg font-extrabold shadow-md scale-102"
                      : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-themed"
                  }`}
                >
                  ${val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          {/* JIT Output Breakdown */}
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Liquid USDC Covered:</span>
              <span className="text-themed font-medium tnum">
                ${Math.min(liquidUsdc, stressTestAmount).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Deficit Requiring JIT Unwind:</span>
              <span className={`${jit.needed ? "text-amber-500 font-bold" : "text-muted"} tnum`}>
                ${jit.deficit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">USYC Redeemed at Par ($1.00):</span>
              <span className="text-pos font-bold tnum">${jit.usycToRedeem.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-themed/20">
              <span className="text-muted">Remaining USYC Treasury:</span>
              <span className="text-themed font-medium tnum">${jit.remainingUsyc.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-pos">verified</span>
            Zero capital drag: funds remain 100% productive in T-Bills until millisecond of settlement.
          </div>
        </div>
      </div>

      {/* Asset Allocation Breakdown Table */}
      <div className="card-themed border border-themed rounded-card p-5">
        <h3 className="font-display font-bold text-sm text-themed mb-3">
          On-Chain Balance Sheet Holdings
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-themed text-muted uppercase text-[10px]">
                <th className="pb-2">Asset</th>
                <th className="pb-2">Category</th>
                <th className="pb-2 text-right">Balance</th>
                <th className="pb-2 text-right">Price</th>
                <th className="pb-2 text-right">Total USD</th>
                <th className="pb-2 text-right">Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-themed/30">
              {snapshot.rows.map((row) => (
                <tr key={row.sym} className="hover:bg-themed-card/40 transition-colors">
                  <td className="py-2.5 font-bold text-themed">{row.sym}</td>
                  <td className="py-2.5 text-muted uppercase text-[10px]">
                    {row.sym === "USDC" || row.sym === "EURC" || row.sym === "USYC"
                      ? "Stable / Treasury"
                      : "Bluechip"}
                  </td>
                  <td className="py-2.5 text-right text-themed tnum">
                    {row.qty.toLocaleString("en-US", { maximumFractionDigits: 4 })}
                  </td>
                  <td className="py-2.5 text-right text-sub tnum">${row.px.toFixed(2)}</td>
                  <td className="py-2.5 text-right font-bold text-themed tnum">
                    ${row.value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-2.5 text-right text-sub tnum">{row.alloc.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

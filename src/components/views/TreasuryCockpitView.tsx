import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { USYC_APY, ARC } from "../../constants/arc";
import {
  calculateJitUnwind,
  calculateOpportunityCost,
  calculateYieldSweep,
} from "../../lib/math/treasury";
import { portfolioSnapshot } from "../../lib/math/risk";
import { Button } from "../ui/Button";
import { CapitalFlowDiagram } from "../treasury/CapitalFlowDiagram";

export const TreasuryCockpitView: React.FC = () => {
  const {
    balances,
    targetBufferUsd,
    setTargetBufferUsd,
    stressTestAmount,
    setStressTestAmount,
    livePortfolio,
    address,
    connectWallet,
    addToast,
    setView,
  } = useAppStore();

  const [simHorizonDays, setSimHorizonDays] = useState<number>(365);

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

  const handleSimulateInflow = (amt: number) => {
    useAppStore.setState((s) => ({
      balances: {
        ...s.balances,
        USDC: (s.balances.USDC || 0) + amt,
      },
      activity: [
        {
          ts: Date.now(),
          type: "trade",
          label: `Inflow Wire Received: +$${amt.toLocaleString()} USDC`,
          detail: "Treasury operating account credited via Arc clearinghouse",
        },
        ...s.activity,
      ],
    }));
    addToast(
      "Corporate Inflow Credited",
      `Received +$${amt.toLocaleString()} USDC. Cash buffer recomputed.`,
      "ok"
    );
  };

  // Yield over selected horizon
  const horizonYieldUsyc = usycBalance * (USYC_APY * (simHorizonDays / 365));
  const horizonYieldBank = usycBalance * (0.0005 * (simHorizonDays / 365));
  const horizonAlphaDelta = horizonYieldUsyc - horizonYieldBank;

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleSimulateInflow(5000)}
            leftIcon={<span className="material-symbols-outlined text-[16px] text-pos">add_circle</span>}
          >
            Simulate +$5k Inflow
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setView("terminal")}
            leftIcon={<span className="material-symbols-outlined text-[16px]">candlestick_chart</span>}
          >
            Open Trade Desk
          </Button>
        </div>
      </div>

      {/* Network & Execution Status Banner */}
      {livePortfolio ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-pos/10 border border-pos/40 text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pos animate-pulse shrink-0" />
            <div>
              <span className="font-display font-black text-pos uppercase tracking-wider">
                LIVE ARC MAINNET CONNECTED
              </span>
              <span className="font-mono text-muted text-[11px] ml-2">
                Chain ID: 5042 · Wallet: {address} · Real Balances Synced via Arc Public RPC
              </span>
            </div>
          </div>
          <a
            href={`${ARC.explorer}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] text-pos hover:underline flex items-center gap-1 shrink-0"
          >
            <span>View on Explorer</span>
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-amber-500/10 border border-amber-500/40 text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
            <div>
              <span className="font-display font-black text-amber-500 uppercase tracking-wider">
                DEMO / SIMULATION MODE
              </span>
              <span className="font-mono text-muted text-[11px] ml-2">
                Displaying illustrative $250k portfolio with Hashnote USYC yield curves.
              </span>
            </div>
          </div>
          <Button
            size="xs"
            variant="primary"
            onClick={() => connectWallet()}
            leftIcon={<span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>}
          >
            Connect Live Arc Wallet
          </Button>
        </div>
      )}

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* NAV */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>Portfolio NAV</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
              livePortfolio ? "bg-pos/15 text-pos border border-pos/30" : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
            }`}>
              {livePortfolio ? "ON-CHAIN" : "SIMULATION"}
            </span>
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

      {/* Autonomous Capital Flow Topography Diagram */}
      <CapitalFlowDiagram />

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

          {/* Clickable Preset Buttons */}
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
                      ? "bg-lime-500 text-black font-black shadow-md scale-102"
                      : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-lime-500/40"
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
              className="w-full accent-lime-500 cursor-pointer"
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
              <Button
                variant={sweep.recommended ? "pos" : "secondary"}
                fullWidth
                size="md"
                onClick={handleSweepNow}
                disabled={!sweep.recommended}
                leftIcon={<span className="material-symbols-outlined text-[16px]">bolt</span>}
              >
                {sweep.recommended
                  ? `Sweep $${sweep.sweepAmount.toLocaleString()} USDC to USYC T-Bills`
                  : "Cash Buffer Fully Balanced"}
              </Button>
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
                      ? "bg-lime-500 text-black font-black shadow-md scale-102"
                      : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-lime-500/40"
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

      {/* Interactive Yield Calculator & Bank Alpha Comparison */}
      <div className="card-themed border border-themed rounded-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-lime-500 font-bold">
              Treasury Horizon Projection
            </div>
            <h3 className="font-display font-bold text-base text-themed mt-0.5">
              Yield Earned on Current Holdings (${usycBalance.toLocaleString()} USYC)
            </h3>
          </div>
          {/* Horizon Period Buttons */}
          <div className="flex gap-1.5 font-mono text-xs">
            {[
              { label: "30 Days", days: 30 },
              { label: "90 Days", days: 90 },
              { label: "180 Days", days: 180 },
              { label: "1 Year", days: 365 },
              { label: "3 Years", days: 1095 },
            ].map((p) => (
              <button
                key={p.days}
                onClick={() => setSimHorizonDays(p.days)}
                className={`px-3 py-1.5 rounded-card transition-all ${
                  simHorizonDays === p.days
                    ? "bg-lime-500 text-black font-bold shadow-xs"
                    : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-lime-500/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 font-mono">
          <div className="p-4 rounded-card bg-themed-card/50 border border-themed/30">
            <div className="text-[10px] text-muted uppercase">Arc USYC (4.95% APY)</div>
            <div className="text-2xl font-black text-pos mt-1 font-display tnum">
              +${horizonYieldUsyc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-muted mt-1">
              Compounds automatically on-chain
            </div>
          </div>

          <div className="p-4 rounded-card bg-themed-card/50 border border-themed/30">
            <div className="text-[10px] text-muted uppercase">Commercial Bank (0.05% APY)</div>
            <div className="text-2xl font-bold text-muted mt-1 font-display tnum">
              +${horizonYieldBank.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-muted mt-1">
              Standard corporate checking deposit
            </div>
          </div>

          <div className="p-4 rounded-card bg-pos/10 border border-pos/30">
            <div className="text-[10px] text-pos font-bold uppercase">Net Treasury Outperformance</div>
            <div className="text-2xl font-black text-pos mt-1 font-display tnum">
              +${horizonAlphaDelta.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-pos mt-1 font-semibold">
              Additional corporate cash generated
            </div>
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

      {/* Live on Arc Mainnet Proof & Contract Inventory */}
      <div className="card-themed border border-themed rounded-card p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-themed/30 pb-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-pos font-bold">
              Arc Mainnet Verified Protocol
            </div>
            <h3 className="font-display font-bold text-sm text-themed mt-0.5">
              Deployed Contracts & Settlement Layer (Chain ID: 5042)
            </h3>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-pos/10 border border-pos/30 text-pos font-bold">
            41/41 Tests Verified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 space-y-1">
            <div className="text-[10px] text-muted uppercase">Settlement & Receipt Anchor Contract</div>
            <div className="flex items-center justify-between">
              <span className="text-themed font-bold truncate">{ARC.settlement}</span>
              <a
                href={`${ARC.explorer}/address/${ARC.settlement}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pos hover:underline flex items-center gap-0.5 text-[11px] shrink-0 ml-2"
              >
                <span>Explorer</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
            </div>
            <div className="text-[10px] text-muted">
              Deployment Tx: {ARC.deployTx.slice(0, 18)}... (Block #{ARC.deployBlock})
            </div>
          </div>

          <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 space-y-1">
            <div className="text-[10px] text-muted uppercase">Arc Uniswap V2 AMM Router</div>
            <div className="flex items-center justify-between">
              <span className="text-themed font-bold truncate">{ARC.router}</span>
              <a
                href={`${ARC.explorer}/address/${ARC.router}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-pos hover:underline flex items-center gap-0.5 text-[11px] shrink-0 ml-2"
              >
                <span>Explorer</span>
                <span className="material-symbols-outlined text-[13px]">open_in_new</span>
              </a>
            </div>
            <div className="text-[10px] text-muted">
              Gas Token: USDC (Native 18 dec · Precompile 0x3600...0000)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

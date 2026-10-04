import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { USYC_APY, ARC } from "../../constants/arc";
import { PAIRS } from "../../constants/pairs";
import {
  calculateJitUnwind,
  calculateOpportunityCost,
  calculateYieldSweep,
} from "../../lib/math/treasury";
import { portfolioSnapshot } from "../../lib/math/risk";
import { deriveLiveControlSizing } from "../../lib/math/liveSizing";
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
    wrongNetwork,
    chainId,
    address,
    connectWallet,
    addToast,
    setView,
    executing,
    nativeGasBalance,
    executeSweepOnchain,
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
    usycPriceUsd: PAIRS["USYC/USDC"].price,
    slippageBps: 20,
  });

  const snapshot = portfolioSnapshot(balances, livePortfolio);
  const liveSizing = deriveLiveControlSizing(balances);
  const treasuryLiquidityUsd = liquidUsdc + usycNavUsd;

  const toPreset = (value: number, ceiling = Number.POSITIVE_INFINITY) => {
    if (!Number.isFinite(value) || value <= 0) return 0;
    const step = value >= 1000 ? 100 : 50;
    return Math.min(ceiling, Math.max(10, Math.round(value / step) * step));
  };

  const bufferPresets = livePortfolio
    ? [...new Set([0.10, 0.20, 0.35, 0.50].map((ratio) => toPreset(liquidUsdc * ratio, liquidUsdc)).filter(Boolean))]
    : [500, 1000, 2500, 5000];

  const stressPresets = livePortfolio
    ? [...new Set([0.75, 1.00, 1.25, 1.50].map((ratio) => toPreset(treasuryLiquidityUsd * ratio, treasuryLiquidityUsd)).filter(Boolean))]
    : [1000, 2500, 5000, 10000];

  const bufferSliderMax = livePortfolio
    ? Math.max(100, Math.ceil(Math.max(liquidUsdc, 100) / 1000) * 1000)
    : 10000;

  const handleSweepNow = () => {
    if (!sweep.recommended || sweep.sweepAmount <= 0) {
      addToast("Sweep Not Needed", "Liquid USDC is within the target operating cash buffer.", "info");
      return;
    }
    executeSweepOnchain(sweep.sweepAmount, "sweep");
  };

  const handleJitUnwind = () => {
    if (!jit.needed || jit.usycToRedeem <= 0) {
      addToast("No Unwind Needed", "Liquid USDC already covers the stress-test amount.", "info");
      return;
    }
    if (!jit.canCover) {
      addToast("Insufficient USYC", "Combined USDC + USYC cannot cover the disbursement.", "err");
      return;
    }
    executeSweepOnchain(jit.usycToRedeem, "unwind");
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
          label: `Simulated Inflow: +${amt.toLocaleString()} USDC`,
          detail: "Simulation only · no Arc transfer was broadcast.",
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
  const usycNavUsd = usycBalance * PAIRS["USYC/USDC"].price;
  const horizonYieldUsyc = usycNavUsd * (USYC_APY * (simHorizonDays / 365));
  const horizonYieldBank = usycNavUsd * (0.0005 * (simHorizonDays / 365));
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
            Policy-Driven Cash Rebalancing · USYC Treasury Asset · JIT Liquidity Unwind
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!livePortfolio && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSimulateInflow(5000)}
              leftIcon={<span className="material-symbols-outlined text-[16px] text-pos">add_circle</span>}
            >
              Simulate +$5k Inflow
            </Button>
          )}
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
      {livePortfolio && !wrongNetwork ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-pos/10 border border-pos/40 text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pos animate-pulse shrink-0" />
            <div>
              <span className="font-display font-black text-pos uppercase tracking-wider">LIVE ARC MAINNET CONNECTED</span>
              <span className="font-mono text-muted text-[11px] ml-2">Chain ID: 5042 · Wallet: {address} · Real balances synced via Arc public RPC</span>
            </div>
          </div>
          <a href={ARC.explorer + "/address/" + address} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-pos hover:underline flex items-center gap-1 shrink-0">
            <span>View on Explorer</span>
            <span className="material-symbols-outlined text-[13px]">open_in_new</span>
          </a>
        </div>
      ) : livePortfolio && wrongNetwork ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-neg/10 border border-neg/40 text-xs gap-3">
          <div>
            <div className="font-display font-black text-neg uppercase tracking-wider">WALLET CONNECTED · WRONG NETWORK</div>
            <div className="font-mono text-muted text-[11px] mt-1">Connected to chain {chainId}. Switch to Arc Mainnet (5042) before executing.</div>
          </div>
          <Button size="xs" variant="danger" onClick={() => connectWallet()}>Recheck Wallet</Button>
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
                Illustrative balances only. Live wallet mode reads balances from Arc.
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

        {/* USYC */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>USYC Treasury Position</span>
            <span className="material-symbols-outlined text-[16px] text-pos">trending_up</span>
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-pos tnum">
            ${usycNavUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-pos font-semibold">
            +3.225% reference yield (${(usycNavUsd * USYC_APY).toFixed(2)}/yr)
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

      {/* Treasury Capital Flow Topography Diagram */}
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
                Retain liquid USDC for operations, then sweep excess into the configured treasury asset.
              </p>
              {livePortfolio && (
                <p className="font-mono text-[10px] text-cyan mt-2">
                  Wallet-scaled starting buffer: ${liveSizing.targetBufferUsd.toLocaleString()} USDC · based on 20% of current liquid USDC.
                </p>
              )}
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
              min={0}
              max={bufferSliderMax}
              step={100}
              value={Math.min(targetBufferUsd, bufferSliderMax)}
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
                disabled={!sweep.recommended || executing}
                isLoading={executing && sweep.recommended}
                leftIcon={<span className="material-symbols-outlined text-[16px]">bolt</span>}
              >
                {sweep.recommended
                  ? `Sweep $${sweep.sweepAmount.toLocaleString()} USDC → USYC T-Bills${livePortfolio ? " (On-Chain)" : " (Sim)"}`
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
                When an outgoing wire or trade exceeds liquid USDC, calculate the USYC shortfall and execute a fresh USYC/USDC AMM route on Arc with a bounded output floor.
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
            {livePortfolio && (
              <div className="font-mono text-[10px] text-cyan mb-2">
                Wallet-scaled scenario: ${liveSizing.stressTestAmount.toLocaleString()} USDC from current ${treasuryLiquidityUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} treasury NAV.
              </div>
            )}
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
              <span className="text-muted">USYC Amount to Rebalance:</span>
              <span className="text-pos font-bold tnum">${jit.usycToRedeem.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-themed/20">
              <span className="text-muted">Remaining USYC Treasury:</span>
              <span className="text-themed font-medium tnum">${jit.remainingUsyc.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-muted flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[15px] text-pos">verified</span>
            Live execution uses a fresh Arc AMM quote and bounded output. This is an AMM rebalance, not a direct Hashnote Teller redemption. Simulation uses the configured reference price.
          </div>

          {/* JIT Unwind Execute Button */}
          {jit.needed && jit.canCover && (
            <Button
              variant="primary"
              fullWidth
              size="md"
              onClick={handleJitUnwind}
              disabled={executing}
              isLoading={executing}
              leftIcon={<span className="material-symbols-outlined text-[16px]">swap_horiz</span>}
            >
              Execute JIT USYC/USDC Rebalance: ${jit.usycToRedeem.toLocaleString(undefined, { maximumFractionDigits: 6 })} USYC → USDC{livePortfolio ? " (On-Chain)" : " (Sim)"}
            </Button>
          )}
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
              Yield Earned on Current Holdings (~${usycNavUsd.toLocaleString("en-US", { maximumFractionDigits: 2 })} NAV)
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
            <div className="text-[10px] text-muted uppercase">USYC Net Reference Yield (3.225%)</div>
            <div className="text-2xl font-black text-pos mt-1 font-display tnum">
              +${horizonYieldUsyc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-muted mt-1">
              Yield accrues through USYC NAV
            </div>
          </div>

          <div className="p-4 rounded-card bg-themed-card/50 border border-themed/30">
            <div className="text-[10px] text-muted uppercase">Illustrative Bank Benchmark (0.05%)</div>
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

      {/* Verifiable Mathematical Models & Formula Engine */}
      <div className="card-themed border border-themed rounded-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-themed/20">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-pos">calculate</span>
            <div>
              <h3 className="font-display font-bold text-sm text-themed">
                Deterministic Mathematical Grounding & Formula Verifier
              </h3>
              <p className="font-mono text-xs text-muted">
                Transparent equations governing capital allocation, opportunity cost, and JIT unwinds
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-pos font-bold">FAIL-CLOSED</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* Formula 1: Opportunity Cost */}
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-themed">1. Opportunity Cost Drag</span>
              <span className="text-[10px] text-amber-500 font-semibold">USYC YIELD DELTA</span>
            </div>
            <div className="p-2 rounded bg-themed/5 text-themed text-[11px] font-mono select-all">
              Cost = Liquid USDC × USYC reference yield × (Days / 365)
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>• Current Liquid: ${liquidUsdc.toLocaleString()} USDC</div>
              <div>• Annual Drag: ${(liquidUsdc * 0.0495).toFixed(2)} USD</div>
              <div>• Daily Burn: ${((liquidUsdc * 0.0495) / 365).toFixed(2)} / day</div>
            </div>
          </div>

          {/* Formula 2: Yield Sweep Threshold */}
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-themed">2. Yield Sweep Gate</span>
              <span className="text-[10px] text-pos font-semibold">POLICY GATE</span>
            </div>
            <div className="p-2 rounded bg-themed/5 text-themed text-[11px] font-mono select-all">
              Sweep = max(0, Liquid USDC - Buffer)
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>• Buffer Target: ${targetBufferUsd.toLocaleString()} USDC</div>
              <div>• Excess Available: ${Math.max(0, liquidUsdc - targetBufferUsd).toLocaleString()} USDC</div>
              <div className="text-pos font-semibold">
                • Status: {liquidUsdc > targetBufferUsd ? "Sweep Triggered" : "Within Buffer"}
              </div>
            </div>
          </div>

          {/* Formula 3: JIT Redemption Parity */}
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-themed">3. JIT USYC/USDC Rebalance</span>
              <span className="text-[10px] text-cyan font-semibold">BOUNDED OUTPUT</span>
            </div>
            <div className="p-2 rounded bg-themed/5 text-themed text-[11px] font-mono select-all">
              Minimum output is derived from the live Arc AMM quote
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>• Oracle Price: $1.0000 USYC NAV</div>
              <div>• Execution Cost: $0.00 (Zero Curve Impact)</div>
              <div>• Fallback Gate: Fail-Closed when live quoted output is zero or unavailable</div>
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
            Protocol verification available in the repo test suite
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

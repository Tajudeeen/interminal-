import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { PAIRS } from "../../constants/pairs";
import {
  calculateJitUnwind,
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
    environmentMode,
  } = useAppStore();

  const mainnetReview = environmentMode === "mainnet" && !livePortfolio;
  const liquidUsdc = balances.USDC || 0;
  const usycBalance = balances.USYC || 0;

  const sweep = calculateYieldSweep(liquidUsdc, targetBufferUsd);
  // Mainnet review intentionally starts with empty balances and zero stress-test sizing
  // until the wallet is connected. Keep the render path safe instead of passing an
  // invalid zero trade amount into the strict JIT calculator.
  const jit = mainnetReview || stressTestAmount <= 0
    ? {
        needed: false,
        deficit: 0,
        shortfall: 0,
        usycToRedeem: 0,
        canCover: false,
        remainingUsyc: 0,
      }
    : calculateJitUnwind({
        tradeAmountUsd: stressTestAmount + targetBufferUsd,
        liquidUsdc,
        usycBalance,
        usycPriceUsd: PAIRS["USYC/USDC"].price,
        slippageBps: 20,
      });

  const snapshot = portfolioSnapshot(balances, livePortfolio);
  const usycNavUsd = usycBalance * PAIRS["USYC/USDC"].price;
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
    ? [...new Set([
        treasuryLiquidityUsd * 0.50,
        treasuryLiquidityUsd * 0.75,
        liveSizing.stressTestAmount,
        treasuryLiquidityUsd,
      ].map((value) => toPreset(value, treasuryLiquidityUsd)).filter(Boolean))]
    : [1000, 2500, 5000, 10000];

  const bufferSliderMax = livePortfolio
    ? Math.max(100, Math.ceil(Math.max(liquidUsdc, 100) / 1000) * 1000)
    : 10000;

  const handleSweepNow = () => {
    if (!sweep.recommended || sweep.sweepAmount <= 0) {
      addToast("Sweep Not Needed", "Liquid USDC is within the target operating cash buffer.", "info");
      return;
    }
    void executeSweepOnchain(sweep.sweepAmount, "sweep");
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
    void executeSweepOnchain(jit.usycToRedeem, "unwind");
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Arc USDC Treasury
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Operating reserve · USDC → USYC review · Arc Mainnet evidence
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!livePortfolio && !mainnetReview && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleSimulateInflow(5000)}
              leftIcon={<Icon name="add_circle" className="material-symbols-outlined text-[16px] text-pos" />}
            >
              Simulate +$5k Inflow
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setView("terminal")}
            leftIcon={<Icon name="candlestick_chart" className="material-symbols-outlined text-[16px]" />}
          >
            Review Arc execution
          </Button>
        </div>
      </div>

      <p className="text-sm text-sub rounded-card border border-themed p-4">
        Cash reserve protection applies to trades submitted through this app. It is checked again before signing and broadcast.
        The deployed contract does not enforce your reserve against other apps. USYC eligibility and router liquidity can prevent execution.
      </p>
      {/* Network & Execution Status Banner */}
      {livePortfolio && !wrongNetwork ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-pos/10 border border-pos/40 text-xs gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-pos animate-pulse shrink-0" />
            <div>
              <span className="font-display font-black text-pos uppercase tracking-wider">LIVE ARC MAINNET CONNECTED</span>
              <span className="font-mono text-muted text-[11px] ml-2">Wallet {address ? address.slice(0, 6) + "…" + address.slice(-4) : "—"} · USDC ${liquidUsdc.toLocaleString(undefined, { maximumFractionDigits: 2 })} · USYC NAV ${usycNavUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Total NAV ${snapshot.total.toLocaleString(undefined, { maximumFractionDigits: 2 })} · Native gas ${nativeGasBalance.toFixed(4)} USDC</span>
            </div>
          </div>
          <a href={ARC.explorer + "/address/" + address} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-pos hover:underline flex items-center gap-1 shrink-0">
            <span>View on Explorer</span>
            <Icon name="open_in_new" className="material-symbols-outlined text-[13px]" />
          </a>
        </div>
      ) : wrongNetwork ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-card bg-neg/10 border border-neg/40 text-xs gap-3">
          <div>
            <div className="font-display font-black text-neg uppercase tracking-wider">WALLET CONNECTED · WRONG NETWORK</div>
            <div className="font-mono text-muted text-[11px] mt-1">Connected to chain {chainId}. Switch to Arc Mainnet (5042) before executing.</div>
          </div>
          <Button size="xs" variant="danger" onClick={() => connectWallet()}>Recheck Wallet</Button>
        </div>
      ) : mainnetReview ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-card bg-cyan/10 border border-cyan/40 text-xs gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse shrink-0" />
            <div className="min-w-0">
              <div className="font-display font-black text-cyan uppercase tracking-wider">
                MAINNET REVIEW · WALLET REQUIRED
              </div>
              <div className="font-mono text-muted text-[11px] mt-1">
                Connect to load your real Arc holdings, live prices, wallet-scaled policy controls, and executable settlement.
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => connectWallet("mainnet")}
            leftIcon={<Icon name="account_balance_wallet" className="material-symbols-outlined text-[14px]" />}
          >
            Connect Arc Mainnet
          </Button>
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
            onClick={() => connectWallet("mainnet")}
            leftIcon={<Icon name="account_balance_wallet" className="material-symbols-outlined text-[14px]" />}
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
              {livePortfolio ? "ON-CHAIN" : mainnetReview ? "REVIEW" : "SIMULATION"}
            </span>
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-themed tnum">
            {mainnetReview ? "—" : "$" + snapshot.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            {mainnetReview ? "Connect wallet to load on-chain NAV" : "Stables allocation: " + snapshot.stables.toFixed(1) + "%"}
          </div>
        </div>

        {/* Operating Buffer */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>Liquid Cash (USDC)</span>
            <Icon name="payments" className="material-symbols-outlined text-[16px]" />
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-themed tnum">
            {mainnetReview ? "—" : "$" + liquidUsdc.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-pos">
            {mainnetReview ? "Wallet balance loads after connect" : "Buffer: $" + targetBufferUsd.toLocaleString()}
          </div>
        </div>

        {/* USYC */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>USYC Treasury Position</span>
            <Icon name="trending_up" className="material-symbols-outlined text-[16px] text-pos" />
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-pos tnum">
            {mainnetReview ? "—" : "$" + usycNavUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-pos font-semibold">
            {mainnetReview ? "Live USYC NAV loads after connect" : "Current demonstration asset · reference NAV, not an execution quote"}
          </div>
        </div>

        {/* Policy-eligible cash */}
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="flex justify-between items-center text-muted font-mono text-[10px] uppercase">
            <span>Policy-Eligible USDC</span>
            <Icon name="policy" className="material-symbols-outlined text-[16px] text-lime-500" />
          </div>
          <div className="mt-2 font-display font-extrabold text-2xl text-lime-500 tnum">
            {mainnetReview ? "—" : "$" + Math.max(0, liquidUsdc - targetBufferUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted">
            {mainnetReview ? "Connect wallet to calculate eligibility" : "Maximum USDC this app will allow into a reviewed buy"}
          </div>
        </div>
      </div>

      {/* Treasury Capital Flow Topography Diagram */}
      <CapitalFlowDiagram />

      {/* Main Interactive Controls: reserve policy and reviewed treasury move */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Module 1: Target Operating Cash Buffer Selector */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-themed">
                Target Operating Cash Buffer
              </h2>
              <p className="font-mono text-xs text-muted mt-1 leading-relaxed">
                Set the amount that must remain liquid. Only USDC above this boundary is eligible for a reviewed treasury move.
              </p>
              {livePortfolio && (
                <p className="font-mono text-[10px] text-cyan mt-2">
                  Wallet-scaled starting buffer: ${liveSizing.targetBufferUsd.toLocaleString()} USDC · based on 20% of current liquid USDC.
                </p>
              )}
            </div>
            <span className="font-display font-black text-xl text-pos tnum">
              {mainnetReview ? "—" : "$" + targetBufferUsd.toLocaleString()}
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
                  disabled={mainnetReview}
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
              <span className="text-themed font-bold">{mainnetReview ? "—" : "$" + targetBufferUsd}</span>
            </div>
            <input
              type="range"
              min={0}
              max={bufferSliderMax}
              step={100}
              value={Math.min(targetBufferUsd, bufferSliderMax)}
              onChange={(e) => setTargetBufferUsd(Number(e.target.value))}
              disabled={mainnetReview}
              className="w-full accent-lime-500 cursor-pointer"
            />
          </div>

          {/* Sweep Status Card */}
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30 space-y-2 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Policy-Eligible Cash:</span>
              <span className="text-themed font-bold tnum">
                {mainnetReview ? "—" : "$" + Math.max(0, liquidUsdc - targetBufferUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDC"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Reserve after max move:</span>
              <span className="text-pos font-bold tnum">
                {mainnetReview ? "—" : "$" + Math.min(liquidUsdc, targetBufferUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " USDC"}
              </span>
            </div>
            <div className="pt-2 border-t border-themed/20">
              <Button
                variant={sweep.recommended ? "pos" : "secondary"}
                fullWidth
                size="md"
                onClick={handleSweepNow}
                disabled={mainnetReview || !sweep.recommended || executing}
                isLoading={executing && sweep.recommended}
                leftIcon={<Icon name="bolt" className="material-symbols-outlined text-[16px]" />}
              >
                {sweep.recommended
                  ? `Review ${sweep.sweepAmount.toLocaleString()} USDC → USYC${livePortfolio ? " (On-Chain)" : " (Sim)"}`
                  : "No USDC above reserve"}
              </Button>
            </div>
          </div>
        </div>

        {/* Module 2: JIT Liquidity Unwind Simulator */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display font-bold text-base text-themed">
                Review a USYC liquidity unwind
              </h2>
              <p className="font-mono text-xs text-muted mt-1 leading-relaxed">
                Model the USYC needed to fund a planned trade while preserving your cash reserve. Review the unwind first, then review the trade separately. NAV sizing is an estimate, not a router guarantee.
              </p>
            </div>
            <span
              className={`font-mono text-xs px-2 py-0.5 rounded-pill border ${
                jit.canCover
                  ? "bg-pos/15 border-pos/40 text-pos"
                  : "bg-neg/15 border-neg/40 text-neg"
              }`}
            >
              {mainnetReview ? "WALLET REQUIRED" : jit.canCover ? "SOLVENT" : "SHORTFALL"}
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
                  disabled={mainnetReview}
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
                {mainnetReview ? "—" : "$" + Math.min(liquidUsdc, stressTestAmount).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Shortfall including cash reserve:</span>
              <span className={`${jit.needed ? "text-amber-500 font-bold" : "text-muted"} tnum`}>
                {mainnetReview ? "—" : "$" + jit.deficit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">USYC Amount to Rebalance:</span>
              <span className="text-pos font-bold tnum">${jit.usycToRedeem.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-themed/20">
              <span className="text-muted">Remaining USYC Treasury:</span>
              <span className="text-themed font-medium tnum">{mainnetReview ? "—" : "$" + jit.remainingUsyc.toLocaleString()}</span>
            </div>
          </div>

          <div className="text-[11px] font-mono text-muted flex items-center gap-1.5">
            <Icon name="verified" className="material-symbols-outlined text-[15px] text-pos" />
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
              leftIcon={<Icon name="swap_horiz" className="material-symbols-outlined text-[16px]" />}
            >
              Review USYC unwind: ${jit.usycToRedeem.toLocaleString(undefined, { maximumFractionDigits: 6 })} USYC → USDC{livePortfolio ? " (On-Chain)" : " (Sim)"}
            </Button>
          )}
        </div>
      </div>

      {/* Deterministic policy and execution checks */}
      <div className="card-themed border border-themed rounded-card p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-themed/20">
          <div className="flex items-center gap-2">
            <Icon name="policy" className="material-symbols-outlined text-[20px] text-pos" />
            <div>
              <h3 className="font-display font-bold text-sm text-themed">
                Deterministic policy & execution checks
              </h3>
              <p className="font-mono text-xs text-muted">
                The app decides what may be reviewed before it ever asks the wallet to sign.
              </p>
            </div>
          </div>
          <span className="font-mono text-[10px] text-pos font-bold">FAIL-CLOSED</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-themed">1. Reserve boundary</span>
              <span className="text-[10px] text-lime-500 font-semibold">POLICY</span>
            </div>
            <div className="p-2 rounded bg-themed/5 text-themed text-[11px] select-all">
              Eligible = max(0, Liquid USDC - Protected Reserve)
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>• Liquid USDC: {mainnetReview ? "—" : "$" + liquidUsdc.toLocaleString()}</div>
              <div>• Protected Reserve: {mainnetReview ? "—" : "$" + targetBufferUsd.toLocaleString()}</div>
              <div>• Eligible: {mainnetReview ? "—" : "$" + Math.max(0, liquidUsdc - targetBufferUsd).toLocaleString()}</div>
            </div>
          </div>

          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-themed">2. Reviewed move</span>
              <span className="text-[10px] text-pos font-semibold">BOUNDED INPUT</span>
            </div>
            <div className="p-2 rounded bg-themed/5 text-themed text-[11px] select-all">
              Proposed Input ≤ Policy-Eligible USDC
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>• Reviewable USDC: {mainnetReview ? "—" : "$" + sweep.sweepAmount.toLocaleString()}</div>
              <div>• Reserve stays outside the reviewed input</div>
              <div className="text-pos font-semibold">• Rechecked before approval and broadcast</div>
            </div>
          </div>

          <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-themed">3. Arc settlement bounds</span>
              <span className="text-[10px] text-cyan font-semibold">BOUNDED OUTPUT</span>
            </div>
            <div className="p-2 rounded bg-themed/5 text-themed text-[11px] select-all">
              Minimum output comes from the fresh Arc router quote
            </div>
            <div className="text-[11px] text-muted space-y-1">
              <div>• Reference NAV: ${PAIRS["USYC/USDC"].price.toFixed(6)} per USYC</div>
              <div>• Wallet signs explicit execution bounds</div>
              <div>• Quote failure, expiry, or zero output blocks execution</div>
            </div>
          </div>
        </div>
      </div>
      {/* Asset Allocation Breakdown Table */}
      <div className="card-themed border border-themed rounded-card p-5">
        <h3 className="font-display font-bold text-sm text-themed mb-3">
          {livePortfolio ? "On-Chain Balance Sheet Holdings" : mainnetReview ? "Mainnet holdings load after wallet connect" : "Simulated Balance Sheet Holdings"}
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
              Arc Mainnet Deployment & Infrastructure
            </div>
            <h3 className="font-display font-bold text-sm text-themed mt-0.5">
              Deployed Contracts & Settlement Layer (Chain ID: 5042)
            </h3>
          </div>
          <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-pos/10 border border-pos/30 text-pos font-bold">
            Deployment and infrastructure checks available in the repo test suite
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
                <Icon name="open_in_new" className="material-symbols-outlined text-[13px]" />
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
                <Icon name="open_in_new" className="material-symbols-outlined text-[13px]" />
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

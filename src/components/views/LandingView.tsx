import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC, USYC_APY, USYC_YIELD_AS_OF } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";

export const LandingView: React.FC = () => {
  const { connectWallet, launchDemo, connecting, setView, startJudgeTour } = useAppStore();
  const [simTreasurySize, setSimTreasurySize] = useState<number>(250000);

  const previewKeys = ["ETH/USDC", "BTC/USDC", "EURC/USDC", "ARC/USDC"];

  // Simulation calculations
  const simBuffer = 10000;
  const simYieldPrincipal = Math.max(0, simTreasurySize - simBuffer);
  const usycAnnualReturn = simYieldPrincipal * USYC_APY;
  const bankAnnualReturn = simYieldPrincipal * 0.0005; // 0.05% checking rate
  const annualAlphaUsd = usycAnnualReturn - bankAnnualReturn;

  const handleLaunchWithCustomTreasury = () => {
    useAppStore.setState((s) => ({
      balances: {
        ...s.balances,
        USDC: simBuffer,
        USYC: simYieldPrincipal / PAIRS["USYC/USDC"].price,
      },
      targetBufferUsd: simBuffer,
      connected: true,
      address: null,
      chainId: 5042,
      wrongNetwork: false,
      providerLabel: "Demo Simulation",
      livePortfolio: false,
    }));
    setView("portfolio");
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-center relative px-4 py-12 md:py-16">
      {/* Grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-3xl w-full">
        {/* App Logo */}
        <div className="mb-4">
          <Logo size={56} />
        </div>

        {/* Arc Badge linked to Explorer */}
        <a
          href={`https://explorer.arc.io/address/${ARC.settlement}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-pill card-themed border border-themed/60 hover:border-cyan/50 text-[10px] font-mono tracking-widest uppercase text-muted hover:text-cyan transition-colors mb-6 group"
          title="View verified contract on Arc Explorer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-pos animate-pulse" />
          <span>Arc Mainnet · 5042 · {shortAddr(ARC.settlement)}</span>
          <span className="material-symbols-outlined text-[12px] opacity-70 group-hover:opacity-100">open_in_new</span>
        </a>

        {/* Hero Title */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-themed">
          The policy-controlled treasury desk for <span className="text-shimmer">Arc</span>.
        </h1>

        <p className="mt-5 text-sm sm:text-base max-w-xl leading-relaxed text-sub">
          Policy-driven cash optimization, USYC treasury rebalancing, and Just-In-Time liquidity
          clearing—governed by signed EIP-712 execution controls.
        </p>

        {/* Highlight Stats */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-12">
          <div className="text-center">
            <div className="font-display font-extrabold text-2xl sm:text-3xl text-pos">{(USYC_APY * 100).toFixed(3)}%</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5">
              USYC Net Reference Yield · {USYC_YIELD_AS_OF}
            </div>
          </div>
          <div className="text-center">
            <div className="font-display font-extrabold text-2xl sm:text-3xl text-themed">$0</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5">
              Idle Cash Drag
            </div>
          </div>
          <div className="text-center">
            <div className="font-display font-extrabold text-2xl sm:text-3xl text-themed">14</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5">
              Fail-Closed Gates
            </div>
          </div>
        </div>

        {/* Interactive Tour Banner */}
        <div className="mt-8 w-full max-w-md">
          <button
            onClick={startJudgeTour}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-cyan/15 hover:bg-cyan/25 border-2 border-cyan/50 text-themed transition-all shadow-lg hover:shadow-cyan/10 group cursor-pointer"
          >
            <div className="flex items-center gap-3 text-left">
              <span className="w-3 h-3 rounded-full bg-cyan animate-ping shrink-0" />
              <div>
                <div className="font-display font-black text-sm text-cyan flex items-center gap-1.5">
                  <span>Take a Tour</span>
                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan/20 border border-cyan/40 text-cyan uppercase font-bold">
                    3 MIN
                  </span>
                </div>
                <div className="font-mono text-[11px] text-sub mt-0.5">
                  1-Click walkthrough: Policy Sweep, JIT Unwind & Arc Settlement
                </div>
              </div>
            </div>
            <span className="material-symbols-outlined text-[20px] text-cyan group-hover:translate-x-1 transition-transform shrink-0">
              play_circle
            </span>
          </button>
        </div>

        {/* CTA Buttons with True React Button Component */}
        <div className="mt-4 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <Button
            size="lg"
            variant="primary"
            fullWidth
            isLoading={connecting}
            onClick={() => connectWallet()}
            leftIcon={<span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>}
          >
            {connecting ? "Connecting Wallet..." : "Connect Treasury Wallet"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            fullWidth
            onClick={launchDemo}
            leftIcon={<span className="material-symbols-outlined text-[18px]">savings</span>}
          >
            Launch Treasury Demo
          </Button>
        </div>

        {/* Interactive Yield Calculator Preview */}
        <div className="mt-12 w-full card-themed border border-themed rounded-card p-5 sm:p-6 text-left space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-lime-500 font-bold">
                Interactive Treasury Calculator
              </div>
              <h3 className="font-display font-bold text-base text-themed mt-0.5">
                Model idle cash returns using a USYC reference yield
              </h3>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs text-muted">
              <span>Simulated Portfolio:</span>
              <span className="font-bold text-themed font-mono text-sm tnum">
                ${simTreasurySize.toLocaleString()} USDC
              </span>
            </div>
          </div>

          {/* Interactive Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[50000, 100000, 250000, 1000000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSimTreasurySize(preset)}
                className={`py-2 px-2 text-center rounded-card font-mono text-xs transition-all ${
                  simTreasurySize === preset
                    ? "bg-lime-500 text-black font-black shadow-sm"
                    : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-lime-500/30"
                }`}
              >
                ${preset >= 1000000 ? "1M" : `${preset / 1000}k`}
              </button>
            ))}
          </div>

          {/* Interactive Range Slider */}
          <input
            type="range"
            min={25000}
            max={2000000}
            step={25000}
            value={simTreasurySize}
            onChange={(e) => setSimTreasurySize(Number(e.target.value))}
            className="w-full accent-lime-500 cursor-pointer"
          />

          {/* Real-Time Comparative Yield Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30">
              <div className="font-mono text-[10px] uppercase text-muted">USYC Net Reference Yield (3.225%)</div>
              <div className="font-display font-extrabold text-xl text-pos mt-1 tnum">
                +${usycAnnualReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
              </div>
              <div className="font-mono text-[10px] text-muted mt-0.5">
                +${(usycAnnualReturn / 365).toFixed(2)}/day modeled reference yield
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30">
              <div className="font-mono text-[10px] uppercase text-muted">Traditional Bank (0.05%)</div>
              <div className="font-display font-extrabold text-xl text-muted mt-1 tnum">
                ${bankAnnualReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
              </div>
              <div className="font-mono text-[10px] text-muted mt-0.5">
                Illustrative bank benchmark
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-pos/10 border border-pos/30 flex flex-col justify-between">
              <div>
                <div className="font-mono text-[10px] uppercase text-pos font-bold">Net Alpha Gain</div>
                <div className="font-display font-black text-xl text-pos mt-1 tnum">
                  +${annualAlphaUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <Button
                size="xs"
                variant="pos"
                className="mt-2 w-full text-[10px]"
                onClick={handleLaunchWithCustomTreasury}
                rightIcon={<span className="material-symbols-outlined text-[13px]">arrow_forward</span>}
              >
                Launch With This Portfolio
              </Button>
            </div>
          </div>
        </div>

        {/* Capital Flow Architecture Box */}
        <div className="mt-8 w-full card-themed border border-themed rounded-card p-5 text-left">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-4">
            Policy-Controlled Treasury Capital Flow
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Operating Buffer",
                sub: "Liquid USDC for gas & daily operations",
                icon: "account_balance",
              },
              {
                label: "Policy Sweep Engine",
                sub: "Excess cash routed into USYC when policy permits",
                icon: "trending_up",
              },
              {
                label: "JIT USYC/USDC Unwind",
                sub: "Quoted USYC/USDC unwind for outgoing liquidity needs",
                icon: "swap_calls",
              },
              {
                label: "Arc Settlement",
                sub: `${shortAddr(ARC.settlement)} (Chain 5042)`,
                icon: "gavel",
              },
            ].map((step, i) => (
              <div key={i} className="p-3 rounded-card bg-themed-card/50 border border-themed/20">
                <span className="material-symbols-outlined text-[20px] text-pos mb-1.5 block">
                  {step.icon}
                </span>
                <div className="font-display font-bold text-xs text-themed">{step.label}</div>
                <div className="font-mono text-[10px] text-muted mt-1 leading-snug">{step.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Preview Cards */}
        <div className="mt-6 w-full grid grid-cols-2 sm:grid-cols-4 gap-2">
          {previewKeys.map((k) => {
            const v = PAIRS[k];
            if (!v) return null;
            const isUp = v.change >= 0;
            return (
              <div key={k} className="card-themed border border-themed rounded-card p-3 text-left">
                <div className="font-mono text-[10px] text-muted">{k}</div>
                <div className="font-display font-bold text-sm mt-0.5 text-themed tnum">
                  {k === "EURC/USDC" ? v.price.toFixed(4) : `$${v.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
                <div className={`font-mono text-[10px] mt-0.5 ${isUp ? "text-pos" : "text-neg"}`}>
                  {isUp ? "+" : ""}
                  {v.change.toFixed(2)}%
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

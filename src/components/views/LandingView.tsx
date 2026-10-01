import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC, USYC_APY } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";

export const LandingView: React.FC = () => {
  const { connectWallet, launchDemo, connecting, setView } = useAppStore();
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
        USYC: simYieldPrincipal,
      },
      targetBufferUsd: simBuffer,
      connected: true,
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

        {/* Arc Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-pill card-themed border border-themed text-[10px] font-mono tracking-widest uppercase text-muted mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-pos animate-pulse" />
          Arc Mainnet · Chain ID 5042 · Institutional Liquidity
        </div>

        {/* Hero Title */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-themed">
          The autonomous treasury desk for <span className="text-shimmer">Arc</span>.
        </h1>

        <p className="mt-5 text-sm sm:text-base max-w-xl leading-relaxed text-sub">
          Continuous cash optimization, automated 4.95% USYC T-Bill yield sweeps, and Just-In-Time liquidity
          clearing—governed by zero-custody EIP-712 mandates.
        </p>

        {/* Highlight Stats */}
        <div className="mt-8 flex flex-wrap justify-center gap-8 sm:gap-12">
          <div className="text-center">
            <div className="font-display font-extrabold text-2xl sm:text-3xl text-pos">4.95%</div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted mt-0.5">
              USYC T-Bill Yield
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

        {/* CTA Buttons with True React Button Component */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
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
              <div className="font-mono text-[10px] uppercase tracking-widest text-cyan font-bold">
                Interactive Treasury Calculator
              </div>
              <h3 className="font-display font-bold text-base text-themed mt-0.5">
                Simulate Your Idle Cash Returns on Arc
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
                    ? "bg-cyan text-black font-black shadow-sm"
                    : "card-themed border border-themed/40 text-sub hover:text-themed hover:border-cyan/30"
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
            className="w-full accent-cyan cursor-pointer"
          />

          {/* Real-Time Comparative Yield Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30">
              <div className="font-mono text-[10px] uppercase text-muted">Arc USYC (4.95% APY)</div>
              <div className="font-display font-extrabold text-xl text-pos mt-1 tnum">
                +${usycAnnualReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
              </div>
              <div className="font-mono text-[10px] text-muted mt-0.5">
                +${(usycAnnualReturn / 365).toFixed(2)}/day continuous compounding
              </div>
            </div>

            <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/30">
              <div className="font-mono text-[10px] uppercase text-muted">Traditional Bank (0.05%)</div>
              <div className="font-display font-extrabold text-xl text-muted mt-1 tnum">
                ${bankAnnualReturn.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/yr
              </div>
              <div className="font-mono text-[10px] text-muted mt-0.5">
                Forfeiting yield to corporate bank fees
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
            Autonomous Treasury Capital Flow
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                label: "Operating Buffer",
                sub: "Liquid USDC for gas & daily operations",
                icon: "account_balance",
              },
              {
                label: "Auto-Sweep Engine",
                sub: "Excess cash swept to 4.95% USYC T-Bills",
                icon: "trending_up",
              },
              {
                label: "JIT Unwind Bridge",
                sub: "Instant par redemption on outgoing trades",
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

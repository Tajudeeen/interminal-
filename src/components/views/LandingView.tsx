import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";

export const LandingView: React.FC = () => {
  const { connectWallet, launchDemo, connecting } = useAppStore();

  const previewKeys = ["ETH/USDC", "BTC/USDC", "EURC/USDC", "ARC/USDC"];

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

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
          <button
            onClick={() => connectWallet()}
            disabled={connecting}
            className="w-full sm:flex-1 px-6 py-3.5 rounded-pill bg-text text-bg font-display font-bold text-sm transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            {connecting ? "Connecting Wallet..." : "Connect Treasury Wallet"}
          </button>
          <button
            onClick={launchDemo}
            className="w-full sm:flex-1 px-6 py-3.5 rounded-pill card-themed border border-themed font-display font-semibold text-sm text-sub hover:text-themed transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">savings</span>
            Launch Treasury Demo
          </button>
        </div>

        {/* Capital Flow Architecture Box */}
        <div className="mt-12 w-full card-themed border border-themed rounded-card p-5 text-left">
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

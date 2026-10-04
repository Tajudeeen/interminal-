import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";

export const Sidebar: React.FC = () => {
  const {
    view,
    setView,
    theme,
    toggleTheme,
    address,
    connected,
    livePortfolio,
    connectWallet,
    disconnectWallet,
    nativeGasBalance,
    setGasTankModalOpen,
    setSearchOpen,
    startJudgeTour,
    launchTestnet,
    openMainnetReview,
    environmentMode,
  } = useAppStore();

  const navItems = [
    { id: "portfolio", label: "Treasury Cockpit", icon: "savings", badge: "4.95%" },
    { id: "terminal", label: "FX & Trade Desk", icon: "candlestick_chart" },
    { id: "markets", label: "Markets & Liquidity", icon: "query_stats" },
    { id: "ai", label: "AI Quant Analyst", icon: "psychology" },
    { id: "ledger", label: "Corporate Ledger", icon: "receipt_long" },
    { id: "proof", label: "Proof & Verifier", icon: "verified_user", badge: "14/14" },
    { id: "testnet", label: "Testnet Lab", icon: "science", badge: "5042002" },
  ] as const;

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 shrink-0 border-r border-themed surface-themed z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-themed flex items-center justify-between">
        <button
          onClick={() => setView("landing")}
          className="flex items-center gap-3 text-left focus:outline-none group"
        >
          <Logo size={32} />
          <div>
            <div className="font-display font-extrabold text-[15px] tracking-tight leading-none text-themed group-hover:text-lime-500 transition-colors">
              INTERMINAL
            </div>
            <div className="font-mono text-[9px] text-muted tracking-widest uppercase mt-1">
              Arc Mainnet · 5042
            </div>
          </div>
        </button>
      </div>

      {/* Interactive Tour Button */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={startJudgeTour}
          className="w-full flex items-center justify-between px-3 py-2 rounded-card bg-cyan/10 hover:bg-cyan/20 border border-cyan/40 text-cyan text-xs font-display font-bold transition-all shadow-sm group"
        >
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
            <span>Take a Tour</span>
          </div>
          <span className="material-symbols-outlined text-[15px] group-hover:translate-x-0.5 transition-transform">
            arrow_forward
          </span>
        </button>
      </div>

      {/* Primary Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-muted">
          Institutional Desk
        </div>
        <button
          onClick={launchTestnet}
          className="w-full mb-2 flex items-center justify-between px-3 py-2 rounded-card bg-cyan/5 border border-cyan/20 text-cyan text-[10px] font-mono hover:bg-cyan/10 transition-all"
        >
          <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-cyan" /> Testnet rehearsal</span>
          <span>5042002</span>
        </button>
        {navItems.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-card text-xs font-display font-semibold transition-all ${
                isActive
                  ? "bg-themed-card text-themed shadow-sm border border-lime-500/40"
                  : "text-sub hover:text-themed hover:bg-themed-card/50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`material-symbols-outlined text-[19px] ${
                    isActive ? "text-lime-500" : "text-muted"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {"badge" in item && (
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-pill bg-themed-card border border-themed text-sub">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Gas Tank Widget */}
        <div className="pt-6 px-1">
          <div className="card-themed border border-themed rounded-card p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-amber-500">
                  local_gas_station
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-sub font-medium">
                  Arc Gas Tank
                </span>
              </div>
              {environmentMode === "demo" ? (
                <Button
                  size="xs"
                  variant="outline"
                  className="text-[10px] text-pos border-pos/30 hover:border-pos/60 hover:bg-pos/10"
                  onClick={() => setGasTankModalOpen(true)}
                >
                  Refuel
                </Button>
              ) : (
                <span className="font-mono text-[9px] text-muted uppercase">native gas</span>
              )}
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display font-extrabold text-base text-themed tnum">
                {environmentMode === "mainnet" && !livePortfolio ? "—" : nativeGasBalance.toFixed(3)}
              </span>
              <span className="font-mono text-[10px] text-muted">Arc Native</span>
            </div>
            <div className="mt-1.5 w-full bg-themed-card rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.min(100, (nativeGasBalance / 0.25) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom User & System Controls */}
      <div className="p-3 border-t border-themed space-y-2">
        {/* Search Shortcut */}
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-card card-themed border border-themed text-xs text-sub hover:text-themed transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">search</span>
            <span>Search Markets</span>
          </div>
          <kbd className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-themed-surface border border-themed text-muted">
            Ctrl+K
          </kbd>
        </button>

        {/* Account Pill / Connect */}
        {connected ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-card card-themed border border-themed">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  livePortfolio ? "bg-pos animate-pulse" : "bg-neutral-500"
                } shrink-0`}
              />
              <div className="min-w-0">
                <div className="font-mono text-[11px] text-themed truncate">
                  {shortAddr(address)}
                </div>
                <div className="font-mono text-[9px] text-muted">
                  {livePortfolio ? "Arc Mainnet" : environmentMode === "testnet" ? "Arc Testnet" : "Demo Simulation"}
                </div>
              </div>
            </div>
            <button
              onClick={disconnectWallet}
              title="Disconnect session"
              className="p-1 text-muted hover:text-neg transition-colors rounded"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
            </button>
          </div>
        ) : environmentMode === "demo" ? (
          <Button
            size="sm"
            variant="primary"
            onClick={openMainnetReview}
            leftIcon={<span className="material-symbols-outlined text-[14px]">bolt</span>}
          >
            Review Mainnet
          </Button>
        ) : (
          <Button
            size="sm"
            variant="primary"
            onClick={() => connectWallet(environmentMode === "testnet" ? "testnet" : "mainnet")}
            leftIcon={<span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>}
          >
            Connect
          </Button>
        )}

        {/* Verified Arc Contract Explorer Link */}
        <a
          href={`https://explorer.arc.io/address/${ARC.settlement}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-2.5 py-1.5 rounded-card bg-themed-card/40 hover:bg-cyan/10 border border-dashed border-themed/40 hover:border-cyan/40 text-[10px] font-mono text-muted hover:text-cyan transition-colors"
          title="Inspect verified contract on Arc Mainnet Explorer"
        >
          <div className="flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-[13px] text-pos">verified</span>
            <span className="truncate">Settlement: {shortAddr(ARC.settlement)}</span>
          </div>
          <span className="material-symbols-outlined text-[12px] shrink-0">open_in_new</span>
        </a>

        {/* Footer info & Theme toggle */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="font-mono text-[10px] text-muted">
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${environmentMode === "testnet" ? "bg-cyan" : "bg-pos"}`} />
            {environmentMode === "testnet" ? "5042002 Testnet" : environmentMode === "mainnet" ? "5042 Mainnet" : "Demo · no wallet"}
          </div>
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1 rounded text-sub hover:text-themed transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">
              {theme === "dark" ? "light_mode" : "dark_mode"}
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

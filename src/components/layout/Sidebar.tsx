import React from "react";
import { useAppStore } from "../../store/useAppStore";
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
    launchDemo,
  } = useAppStore();

  const navItems = [
    { id: "portfolio", label: "Treasury Cockpit", icon: "savings", badge: "4.95%" },
    { id: "terminal", label: "FX & Trade Desk", icon: "candlestick_chart" },
    { id: "markets", label: "Markets & Liquidity", icon: "query_stats" },
    { id: "ai", label: "AI Quant Analyst", icon: "psychology" },
    { id: "ledger", label: "Corporate Ledger", icon: "receipt_long" },
    { id: "proof", label: "Proof & Verifier", icon: "verified_user", badge: "14/14" },
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
            <div className="font-display font-extrabold text-[15px] tracking-tight leading-none text-themed group-hover:text-cyan transition-colors">
              INTERMINAL
            </div>
            <div className="font-mono text-[9px] text-muted tracking-widest uppercase mt-1">
              Arc Mainnet · 5042
            </div>
          </div>
        </button>
      </div>

      {/* Primary Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-mono uppercase tracking-widest text-muted">
          Institutional Desk
        </div>
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
                    isActive ? "text-pos" : "text-muted"
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
              <Button
                size="xs"
                variant="outline"
                className="text-[10px] text-pos border-pos/30 hover:border-pos/60 hover:bg-pos/10"
                onClick={() => setGasTankModalOpen(true)}
              >
                Refuel
              </Button>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="font-display font-extrabold text-base text-themed tnum">
                {nativeGasBalance.toFixed(3)}
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
                  {livePortfolio ? "Arc Live" : "Demo Session"}
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
        ) : (
          <div className="grid grid-cols-2 gap-1.5">
            <Button
              size="sm"
              variant="primary"
              onClick={() => connectWallet()}
              leftIcon={<span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>}
            >
              Connect
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={launchDemo}
              leftIcon={<span className="material-symbols-outlined text-[14px]">play_circle</span>}
            >
              Demo
            </Button>
          </div>
        )}

        {/* Footer info & Theme toggle */}
        <div className="flex items-center justify-between px-1 pt-1">
          <div className="font-mono text-[10px] text-muted">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pos mr-1" />
            5042 Synced
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

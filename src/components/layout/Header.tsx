import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { shortAddr } from "../../lib/arc/wallet";

export const Header: React.FC = () => {
  const {
    setView,
    theme,
    toggleTheme,
    address,
    connected,
    livePortfolio,
    connectWallet,
    setGasTankModalOpen,
    setSearchOpen,
    nativeGasBalance,
  } = useAppStore();

  return (
    <header className="lg:hidden sticky top-0 z-30 surface-themed border-b border-themed px-4 py-2.5 flex items-center justify-between">
      <button
        onClick={() => setView("landing")}
        className="flex items-center gap-2 focus:outline-none"
      >
        <div className="w-7 h-7 rounded card-themed border border-themed flex items-center justify-center font-display font-black text-xs text-pos">
          IT
        </div>
        <div className="text-left leading-tight">
          <div className="font-display font-extrabold text-sm text-themed">INTERMINAL</div>
          <div className="font-mono text-[8px] text-muted uppercase">Arc 5042</div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        {/* Gas Tank Pill */}
        <button
          onClick={() => setGasTankModalOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-pill card-themed border border-themed text-[11px] font-mono text-sub hover:text-themed"
        >
          <span className="material-symbols-outlined text-[13px] text-amber-500">
            local_gas_station
          </span>
          <span>{nativeGasBalance.toFixed(2)}</span>
        </button>

        {/* Search */}
        <button
          onClick={() => setSearchOpen(true)}
          className="p-1.5 rounded card-themed border border-themed text-sub hover:text-themed"
          title="Search Markets"
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded card-themed border border-themed text-sub hover:text-themed"
          title="Toggle Theme"
        >
          <span className="material-symbols-outlined text-[16px]">
            {theme === "dark" ? "light_mode" : "dark_mode"}
          </span>
        </button>

        {/* Connect / Account */}
        {connected ? (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-pill card-themed border border-themed text-[11px] font-mono">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                livePortfolio ? "bg-pos animate-pulse" : "bg-neutral-500"
              }`}
            />
            <span className="truncate max-w-[64px]">{shortAddr(address)}</span>
          </div>
        ) : (
          <button
            onClick={() => connectWallet()}
            className="px-2.5 py-1 rounded-pill bg-text text-bg font-display font-bold text-[11px]"
          >
            Connect
          </button>
        )}
      </div>
    </header>
  );
};

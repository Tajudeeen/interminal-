import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { shortAddr } from "../../lib/arc/wallet";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";

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
    startJudgeTour,
    environmentMode,
    wrongNetwork,
    switchToCurrentNetwork,
  } = useAppStore();

  return (
    <header className="lg:hidden sticky top-0 z-30 surface-themed border-b border-themed px-4 py-2.5 flex items-center justify-between">
      <button
        onClick={() => setView("landing")}
        className="flex items-center gap-2.5 focus:outline-none group text-left"
      >
        <Logo size={28} />
        <div className="text-left leading-tight">
          <div className="font-display font-extrabold text-sm text-themed group-hover:text-lime-500 transition-colors">
            INTERMINAL
          </div>
          <div className="font-mono text-[8px] text-muted uppercase">{environmentMode === "testnet" ? "Arc Testnet · 5042002" : "Arc Mainnet · 5042"}</div>
        </div>
      </button>

      <div className="flex items-center gap-2">
        {/* Environment status */}
        <span className={`hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-pill border font-mono text-[9px] uppercase ${environmentMode === "testnet" ? "border-cyan/30 text-cyan bg-cyan/5" : "border-lime-500/25 text-lime-500 bg-lime-500/5"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${environmentMode === "testnet" ? "bg-cyan" : "bg-lime-500"}`} />
          {environmentMode === "testnet" ? "testnet" : environmentMode === "mainnet" ? "mainnet" : "demo"}
        </span>

        {/* Interactive Tour Button */}
        <Button
          size="xs"
          variant="outline"
          className="border-cyan/40 text-cyan hover:bg-cyan/10 font-bold"
          onClick={startJudgeTour}
          leftIcon={<span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />}
        >
          Take a Tour
        </Button>
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
          wrongNetwork ? (
            <Button
              size="xs"
              variant="outline"
              onClick={switchToCurrentNetwork}
              leftIcon={<span className="material-symbols-outlined text-[13px]">sync</span>}
            >
              Switch
            </Button>
          ) : (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-pill card-themed border border-themed text-[11px] font-mono">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  livePortfolio ? "bg-pos animate-pulse" : "bg-neutral-500"
                }`}
              />
              <span className="truncate max-w-[64px]">{shortAddr(address)}</span>
            </div>
          )
        ) : (
          <Button
            size="xs"
            variant="primary"
            onClick={() => connectWallet()}
          >
            Connect
          </Button>
        )}
      </div>
    </header>
  );
};

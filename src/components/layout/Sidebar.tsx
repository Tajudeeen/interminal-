import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";
import { CORE_NAV_ITEMS, LAB_NAV_ITEMS } from "./navigation";

export const Sidebar: React.FC = () => {
  const s = useAppStore();
  return (
    <aside className="desk-sidebar hidden lg:flex">
      <button
        className="desk-brand"
        onClick={() => s.setView("landing")}
        aria-label="Interminal home"
      >
        <Logo size={32} />
        <span>
          <strong>INTERMINAL</strong>
          <small>USDC treasury proof on Arc</small>
        </span>
      </button>
      <button className="desk-search" onClick={() => s.setSearchOpen(true)}>
        <Icon name="search" className="material-symbols-outlined" />
        Find an Arc route<kbd>Ctrl K</kbd>
      </button>
      <nav aria-label="Main navigation" className="desk-navigation">
        <p className="eyebrow">Mainnet proof</p>
        {CORE_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            aria-current={s.view === item.id ? "page" : undefined}
            onClick={() => s.setView(item.id)}
            className={s.view === item.id ? "active" : ""}
          >
            <Icon name={item.icon} className="material-symbols-outlined" />
            {item.label}
          </button>
        ))}
        <p className="eyebrow mt-7">Optional lab</p>
        {LAB_NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            aria-current={s.view === item.id ? "page" : undefined}
            onClick={() =>
              item.id === "testnet" ? s.launchTestnet() : s.setView(item.id)
            }
            className={s.view === item.id ? "active" : ""}
          >
            <Icon name={item.icon} className="material-symbols-outlined" />
            {item.label}
          </button>
        ))}
      </nav>
      <div className="desk-sidebar-bottom">
        <button className="desk-tour" onClick={s.startJudgeTour}>
          <Icon name="play_circle" className="material-symbols-outlined" />
          90-second reviewer path
          <Icon name="arrow_forward" className="material-symbols-outlined" />
        </button>
        <div className="desk-session">
          <div className="flex items-center justify-between gap-2">
            <span className="eyebrow">
              {s.environmentMode === "demo"
                ? "Simulation"
                : s.environmentMode === "testnet"
                  ? "Arc testnet"
                  : "Arc mainnet"}
            </span>
            <button
              onClick={s.toggleTheme}
              aria-label={
                s.theme === "dark" ? "Use light theme" : "Use dark theme"
              }
            >
              <Icon
                name={s.theme === "dark" ? "light_mode" : "dark_mode"}
                className="material-symbols-outlined text-lg"
              />
            </button>
          </div>
          <p className="font-mono text-sm my-3">
            {s.address
              ? shortAddr(s.address)
              : s.environmentMode === "demo"
                ? "No wallet needed"
                : "Wallet disconnected"}
          </p>
          {s.wrongNetwork ? (
            <Button fullWidth size="sm" onClick={s.switchToCurrentNetwork}>
              Switch to Arc
            </Button>
          ) : s.address ? (
            <Button
              fullWidth
              size="sm"
              variant="secondary"
              onClick={s.disconnectWallet}
            >
              Disconnect
            </Button>
          ) : s.environmentMode === "demo" ? (
            <Button fullWidth size="sm" onClick={s.openMainnetReview}>
              Open mainnet workspace
            </Button>
          ) : (
            <Button
              fullWidth
              size="sm"
              isLoading={s.connecting}
              onClick={() =>
                s.connectWallet(
                  s.environmentMode === "testnet" ? "testnet" : "mainnet",
                )
              }
            >
              Connect wallet
            </Button>
          )}
        </div>
        <a
          className="desk-contract"
          href={`${ARC.explorer}/address/${ARC.settlement}`}
          target="_blank"
          rel="noreferrer"
        >
          Settlement contract
          <Icon
            name="north_east"
            className="material-symbols-outlined text-sm"
          />
        </a>
      </div>
    </aside>
  );
};

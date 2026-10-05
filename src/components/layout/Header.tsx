import { Icon } from "../ui/Icon";
import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { Logo } from "../ui/Logo";
import { Button } from "../ui/Button";
import { GlassModalWrapper } from "../modals/GlassModalWrapper";
import { NAV_ITEMS } from "./navigation";

export const Header: React.FC = () => {
  const s = useAppStore();
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <>
      <header className="desk-mobile-header lg:hidden">
        <button
          onClick={() => s.setView("landing")}
          className="flex items-center gap-2"
          aria-label="Interminal home"
        >
          <Logo size={25} />
          <span className="font-display font-extrabold text-sm">
            INTERMINAL
          </span>
        </button>
        <div className="flex items-center gap-2">
          {s.wrongNetwork ? (
            <Button size="xs" onClick={s.switchToCurrentNetwork}>
              Switch
            </Button>
          ) : s.address ? (
            <button
              onClick={() => setMenuOpen(true)}
              className="desk-account-dot"
              aria-label="Wallet controls"
            />
          ) : (
            <Button
              size="xs"
              isLoading={s.connecting}
              onClick={() =>
                s.environmentMode === "demo"
                  ? s.openMainnetReview()
                  : s.connectWallet(
                      s.environmentMode === "testnet" ? "testnet" : "mainnet",
                    )
              }
            >
              {s.environmentMode === "demo" ? "Mainnet" : "Connect"}
            </Button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Open workspace menu"
            className="desk-icon-button"
          >
            <Icon name="menu" className="material-symbols-outlined" />
          </button>
        </div>
      </header>
      <GlassModalWrapper
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        title="Workspace"
        subtitle={
          s.environmentMode === "demo"
            ? "Simulation · no funds move"
            : s.environmentMode === "testnet"
              ? "Arc testnet"
              : "Arc mainnet"
        }
      >
        <nav
          className="desk-navigation"
          aria-label="Mobile workspace navigation"
        >
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                item.id === "testnet" ? s.launchTestnet() : s.setView(item.id);
                setMenuOpen(false);
              }}
              aria-current={s.view === item.id ? "page" : undefined}
              className={s.view === item.id ? "active" : ""}
            >
              <Icon name={item.icon} className="material-symbols-outlined" />
              <span>
                {item.label}
                <small className="block text-muted font-normal mt-1">
                  {item.detail}
                </small>
              </span>
            </button>
          ))}
        </nav>
        <div className="grid grid-cols-2 gap-2 mt-5">
          <Button variant="secondary" onClick={s.toggleTheme}>
            Switch theme
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setMenuOpen(false);
              s.setSearchOpen(true);
            }}
          >
            Search markets
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setMenuOpen(false);
              s.startJudgeTour();
            }}
          >
            Demo walkthrough
          </Button>
          {s.connected && (
            <Button
              variant="secondary"
              onClick={() => {
                setMenuOpen(false);
                s.disconnectWallet();
              }}
            >
              End session
            </Button>
          )}
        </div>
      </GlassModalWrapper>
    </>
  );
};

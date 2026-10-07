import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";

export const MarketTickerMarquee: React.FC = () => {
  const {
    environmentMode,
    setView,
    livePortfolio,
    wrongNetwork,
  } = useAppStore();

  const modeLabel =
    environmentMode === "demo"
      ? "Demo · Arc mainnet target"
      : environmentMode === "testnet"
        ? "Optional Arc testnet rehearsal"
        : wrongNetwork
          ? "Wrong network"
          : "Arc Mainnet";

  return (
    <div className="desk-statusbar" role="status">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`status-dot ${environmentMode === "demo" ? "demo" : wrongNetwork ? "warning" : ""}`}
        />
        <span className="font-semibold">{modeLabel}</span>
        <span className="hidden sm:inline text-muted">
          {environmentMode === "mainnet" && livePortfolio
            ? "Chain 5042 · wallet holdings loaded · gas in USDC"
            : environmentMode === "mainnet"
              ? "Chain 5042 · connect wallet to load holdings · gas in USDC"
              : environmentMode === "demo"
                ? "Core flow mirrors the Arc mainnet path without moving funds"
                : "Testnet is not submission proof"}
        </span>
      </div>
      <button
        onClick={() => setView("proof")}
        className="flex items-center gap-2 text-xs shrink-0"
        title={ARC.settlement}
      >
        <span className="hidden sm:inline text-muted">Settlement</span>
        <span className="font-mono">
          {ARC.settlement.slice(0, 6)}…{ARC.settlement.slice(-4)}
        </span>
        <Icon
          name="verified_user"
          className="material-symbols-outlined text-sm"
        />
      </button>
    </div>
  );
};

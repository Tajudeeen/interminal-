import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";

// One active feed, one source. Reference prices never masquerade as a live ticker.
export const MarketTickerMarquee: React.FC = () => {
  const {
    environmentMode,
    marketFeedStatus,
    pair,
    setView,
    livePortfolio,
    wrongNetwork,
  } = useAppStore();
  return (
    <div className="desk-statusbar" role="status">
      <div className="flex items-center gap-2">
        <span
          className={`status-dot ${environmentMode === "demo" ? "demo" : wrongNetwork ? "warning" : ""}`}
        />
        <span>
          {environmentMode === "demo"
            ? "Demo workspace"
            : environmentMode === "testnet"
              ? "Testnet rehearsal"
              : "Mainnet workspace"}
        </span>
        <span className="hidden sm:inline text-muted">
          {environmentMode === "demo"
            ? "Simulated balances · no funds move"
            : livePortfolio
              ? "Wallet balances loaded"
              : "Connect a wallet to load holdings"}
        </span>
      </div>
      {environmentMode !== "testnet" && (
        <button
          onClick={() => setView("terminal")}
          className="flex items-center gap-2 text-xs"
        >
          <span>{pair}</span>
          <span className="text-sub">
            {marketFeedStatus.live
              ? `$${PAIRS[pair]?.price.toLocaleString("en-US", { maximumFractionDigits: 4 })}`
              : "Feed unavailable"}
          </span>
          <Icon
            name="north_east"
            className="material-symbols-outlined text-sm"
          />
        </button>
      )}
    </div>
  );
};

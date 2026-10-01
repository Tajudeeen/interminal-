import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";

export const MarketsView: React.FC = () => {
  const { setPair, setView, syncMarketData, marketFeedStatus, setImportTokenOpen } = useAppStore();
  const [selectedCat, setSelectedCat] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);

  const categories = [
    { id: "all", label: "All Markets" },
    { id: "bluechip", label: "Bluechips" },
    { id: "fx", label: "Institutional FX & Stables" },
    { id: "defi", label: "DeFi Protocols" },
  ];

  const handleSync = async () => {
    setSyncing(true);
    await syncMarketData();
    setSyncing(false);
  };

  const handleTrade = (pairKey: string) => {
    setPair(pairKey);
    setView("terminal");
  };

  const pairsList = Object.entries(PAIRS).filter(([_, data]) => {
    if (selectedCat === "all") return true;
    if (selectedCat === "fx") return data.cat === "fx" || data.cat === "rwa";
    return data.cat === selectedCat;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Arc Markets & Liquidity Pools
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Institutional AMM Depth · DexScreener Uniswap V3 Live Oracles · Chain 5042
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-3 py-2 rounded-card card-themed border border-themed text-xs font-mono text-sub hover:text-themed flex items-center gap-1.5 transition-colors"
          >
            <span
              className={`material-symbols-outlined text-[16px] ${
                syncing ? "animate-spin text-pos" : ""
              }`}
            >
              refresh
            </span>
            <span>{syncing ? "Syncing DEX..." : "Sync Reserves"}</span>
          </button>

          <button
            onClick={() => setImportTokenOpen(true)}
            className="px-3.5 py-2 rounded-card bg-text text-bg font-display font-bold text-xs flex items-center gap-1.5 transition-opacity hover:opacity-90"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Import Token
          </button>
        </div>
      </div>

      {/* Category Pills & Feed Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3 py-1.5 rounded-pill text-xs font-mono transition-colors ${
                selectedCat === cat.id
                  ? "bg-text text-bg font-bold shadow-xs"
                  : "card-themed border border-themed/40 text-sub hover:text-themed"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-muted">
          <span
            className={`w-2 h-2 rounded-full ${
              marketFeedStatus.live ? "bg-pos animate-pulse" : "bg-neutral-500"
            }`}
          />
          <span>Oracle: {marketFeedStatus.source}</span>
        </div>
      </div>

      {/* Markets Table */}
      <div className="card-themed border border-themed rounded-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-themed bg-themed-card/50 text-muted uppercase text-[10px]">
                <th className="py-3 px-4">Market Pair</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">24h Change</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell">24h High</th>
                <th className="py-3 px-4 text-right hidden sm:table-cell">24h Low</th>
                <th className="py-3 px-4 text-right hidden md:table-cell">24h Volume</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-themed/30">
              {pairsList.map(([key, data]) => {
                const isUp = data.change >= 0;
                return (
                  <tr key={key} className="hover:bg-themed-card/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-themed">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded card-themed border border-themed/40 flex items-center justify-center font-display font-extrabold text-[10px]">
                          {data.base.slice(0, 3)}
                        </div>
                        <span>{key}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted uppercase text-[10px]">{data.cat}</td>
                    <td className="py-3 px-4 text-right font-semibold text-themed tnum">
                      ${data.price < 10 ? data.price.toFixed(4) : data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`py-3 px-4 text-right font-medium tnum ${isUp ? "text-pos" : "text-neg"}`}>
                      {isUp ? "+" : ""}
                      {data.change.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right text-sub hidden sm:table-cell tnum">
                      ${data.high.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-sub hidden sm:table-cell tnum">
                      ${data.low.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-muted hidden md:table-cell tnum">
                      ${data.vol.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleTrade(key)}
                        className="px-3 py-1 rounded-card card-themed border border-themed/50 font-display font-bold text-[11px] text-themed hover:bg-themed-card hover:border-themed transition-colors"
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import React, { useMemo } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";

export const MarketSearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, setPair, setView, setImportTokenOpen } =
    useAppStore();

  const filteredPairs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return Object.entries(PAIRS);
    return Object.entries(PAIRS).filter(([key, meta]) => {
      return (
        key.toLowerCase().includes(q) ||
        meta.base.toLowerCase().includes(q) ||
        meta.cat.toLowerCase().includes(q)
      );
    });
  }, [searchQuery]);

  const handleSelect = (pairKey: string) => {
    setPair(pairKey);
    setView("terminal");
    setSearchOpen(false);
  };

  return (
    <GlassModalWrapper
      isOpen={searchOpen}
      onClose={() => setSearchOpen(false)}
      title="Search Markets & Tokens"
      subtitle="Arc Mainnet Verified Pools & External Feeds"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Search input with autofocus */}
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-muted">
            search
          </span>
          <input
            type="text"
            placeholder="Search pair, symbol, or category (e.g. ETH, EURC, defi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
            className="w-full pl-10 pr-4 py-2.5 rounded-card bg-themed-card border border-themed/40 font-mono text-xs text-themed placeholder:text-muted focus:outline-none focus:border-themed"
          />
        </div>

        {/* Results List */}
        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
          {filteredPairs.map(([key, data]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className="w-full p-2.5 rounded-card card-themed border border-themed/30 hover:border-themed/60 flex items-center justify-between text-left transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded card-themed border border-themed/40 flex items-center justify-center font-mono font-bold text-xs text-themed group-hover:text-pos">
                  {data.base.slice(0, 3)}
                </div>
                <div>
                  <div className="font-display font-bold text-xs text-themed">{key}</div>
                  <div className="font-mono text-[10px] text-muted uppercase tracking-wider">
                    {data.cat}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-xs text-themed">
                  ${data.price < 10 ? data.price.toFixed(4) : data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`font-mono text-[10px] ${
                    data.change >= 0 ? "text-pos" : "text-neg"
                  }`}
                >
                  {data.change >= 0 ? "+" : ""}
                  {data.change.toFixed(2)}%
                </div>
              </div>
            </button>
          ))}
          {filteredPairs.length === 0 && (
            <div className="p-6 text-center font-mono text-xs text-muted">
              No matching pairs found.
            </div>
          )}
        </div>

        {/* Custom Token Action */}
        <div className="pt-2 border-t border-themed/20 flex items-center justify-between">
          <span className="font-mono text-[11px] text-muted">Token not listed?</span>
          <button
            onClick={() => {
              setSearchOpen(false);
              setImportTokenOpen(true);
            }}
            className="font-mono text-xs text-pos hover:underline font-semibold flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[15px]">add_circle</span>
            Import Custom ERC-20
          </button>
        </div>
      </div>
    </GlassModalWrapper>
  );
};

import { Icon } from "../ui/Icon";
import React, { useMemo } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";

export const MarketSearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, searchQuery, setSearchQuery, setPair, setView } =
    useAppStore();

  const filteredPairs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const registered = Object.entries(PAIRS).filter(([, meta]) => !!meta.address && meta.cat !== "imported");
    if (!q) return registered;
    return registered.filter(([key, meta]) => {
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
      title="Choose an Arc route"
      subtitle="Registered Arc assets only · execution still requires a fresh router quote"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Search input with autofocus */}
        <div className="relative">
          <Icon name="search" className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-muted" />
          <input
            type="text"
            placeholder="Search registered Arc asset (e.g. USYC, EURC, ETH)..."
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
                  {data.cat === "imported" ? "—" : "$" + (data.price < 10 ? data.price.toFixed(4) : data.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                </div>
                <div className="font-mono text-[10px] text-muted">{data.cat === "imported" ? "No valuation available" : "Reference value"}</div>
              </div>
            </button>
          ))}
          {filteredPairs.length === 0 && (
            <div className="p-6 text-center font-mono text-xs text-muted">
              No matching pairs found.
            </div>
          )}
        </div>

      </div>
    </GlassModalWrapper>
  );
};

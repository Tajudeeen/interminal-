import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC } from "../../constants/arc";
import { Button } from "../ui/Button";

export const MarketsView: React.FC = () => {
  const {
    setPair,
    setView,
    syncMarketData,
    marketFeedStatus,
    pair,
    environmentMode,
  } = useAppStore();
  const [filter, setFilter] = useState("arc");
  const [query, setQuery] = useState("");
  const [syncing, setSyncing] = useState(false);
  const entries = Object.entries(PAIRS).filter(([key, data]) => {
    const matches = (key + " " + data.base)
      .toLowerCase()
      .includes(query.toLowerCase());
    return (
      matches &&
      ((filter === "arc" && !!data.address && data.cat !== "imported") ||
        (filter === "fx" && data.cat === "rwa_fx" && !!data.address))
    );
  });
  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Route directory</p>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Arc route directory
          </h1>
          <p className="text-sm text-sub mt-2">
            Inspect the registered Arc assets used by Interminal before the execution desk requests a fresh router quote.
          </p>
        </div>
        <Button
          isLoading={syncing}
          onClick={async () => {
            setSyncing(true);
            try {
              await syncMarketData();
            } finally {
              setSyncing(false);
            }
          }}
        >
          Refresh selected reference
        </Button>
      </header>
      <div className="card-themed border border-themed rounded-xl p-4 text-sm text-sub leading-relaxed">
        This directory is supporting evidence, not the product's execution layer.
        A registered token address or reference price does not guarantee liquidity
        or issuer access. Mainnet execution always requests a separate Arc router quote.
      </div>
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {[
            { id: "arc", label: "Registered Arc assets" },
            { id: "fx", label: "Treasury assets" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={`px-3 py-2 rounded-lg border text-xs ${filter === f.id ? "border-lime-500 text-themed" : "border-themed text-sub"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          aria-label="Filter markets"
          placeholder="Search by symbol…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-themed rounded-lg px-3 py-2 text-sm sm:max-w-52"
        />
      </div>
      <div className="card-themed border border-themed rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted text-xs border-b border-themed">
              <tr>
                <th className="p-4">Market</th>
                <th className="p-4">Route</th>
                <th className="p-4 text-right">Price</th>
                <th className="p-4">Price source</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map(([key, data]) => {
                const activeFeed = key === pair && marketFeedStatus.live;
                const registered = !!data.address && data.cat !== "imported";
                const price =
                  data.cat === "imported"
                    ? "—"
                    : `$${data.price.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
                return (
                  <tr
                    key={key}
                    className="border-b border-themed last:border-0 hover:bg-themed-card/40"
                  >
                    <td className="p-4 font-medium whitespace-nowrap">
                      {key}
                      <small className="block text-muted text-xs mt-1">
                        {data.cat === "rwa_fx"
                          ? "FX / treasury"
                          : data.cat === "imported"
                            ? "Imported ERC-20"
                            : "Registered Arc asset"}
                      </small>
                    </td>
                    <td className="p-4 text-xs">
                      {registered ? (
                        <a
                          href={`${ARC.explorer}/address/${data.address}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan hover:underline"
                        >
                          Registered token ↗
                        </a>
                      ) : (
                        <span className="text-muted">View only</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-mono text-xs whitespace-nowrap">
                      {price}
                    </td>
                    <td className="p-4 text-xs text-muted">
                      <span className={activeFeed ? "text-pos" : ""}>
                        {activeFeed
                          ? marketFeedStatus.source
                          : data.cat === "imported"
                            ? "No valuation available"
                            : "Reference · not a live quote"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="xs"
                        onClick={() => {
                          setPair(key);
                          setView("terminal");
                        }}
                      >
                        {environmentMode === "mainnet" && registered
                          ? "Open route"
                          : "Inspect"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!entries.length && (
          <p className="text-center text-sub py-12 text-sm">
            No markets match this filter.
          </p>
        )}
      </div>
      <p className="text-muted text-xs">
        Active feed: {pair} · {marketFeedStatus.source}
        {marketFeedStatus.lastUpdate
          ? ` · checked ${new Date(marketFeedStatus.lastUpdate).toLocaleTimeString()}`
          : ""}
      </p>
    </div>
  );
};

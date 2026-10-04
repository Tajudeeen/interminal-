import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { quoteTrade } from "../../lib/math/quotes";
import { liveSizePresets } from "../../lib/math/liveSizing";
import { calculateJitUnwind } from "../../lib/math/treasury";
import { Timeframe } from "../../types/market";
import { Button } from "../ui/Button";
import { MarketChart } from "../market/MarketChart";

export const TerminalTradeView: React.FC = () => {
  const {
    pair: pairKey,
    side,
    setSide,
    orderType,
    setOrderType,
    amount,
    setAmount,
    slippage,
    setSlippage,
    timeframe,
    setTimeframe,
    chartMode,
    candles,
    indicators,
    marketFeedStatus,
    balances,
    dcaSpendTotal,
    setDcaSpendTotal,
    dcaSliceSize,
    setDcaSliceSize,
    dcaFreqSec,
    setDcaFreqSec,
    startDcaPlan,
    prepareTradeReview,
    runAiAnalysis,
    livePortfolio,
    environmentMode,
    analysis,
    showLevels,
    theme,
    setSearchOpen,
    connectWallet,
  } = useAppStore();

  const p = PAIRS[pairKey] || PAIRS["ETH/USDC"];
  const mainnetReview = environmentMode === "mainnet" && !livePortfolio;

  let quote;
  try {
    quote = quoteTrade({ side, amountUsd: amount, price: p.price, slippageBps: slippage * 100 });
  } catch {
    quote = { received: 0, effective: p.price, impact: 0, minReceived: 0, gasUsd: 0.0012, slippageBps: 50 };
  }

  const isBuy = side === "buy";
  const userBaseBal = balances[p.base] || 0;
  const userUsdcBal = balances.USDC || 0;

  const jit = calculateJitUnwind({
    tradeAmountUsd: amount,
    liquidUsdc: userUsdcBal,
    usycBalance: balances.USYC || 0,
    usycPriceUsd: PAIRS["USYC/USDC"].price,
    slippageBps: slippage * 100,
  });

  // Calculate percentage sizing
  const handlePercentageSize = (pct: number) => {
    if (isBuy) {
      const maxUsdc = Math.max(0, userUsdcBal);
      const targetAmt = livePortfolio
        ? Math.floor((maxUsdc * pct) / 100)
        : Math.max(10, Math.floor((maxUsdc * pct) / 100));
      setAmount(targetAmt);
    } else {
      const maxBaseUsd = Math.max(0, userBaseBal * p.price);
      const targetAmt = livePortfolio
        ? Math.floor((maxBaseUsd * pct) / 100)
        : Math.max(10, Math.floor((maxBaseUsd * pct) / 100));
      setAmount(targetAmt);
    }
  };



  useEffect(() => {
    if (pairKey === "USYC/USDC" && timeframe !== "1D") {
      setTimeframe("1D");
    }
  }, [pairKey, timeframe, setTimeframe]);

  const tfOptions: Timeframe[] = pairKey === "USYC/USDC"
    ? ["1D"]
    : ["1m", "5m", "15m", "1h", "4h", "1D"];
  const availableTradeUsd = isBuy ? userUsdcBal : userBaseBal * p.price;
  const quickSizes = livePortfolio
    ? liveSizePresets(availableTradeUsd)
    : [100, 500, 1000, 2500];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {mainnetReview && (
        <section className="card-themed border border-cyan/30 bg-cyan/5 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="font-display font-black text-sm text-cyan uppercase tracking-wide">Live terminal locked until wallet connect</div>
            <p className="font-mono text-[11px] text-sub mt-1 leading-relaxed">
              Connect to Arc Mainnet to price this trade from your wallet holdings and submit a real EIP-712 ticket. Nothing here is simulated while Mainnet Review is active.
            </p>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={() => connectWallet("mainnet")}
            leftIcon={<span className="material-symbols-outlined text-[15px]">account_balance_wallet</span>}
          >
            Connect Mainnet
          </Button>
        </section>
      )}

      {/* Pair Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-card card-themed border border-themed hover:border-lime-500/50 text-themed group transition-colors"
          >
            <span className="font-display font-black text-lg">{pairKey}</span>
            <span className="material-symbols-outlined text-[16px] text-muted group-hover:text-lime-500 transition-colors">
              unfold_more
            </span>
          </button>
          <div>
            <div className="font-display font-extrabold text-xl text-themed tnum">
              ${p.price < 10 ? p.price.toFixed(4) : p.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`font-mono text-[11px] ${p.change >= 0 ? "text-pos" : "text-neg"}`}>
              {p.change >= 0 ? "+" : ""}
              {p.change.toFixed(2)}% (24h)
            </div>
          </div>
        </div>

        {/* Timeframe & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-card card-themed border border-themed p-0.5">
            {tfOptions.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                timeframe === tf ? "bg-lime-500 text-black font-bold shadow-xs" : "text-muted hover:text-sub"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={runAiAnalysis}
            leftIcon={<span className="material-symbols-outlined text-[15px] text-lime-500">psychology</span>}
          >
            AI Quant
          </Button>
        </div>
      </div>

      {/* Main Grid: Chart + Execution Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Chart Container (Span 2) */}
        <div className="lg:col-span-2 card-themed border border-themed rounded-card p-4 flex flex-col h-[400px] sm:h-[420px] lg:h-[440px] xl:h-[460px]">
          <div className="flex items-center justify-between pb-3 border-b border-themed/30 font-mono text-xs text-muted">
            <div className="flex items-center gap-4">
              <span>High: ${p.high.toFixed(2)}</span>
              <span>Low: ${p.low.toFixed(2)}</span>
              <span className="hidden sm:inline">Vol: ${p.vol.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lime-500">EMA20</span>
              <span className="text-purple-400">EMA50</span>
            </div>
          </div>
          <div className="flex-1 w-full relative mt-2 min-h-[320px]">
            <MarketChart
              key={`${pairKey}:${timeframe}:${chartMode}`}
              candles={candles}
              indicators={indicators}
              chartMode={chartMode}
              theme={theme}
              pair={pairKey}
              timeframe={timeframe}
              showLevels={showLevels}
              analysis={analysis}
              marketFeedStatus={marketFeedStatus}
            />
          </div>
          <div className="pt-2 text-[10px] font-mono text-muted flex items-center justify-between gap-3">
            <span>{marketFeedStatus.live ? "LIVE" : "OFFLINE"} · {marketFeedStatus.source}</span>
            <a
              href="https://www.geckoterminal.com/arc"
              target="_blank"
              rel="noreferrer"
              className="text-cyan hover:underline"
            >
              Market data by GeckoTerminal
            </a>
          </div>
        </div>

        {/* Right Column: Execution Desk (Span 1) */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-4">
          {/* Order Type Tabs: Market vs DCA / TWAP */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-card bg-themed-card/60 border border-themed/40 font-display text-xs font-bold">
            <button
              onClick={() => setOrderType("market")}
              className={`py-1.5 rounded-card transition-colors ${
                orderType === "market"
                  ? "bg-lime-500 text-black font-extrabold shadow-sm"
                  : "text-sub hover:text-themed"
              }`}
            >
              Instant Market
            </button>
            <button
              onClick={() => setOrderType("dca")}
              className={`py-1.5 rounded-card transition-colors ${
                orderType === "dca"
                  ? "bg-lime-500 text-black font-extrabold shadow-sm"
                  : "text-sub hover:text-themed"
              }`}
            >
              DCA / TWAP
            </button>
          </div>

          {/* Buy / Sell Toggle Buttons (Functional side switcher with tactile React Buttons) */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={isBuy ? "pos" : "secondary"}
              size="md"
              onClick={() => setSide("buy")}
              className="uppercase tracking-wider"
            >
              Buy {p.base}
            </Button>
            <Button
              variant={!isBuy ? "danger" : "secondary"}
              size="md"
              onClick={() => setSide("sell")}
              className="uppercase tracking-wider"
            >
              Sell {p.base}
            </Button>
          </div>

          {/* Market Execution Mode */}
          {orderType === "market" && (
            <div className="space-y-4">
              {/* Size Input with Light/Dark Mode Adapting Colors */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-muted mb-1.5">
                  <span>Order Size (USDC)</span>
                  <span>
                    Balance:{" "}
                    {isBuy
                      ? `$${userUsdcBal.toLocaleString()} USDC`
                      : `${userBaseBal.toFixed(4)} ${p.base}`}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-mono text-xs text-muted">$</span>
                  <input
                    type="number"
                    value={amount || ""}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="500"
                    className="w-full pl-7 pr-16 py-2.5 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-sm focus:outline-none focus:border-lime-500 transition-colors"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-muted uppercase">
                    USDC
                  </span>
                </div>
              </div>

              {/* Percentage Size Pills (25%, 50%, 75%, MAX) */}
              <div>
                <div className="flex justify-between text-[10px] font-mono text-muted uppercase mb-1">
                  <span>Allocation Percent</span>
                  <span className={livePortfolio ? "text-cyan-500" : "text-lime-500"}>
                    {livePortfolio ? "Wallet-scaled fill" : "Quick Portfolio Fill"}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handlePercentageSize(pct)}
                      className="py-1 rounded font-mono text-[11px] card-themed border border-themed/30 text-sub hover:text-lime-500 hover:border-lime-500/40 transition-colors"
                    >
                      {pct === 100 ? "MAX" : `${pct}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fixed Dollar Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {quickSizes.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-1 rounded font-mono text-[11px] transition-colors ${
                      amount === val
                        ? "bg-lime-500 text-black font-bold"
                        : "card-themed border border-themed/30 text-sub hover:text-themed hover:border-lime-500/30"
                    }`}
                  >
                    ${val >= 1000 ? `${val / 1000}k` : val}
                  </button>
                ))}
              </div>

              {/* Slippage Band Selector */}
              <div>
                <label className="block text-[11px] font-mono text-muted mb-1.5">
                  Slippage Tolerance Band
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0.1, 0.5, 1.0].map((slipVal) => (
                    <button
                      key={slipVal}
                      type="button"
                      onClick={() => setSlippage(slipVal)}
                      className={`py-1 rounded font-mono text-xs transition-colors ${
                        slippage === slipVal
                          ? "bg-lime-500 text-black font-bold"
                          : "card-themed border border-themed/30 text-sub hover:text-themed hover:border-lime-500/30"
                      }`}
                    >
                      {slipVal}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Output & Route Preview Box */}
              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 space-y-1.5 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted">Estimated Receive:</span>
                  <span className="text-themed font-bold tnum">
                    {isBuy
                      ? `${quote.received.toFixed(5)} ${p.base}`
                      : `$${quote.received.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Guaranteed Minimum:</span>
                  <span className="text-themed tnum">
                    {isBuy
                      ? `${quote.minReceived.toFixed(5)} ${p.base}`
                      : `$${quote.minReceived.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Price Impact:</span>
                  <span className="text-themed font-medium tnum">
                    {(quote.impact * 100).toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted">Settlement Gas:</span>
                  <span className="text-pos font-medium">~$0.0012 USDC</span>
                </div>
              </div>

              {/* JIT Unwind Notice if applicable */}
              {isBuy && jit.needed && (
                <div className="p-2.5 rounded-card bg-amber-500/10 border border-amber-500/30 font-mono text-[11px] text-amber-500 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px]">swap_calls</span>
                  <span>JIT Unwind: ${(jit.shortfall || 0).toFixed(2)} covered by USYC T-Bills.</span>
                </div>
              )}

              {/* Primary Review CTA */}
              <div className="space-y-1.5">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={prepareTradeReview}
                  disabled={!amount || amount <= 0}
                  leftIcon={<span className="material-symbols-outlined text-[18px]">{livePortfolio ? "verified" : "science"}</span>}
                >
                  {livePortfolio ? "Execute on Arc Mainnet" : mainnetReview ? "Connect Wallet to Trade" : "Simulate Trade"}
                </Button>
                <div className="flex flex-col gap-1 px-1 text-[10px] font-mono text-muted pt-1 border-t border-themed/20">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pos" />
                      Zero-Custody EIP-712
                    </span>
                    <span>{livePortfolio ? "Est. gas: ~$0.0012 USDC" : mainnetReview ? "Connect wallet for live gas estimate" : "Gas: ~$0.0012 USDC"}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted/80">
                    <span>Arc Settlement:</span>
                    <a
                      href={`${ARC.explorer}/address/${ARC.settlement}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>{shortAddr(ARC.settlement)}</span>
                      <span className="material-symbols-outlined text-[10px]">open_in_new</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DCA / TWAP Execution Mode */}
          {orderType === "dca" && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-muted mb-1.5">
                  Total Allocation Budget (USDC)
                </label>
                <input
                  type="number"
                  value={dcaSpendTotal || ""}
                  onChange={(e) => setDcaSpendTotal(Number(e.target.value))}
                  placeholder="500"
                  className="w-full px-3 py-2 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-xs focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted mb-1.5">
                  Slice Size per Interval (USDC)
                </label>
                <input
                  type="number"
                  value={dcaSliceSize || ""}
                  onChange={(e) => setDcaSliceSize(Number(e.target.value))}
                  placeholder="50"
                  className="w-full px-3 py-2 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-xs focus:outline-none focus:border-lime-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-muted mb-1.5">
                  Execution Cadence
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "1m", sec: 60 },
                    { label: "5m", sec: 300 },
                    { label: "1h", sec: 3600 },
                    { label: "1d", sec: 86400 },
                  ].map((cad) => (
                    <button
                      key={cad.label}
                      type="button"
                      onClick={() => setDcaFreqSec(cad.sec)}
                      className={`py-1 rounded font-mono text-xs transition-colors ${
                        dcaFreqSec === cad.sec
                          ? "bg-lime-500 text-black font-bold"
                          : "card-themed border border-themed/30 text-sub hover:text-themed hover:border-lime-500/30"
                      }`}
                    >
                      {cad.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 font-mono text-xs space-y-1 text-muted">
                <div className="text-themed font-semibold">Autonomous TWAP Breakdown:</div>
                <div>Total Slices: {Math.max(1, Math.floor(dcaSpendTotal / (dcaSliceSize || 1)))} fills</div>
                <div>Frequency: Every {dcaFreqSec >= 3600 ? `${dcaFreqSec / 3600}h` : `${dcaFreqSec / 60}m`}</div>
                <div>Gov: Zero-custody EIP-712 scoped permit</div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={startDcaPlan}
                leftIcon={<span className="material-symbols-outlined text-[18px]">schedule</span>}
              >
                Authorize Autonomous DCA
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

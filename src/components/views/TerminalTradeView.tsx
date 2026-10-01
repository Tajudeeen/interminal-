import React, { useRef, useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { quoteTrade } from "../../lib/math/quotes";
import { calculateJitUnwind } from "../../lib/math/treasury";
import { Timeframe } from "../../types/market";

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
    candles,
    indicators,
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
    analysis,
    showLevels,
    theme,
    setSearchOpen,
  } = useAppStore();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const p = PAIRS[pairKey] || PAIRS["ETH/USDC"];

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
    slippageBps: slippage * 100,
  });

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles.length) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const isDark = theme === "dark";
    ctx.fillStyle = isDark ? "#080808" : "#FBFBFB";
    ctx.fillRect(0, 0, w, h);

    const padR = 64;
    const padB = 22;
    const padT = 12;
    const padL = 8;

    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    let min = Math.min(...lows);
    let max = Math.max(...highs);

    if (showLevels && analysis) {
      min = Math.min(min, analysis.support);
      max = Math.max(max, analysis.resistance);
    }
    const span = max - min || 1;

    const x = (i: number) => padL + (i / (candles.length - 1)) * (w - padL - padR);
    const y = (price: number) => padT + (1 - (price - min) / span) * (h - padT - padB);

    // Grid lines
    ctx.strokeStyle = isDark ? "#222222" : "#E5E5E5";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const yy = padT + ((h - padT - padB) * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padL, yy);
      ctx.lineTo(w - padR, yy);
      ctx.stroke();

      const px = max - (span * i) / 4;
      ctx.fillStyle = isDark ? "#888888" : "#666666";
      ctx.font = "10px monospace";
      ctx.fillText(`$${px.toFixed(2)}`, w - padR + 6, yy + 3);
    }

    // Indicators (EMA20, EMA50)
    if (indicators?.series) {
      const paintEma = (arr: number[], color: string) => {
        ctx.beginPath();
        arr.forEach((v, i) => {
          const xx = x(i);
          const yy = y(v);
          if (i === 0) ctx.moveTo(xx, yy);
          else ctx.lineTo(xx, yy);
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      };
      if (indicators.series.e20) paintEma(indicators.series.e20, "#00F0FF");
      if (indicators.series.e50) paintEma(indicators.series.e50, "#C084FC");
    }

    // Support & Resistance Levels
    if (showLevels && analysis) {
      const drawLevel = (price: number, color: string, label: string) => {
        const yy = y(price);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(padL, yy);
        ctx.lineTo(w - padR, yy);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = color;
        ctx.font = "bold 9px monospace";
        ctx.fillText(label, w - padR + 6, yy - 2);
      };
      drawLevel(analysis.resistance, "#EF4444", "RESIST");
      drawLevel(analysis.support, "#10B981", "SUPPORT");
    }

    // Candles
    const candleWidth = Math.max(2, ((w - padL - padR) / candles.length) * 0.7);
    candles.forEach((c, i) => {
      const xx = x(i);
      const isUp = c.close >= c.open;
      const color = isUp ? "#10B981" : "#EF4444";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xx, y(c.high));
      ctx.lineTo(xx, y(c.low));
      ctx.stroke();

      // Body
      const top = y(Math.max(c.open, c.close));
      const bot = y(Math.min(c.open, c.close));
      const height = Math.max(1, bot - top);
      ctx.fillStyle = color;
      ctx.fillRect(xx - candleWidth / 2, top, candleWidth, height);
    });
  }, [candles, indicators, showLevels, analysis, theme]);

  const tfOptions: Timeframe[] = ["1m", "5m", "15m", "1h", "4h", "1D"];
  const quickSizes = [100, 250, 500, 1000];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Pair Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-card card-themed border border-themed hover:border-themed text-themed group"
          >
            <span className="font-display font-black text-lg">{pairKey}</span>
            <span className="material-symbols-outlined text-[16px] text-muted group-hover:text-themed">
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
                  timeframe === tf ? "bg-themed-card text-themed font-bold shadow-xs" : "text-muted hover:text-sub"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button
            onClick={runAiAnalysis}
            className="px-3 py-1.5 rounded-card card-themed border border-themed text-xs font-mono text-sub hover:text-themed flex items-center gap-1.5 transition-colors"
          >
            <span className="material-symbols-outlined text-[15px] text-pos">psychology</span>
            <span>AI Quant</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chart + Execution Desk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Chart Container (Span 2) */}
        <div className="lg:col-span-2 card-themed border border-themed rounded-card p-4 flex flex-col h-[460px] sm:h-[500px]">
          <div className="flex items-center justify-between pb-3 border-b border-themed/30 font-mono text-xs text-muted">
            <div className="flex items-center gap-4">
              <span>High: ${p.high.toFixed(2)}</span>
              <span>Low: ${p.low.toFixed(2)}</span>
              <span className="hidden sm:inline">Vol: ${p.vol.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#00F0FF]">EMA20</span>
              <span className="text-[#C084FC]">EMA50</span>
            </div>
          </div>
          <div className="flex-1 w-full relative mt-2">
            <canvas ref={canvasRef} className="w-full h-full block rounded" />
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
                  ? "bg-text text-bg shadow-sm"
                  : "text-sub hover:text-themed"
              }`}
            >
              Instant Market
            </button>
            <button
              onClick={() => setOrderType("dca")}
              className={`py-1.5 rounded-card transition-colors ${
                orderType === "dca"
                  ? "bg-text text-bg shadow-sm"
                  : "text-sub hover:text-themed"
              }`}
            >
              DCA / TWAP
            </button>
          </div>

          {/* Buy / Sell Toggle Buttons (Functional side switcher) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("buy")}
              className={`py-2 rounded-card font-display font-extrabold text-xs tracking-wider uppercase transition-all ${
                side === "buy"
                  ? "bg-pos text-black shadow-md font-black"
                  : "card-themed border border-themed/40 text-sub hover:text-themed"
              }`}
            >
              Buy {p.base}
            </button>
            <button
              onClick={() => setSide("sell")}
              className={`py-2 rounded-card font-display font-extrabold text-xs tracking-wider uppercase transition-all ${
                side === "sell"
                  ? "bg-neg text-white shadow-md font-black"
                  : "card-themed border border-themed/40 text-sub hover:text-themed"
              }`}
            >
              Sell {p.base}
            </button>
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
                    className="w-full pl-7 pr-16 py-2 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-sm focus:outline-none focus:border-themed transition-colors"
                  />
                  <span className="absolute right-3 top-2.5 font-mono text-xs text-muted uppercase">
                    USDC
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                {quickSizes.map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className={`py-1 rounded font-mono text-[11px] transition-colors ${
                      amount === val
                        ? "bg-text text-bg font-bold"
                        : "card-themed border border-themed/30 text-sub hover:text-themed"
                    }`}
                  >
                    ${val}
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
                          ? "bg-text text-bg font-bold"
                          : "card-themed border border-themed/30 text-sub hover:text-themed"
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

              {/* Primary CTA */}
              <button
                onClick={prepareTradeReview}
                disabled={!amount || amount <= 0}
                className="w-full py-3 rounded-card bg-text text-bg font-display font-black text-xs uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                Review EIP-712 Order
              </button>
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
                  className="w-full px-3 py-2 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-xs focus:outline-none focus:border-themed"
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
                  className="w-full px-3 py-2 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-xs focus:outline-none focus:border-themed"
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
                          ? "bg-text text-bg font-bold"
                          : "card-themed border border-themed/30 text-sub hover:text-themed"
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

              <button
                onClick={startDcaPlan}
                className="w-full py-3 rounded-card bg-text text-bg font-display font-black text-xs uppercase tracking-wider transition-opacity hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                Authorize Autonomous DCA
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

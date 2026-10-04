import React, { useEffect, useRef } from "react";
import {
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  createChart,
  ColorType,
  LineStyle,
} from "lightweight-charts";
import type { Candle, ChartMode, Indicators } from "../../types/market";

interface MarketChartProps {
  candles: Candle[];
  indicators: Indicators | null;
  chartMode: ChartMode;
  theme: "dark" | "light";
  pair: string;
  showLevels: boolean;
  analysis: {
    support: number;
    resistance: number;
  } | null;
  marketFeedStatus: {
    source: string;
    live: boolean;
    lastUpdate: number | null;
    error: string | null;
  };
}

const fmtPrice = (value: number, pair: string) => {
  if (pair === "USYC/USDC") return value.toFixed(6);
  if (value < 10) return value.toFixed(4);
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const MarketChart: React.FC<MarketChartProps> = ({
  candles,
  indicators,
  chartMode,
  theme,
  pair,
  showLevels,
  analysis,
  marketFeedStatus,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !candles.length) return;

    const isDark = theme === "dark";
    const textColor = isDark ? "#8B8B8B" : "#666666";
    const gridColor = isDark ? "rgba(255,255,255,0.055)" : "rgba(0,0,0,0.055)";
    const background = isDark ? "#080808" : "#FBFBFB";

    const chart = createChart(container, {
      width: container.clientWidth,
      height: Math.max(280, container.clientHeight),
      layout: {
        background: { type: ColorType.Solid, color: background },
        textColor,
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: gridColor },
        horzLines: { color: gridColor },
      },
      crosshair: {
        vertLine: {
          color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#111111",
        },
        horzLine: {
          color: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#111111",
        },
      },
      rightPriceScale: {
        borderColor: gridColor,
        scaleMargins: { top: 0.08, bottom: 0.22 },
      },
      timeScale: {
        borderColor: gridColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      localization: {
        priceFormatter: (value: number) =>
          pair === "USYC/USDC"
            ? "$" + value.toFixed(6)
            : value >= 1000
              ? "$" + value.toLocaleString("en-US", { maximumFractionDigits: 2 })
              : "$" + value.toFixed(4),
      },
    });

    const mainSeries =
      pair === "USYC/USDC" || chartMode === "line"
        ? chart.addSeries(LineSeries, {
            color: "#10B981",
            lineWidth: 2,
            lastValueVisible: true,
            priceLineVisible: true,
            crosshairMarkerVisible: true,
          })
        : chart.addSeries(CandlestickSeries, {
            upColor: "#10B981",
            downColor: "#EF4444",
            borderUpColor: "#10B981",
            borderDownColor: "#EF4444",
            wickUpColor: "#10B981",
            wickDownColor: "#EF4444",
          });

    if (pair === "USYC/USDC" || chartMode === "line") {
      mainSeries.setData(
        candles.map((c) => ({
          time: Math.floor(c.time / 1000),
          value: c.close,
        })),
      );
    } else {
      mainSeries.setData(
        candles.map((c) => ({
          time: Math.floor(c.time / 1000),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
    }

    if (indicators?.series) {
      const ema20 = chart.addSeries(LineSeries, {
        color: isDark ? "#00F0FF" : "#0284C7",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });
      const ema50 = chart.addSeries(LineSeries, {
        color: isDark ? "#C084FC" : "#A855F7",
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
      });

      const times = candles.map((c) => Math.floor(c.time / 1000));
      ema20.setData(
        indicators.series.e20
          .map((value, i) => ({ time: times[i], value }))
          .filter((item) => Number.isFinite(item.value)),
      );
      ema50.setData(
        indicators.series.e50
          .map((value, i) => ({ time: times[i], value }))
          .filter((item) => Number.isFinite(item.value)),
      );
    }

    const volumeScale = "volume";
    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: volumeScale,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chart.priceScale(volumeScale).applyOptions({
      scaleMargins: { top: 0.82, bottom: 0.02 },
      visible: false,
    });

    volume.setData(
      candles.map((c) => ({
        time: Math.floor(c.time / 1000),
        value: Math.max(0, c.volume || 0),
        color: c.close >= c.open ? "rgba(16,185,129,0.28)" : "rgba(239,68,68,0.22)",
      })),
    );

    if (showLevels && analysis && "createPriceLine" in mainSeries) {
      mainSeries.createPriceLine({
        price: analysis.resistance,
        color: "#EF4444",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "RESIST",
      });
      mainSeries.createPriceLine({
        price: analysis.support,
        color: "#10B981",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "SUPPORT",
      });
    }

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth) return;
      chart.resize(container.clientWidth, Math.max(280, container.clientHeight));
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [candles, indicators, chartMode, theme, pair, showLevels, analysis]);

  return (
    <div className="relative h-full min-h-[300px]">
      <div ref={containerRef} className="absolute inset-0" />
      {!candles.length && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center pointer-events-none">
          <div className="max-w-sm rounded-card border border-themed/40 bg-themed-card/80 px-4 py-3 font-mono text-[11px] text-muted">
            <div className="text-themed font-bold mb-1">No synthetic chart data</div>
            <div>{marketFeedStatus.error || "Waiting for live market data..."}</div>
          </div>
        </div>
      )}
      <div className="absolute left-2 top-2 z-10 pointer-events-none">
        <div className="rounded px-2 py-1 bg-black/70 border border-white/10 backdrop-blur-sm font-mono text-[10px]">
          <div className="text-white font-bold">{marketFeedStatus.live ? "LIVE" : "OFFLINE"}</div>
          <div className="text-neutral-400">{marketFeedStatus.source}</div>
        </div>
      </div>
      <div className="absolute right-2 top-2 z-10 pointer-events-none">
        <div className="rounded px-2 py-1 bg-black/70 border border-white/10 backdrop-blur-sm font-mono text-[10px] text-neutral-400">
          {pair === "USYC/USDC" ? "NAV · DAILY" : "OHLCV"}
        </div>
      </div>
    </div>
  );
};

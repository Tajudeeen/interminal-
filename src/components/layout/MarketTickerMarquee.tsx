import React from "react";
import { PAIRS } from "../../constants/pairs";
import { useAppStore } from "../../store/useAppStore";

export const MarketTickerMarquee: React.FC = () => {
  const { setPair, setView } = useAppStore();

  const tickers = [
    {
      pair: "ETH/USDC",
      price: `$${PAIRS["ETH/USDC"]?.price.toFixed(2) || "2,481.42"}`,
      change: `${PAIRS["ETH/USDC"]?.change >= 0 ? "+" : ""}${PAIRS["ETH/USDC"]?.change.toFixed(2)}%`,
      isUp: (PAIRS["ETH/USDC"]?.change || 0) >= 0,
    },
    {
      pair: "BTC/USDC",
      price: `$${PAIRS["BTC/USDC"]?.price.toLocaleString("en-US", { maximumFractionDigits: 1 }) || "64,210"}`,
      change: `${PAIRS["BTC/USDC"]?.change >= 0 ? "+" : ""}${PAIRS["BTC/USDC"]?.change.toFixed(2)}%`,
      isUp: (PAIRS["BTC/USDC"]?.change || 0) >= 0,
    },
    {
      pair: "EURC/USDC",
      price: `${PAIRS["EURC/USDC"]?.price.toFixed(4) || "1.0845"}`,
      change: `${PAIRS["EURC/USDC"]?.change >= 0 ? "+" : ""}${PAIRS["EURC/USDC"]?.change.toFixed(2)}%`,
      isUp: (PAIRS["EURC/USDC"]?.change || 0) >= 0,
    },
    {
      pair: "USYC T-BILLS",
      price: `4.95% APY`,
      change: "PAR SECURED",
      isUp: true,
      customClass: "text-amber-500 font-bold",
    },
    {
      pair: "ARC GAS",
      price: "0.0012 USDC",
      change: "SUB-CENT",
      isUp: true,
      customClass: "text-pos",
    },
    {
      pair: "ARC MAINNET",
      price: "CHAIN 5042",
      change: "VERIFIED",
      isUp: true,
    },
  ];

  const duplicatedTickers = [...tickers, ...tickers];

  return (
    <div className="w-full bg-themed-card/40 border-b border-themed overflow-hidden py-1.5 px-2 select-none">
      <div className="flex w-max animate-marquee space-x-8">
        {duplicatedTickers.map((item, idx) => (
          <div
            key={idx}
            onClick={() => {
              if (PAIRS[item.pair]) {
                setPair(item.pair);
                setView("terminal");
              }
            }}
            className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity font-mono text-[11px]"
          >
            <span className="text-sub font-semibold">{item.pair}</span>
            <span className={`text-themed ${item.customClass || ""}`}>{item.price}</span>
            <span
              className={`text-[10px] px-1 py-0.2 rounded ${
                item.isUp ? "text-pos bg-pos/10" : "text-neg bg-neg/10"
              }`}
            >
              {item.change}
            </span>
            <span className="text-muted/40 ml-4">/</span>
          </div>
        ))}
      </div>
    </div>
  );
};

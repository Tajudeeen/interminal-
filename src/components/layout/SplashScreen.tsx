import React, { useEffect, useState } from "react";
import { Logo } from "../ui/Logo";

interface SplashScreenProps {
  onComplete: () => void;
  durationMs?: number; // defaults to 2000ms (2 seconds)
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 2000,
}) => {
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const [statusText, setStatusText] = useState("Connecting to Arc Mainnet (Chain 5042)...");

  useEffect(() => {
    const startTime = performance.now();
    const intervalMs = 25;

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (pct > 65) {
        setStatusText("14 Fail-closed security gates active · Ready");
      } else if (pct > 30) {
        setStatusText("Syncing automated 4.95% USYC T-Bill sweeps...");
      }

      if (elapsed >= durationMs) {
        clearInterval(timer);
        setIsExiting(true);
        setTimeout(() => {
          onComplete();
        }, 350); // slight fade-out buffer
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [durationMs, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center surface-themed select-none transition-all duration-300 ${
        isExiting ? "opacity-0 pointer-events-none scale-102" : "opacity-100 scale-100"
      }`}
      style={{
        backgroundImage:
          "radial-gradient(circle at center, rgba(0, 240, 255, 0.08) 0%, transparent 65%)",
      }}
    >
      {/* Background Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm w-full">
        {/* Animated Emblem */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-2xl bg-cyan/20 blur-xl animate-pulse" />
          <div className="relative card-themed border border-themed/80 rounded-2xl p-4 shadow-xl">
            <Logo size={56} />
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex items-center gap-2 mb-2">
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-themed">
            INTERMINAL
          </h1>
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan/15 text-cyan border border-cyan/30 tracking-wider">
            ARC 5042
          </span>
        </div>

        {/* Tagline */}
        <p className="font-display text-sm sm:text-base text-sub font-medium max-w-xs leading-snug">
          The autonomous treasury desk for <span className="text-shimmer font-semibold">Arc</span>.
        </p>

        {/* Sub-tagline */}
        <p className="font-mono text-[11px] text-muted tracking-wider uppercase mt-1.5">
          Continuous Cash Sweeps · EIP-712 Mandates
        </p>

        {/* Progress Bar & Telemetry Status */}
        <div className="mt-8 w-full max-w-[260px] space-y-2">
          <div className="w-full h-1 bg-themed-card rounded-full overflow-hidden border border-themed/40">
            <div
              className="h-full bg-cyan transition-all ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 8px rgba(0, 240, 255, 0.7)",
              }}
            />
          </div>
          <div className="font-mono text-[10px] text-muted tracking-tight truncate">
            {statusText}
          </div>
        </div>
      </div>
    </div>
  );
};

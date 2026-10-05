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
  const [statusText, setStatusText] = useState("Opening your treasury workspace…");

  useEffect(() => {
    const startTime = performance.now();
    const intervalMs = 20;

    const timer = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);

      if (pct > 70) {
        setStatusText("Workspace ready");
      } else if (pct > 35) {
        setStatusText("Loading treasury controls…");
      }

      if (elapsed >= durationMs) {
        clearInterval(timer);
        setIsExiting(true);
        setTimeout(() => {
          onComplete();
        }, 350); // smooth fade-out buffer
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [durationMs, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#050608] select-none transition-all duration-300 overflow-hidden ${
        isExiting ? "opacity-0 pointer-events-none scale-102" : "opacity-100 scale-100"
      }`}
    >
      {/* Ambient Radial Glowing Orbs for Glass Refraction */}
      <div className="absolute top-1/4 left-1/3 w-80 sm:w-96 h-80 sm:h-96 rounded-full bg-lime-500/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/3 w-72 sm:w-80 h-72 sm:h-80 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

      {/* Subtle Geometric Mesh Background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Central Glassmorphic Floating Panel */}
      <div className="relative z-10 flex flex-col items-center text-center p-7 sm:p-9 max-w-sm sm:max-w-md w-[90%] rounded-3xl backdrop-blur-2xl bg-[#0c0e14]/70 border border-white/[0.12] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(0,240,255,0.08),inset_0_1px_1px_rgba(255,255,255,0.18)]">
        {/* Glassmorphic Logo Container */}
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-2xl bg-lime-500/30 blur-lg animate-pulse" />
          <div className="relative rounded-2xl p-4 backdrop-blur-xl bg-white/[0.05] border border-white/[0.18] shadow-[0_8px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.25)]">
            <Logo size={60} />
          </div>
        </div>

        {/* Brand Name */}
        <div className="flex items-center gap-2 mb-1.5">
          <h1 className="font-display font-black text-2xl sm:text-3xl tracking-wider text-white">
            INTERMINAL
          </h1>
          <span className="font-mono text-[9px] font-bold px-2 py-0.5 rounded-full bg-lime-500/20 text-lime-500 border border-lime-500/40 tracking-wider">
            ARC 5042
          </span>
        </div>

        {/* Tagline */}
        <p className="font-display text-sm sm:text-base text-neutral-300 font-medium max-w-xs leading-snug">
          The autonomous treasury desk for <span className="text-shimmer font-semibold">Arc</span>.
        </p>

        {/* Sub-tagline */}
        <p className="font-mono text-[10px] text-neutral-400 tracking-widest uppercase mt-2">
          Continuous Cash Sweeps · EIP-712 Mandates
        </p>

        {/* Glassmorphic Progress Bar & Telemetry */}
        <div className="mt-7 w-full max-w-[280px] space-y-2">
          <div className="w-full h-1.5 rounded-full overflow-hidden backdrop-blur-md bg-white/[0.08] border border-white/[0.12]">
            <div
              className="h-full bg-gradient-to-r from-cyan to-emerald-400 transition-all ease-out"
              style={{
                width: `${progress}%`,
                boxShadow: "0 0 10px rgba(0, 240, 255, 0.8)",
              }}
            />
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] text-neutral-400 px-0.5">
            <span className="truncate max-w-[200px]">{statusText}</span>
            <span className="text-lime-500 font-bold tnum">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";

export const CapitalFlowDiagram: React.FC = () => {
  const { balances, targetBufferUsd } = useAppStore();

  const liquidUsdc = balances.USDC || 0;
  const usycBalance = balances.USYC || 0;
  const excessCash = Math.max(0, liquidUsdc - targetBufferUsd);

  return (
    <div className="card-themed border border-themed rounded-card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-lime-500 font-bold">
            Treasury Policy Flow
          </div>
          <h3 className="font-display font-bold text-base text-themed mt-0.5">
            Arc Continuous Treasury Capital Flow
          </h3>
        </div>
        <div className="font-mono text-xs text-muted">
          Arc Chain ID 5042 · Sub-cent Settlement
        </div>
      </div>

      {/* Interactive Flow Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Node 1: Corporate Inflow */}
        <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/40 relative group hover:border-lime-500/50 transition-colors">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase">
            <span>Stage 1</span>
            <span className="material-symbols-outlined text-[16px] text-lime-500">payments</span>
          </div>
          <div className="font-display font-bold text-sm text-themed mt-1">Operating Buffer</div>
          <div className="font-mono text-lg font-black text-themed mt-0.5 tnum">
            ${liquidUsdc.toLocaleString()} USDC
          </div>
          <div className="font-mono text-[10px] text-pos mt-1">
            Target Reserve: ${targetBufferUsd.toLocaleString()}
          </div>
        </div>

        {/* Node 2: Yield Sweep Engine */}
        <div className="p-3.5 rounded-card bg-lime-500/5 border border-lime-500/30 relative group hover:border-lime-500/60 transition-colors">
          <div className="flex items-center justify-between text-lime-500 text-[10px] font-mono uppercase font-bold">
            <span>Stage 2 · Sweep</span>
            <span className="material-symbols-outlined text-[16px] text-lime-500 animate-pulse">trending_up</span>
          </div>
          <div className="font-display font-bold text-sm text-lime-500 mt-1">4.95% USYC T-Bills</div>
          <div className="font-mono text-lg font-black text-pos mt-0.5 tnum">
            ${usycBalance.toLocaleString()} USYC
          </div>
          <div className="font-mono text-[10px] text-lime-500 mt-1">
            {excessCash > 0 ? `Ready to Sweep: $${excessCash.toLocaleString()}` : "100% Cash Optimized"}
          </div>
        </div>

        {/* Node 3: JIT Unwind Bridge */}
        <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/40 relative group hover:border-lime-500/50 transition-colors">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase">
            <span>Stage 3 · JIT</span>
            <span className="material-symbols-outlined text-[16px] text-amber-500">swap_calls</span>
          </div>
          <div className="font-display font-bold text-sm text-themed mt-1">USYC/USDC Rebalance</div>
          <div className="font-mono text-lg font-black text-themed mt-0.5 tnum">
            $1.00 : $1.00
          </div>
          <div className="font-mono text-[10px] text-muted mt-1">
            Zero slippage T-Bill redemption
          </div>
        </div>

        {/* Node 4: Arc Settlement Contract */}
        <div className="p-3.5 rounded-card bg-pos/5 border border-pos/30 relative group hover:border-pos/60 transition-colors">
          <div className="flex items-center justify-between text-pos text-[10px] font-mono uppercase font-bold">
            <span>Stage 4 · Finality</span>
            <span className="material-symbols-outlined text-[16px] text-pos">gavel</span>
          </div>
          <div className="font-display font-bold text-sm text-pos mt-1">Arc Settlement</div>
          <div className="font-mono text-sm font-bold text-themed mt-1 truncate">
            {shortAddr(ARC.settlement)}
          </div>
          <div className="font-mono text-[10px] text-pos mt-1">
            Chain 5042 · Gas ~$0.0012
          </div>
        </div>
      </div>
    </div>
  );
};

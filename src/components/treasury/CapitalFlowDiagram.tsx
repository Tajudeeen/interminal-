import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC, USYC_APY } from "../../constants/arc";
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
            Treasury decision flow
          </h3>
        </div>
        <div className="font-mono text-xs text-muted">
          Arc Chain ID 5042 · Manual review before execution
        </div>
      </div>

      {/* Interactive Flow Nodes */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 relative">
        {/* Node 1: Corporate Inflow */}
        <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/40 relative group hover:border-lime-500/50 transition-colors">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase">
            <span>Stage 1</span>
            <Icon name="payments" className="material-symbols-outlined text-[16px] text-lime-500" />
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
            <Icon name="trending_up" className="material-symbols-outlined text-[16px] text-lime-500 animate-pulse" />
          </div>
          <div className="font-display font-bold text-sm text-lime-500 mt-1">{(USYC_APY * 100).toFixed(3)}% USYC reference</div>
          <div className="font-mono text-lg font-black text-pos mt-0.5 tnum">
            {usycBalance.toLocaleString()} USYC
          </div>
          <div className="font-mono text-[10px] text-lime-500 mt-1">
            {excessCash > 0 ? `Ready to Sweep: $${excessCash.toLocaleString()}` : "Cash is within buffer"}
          </div>
        </div>

        {/* Node 3: JIT Unwind Bridge */}
        <div className="p-3.5 rounded-card bg-themed-card/50 border border-themed/40 relative group hover:border-lime-500/50 transition-colors">
          <div className="flex items-center justify-between text-muted text-[10px] font-mono uppercase">
            <span>Stage 3 · Unwind</span>
            <Icon name="swap_calls" className="material-symbols-outlined text-[16px] text-amber-500" />
          </div>
          <div className="font-display font-bold text-sm text-themed mt-1">USYC/USDC Rebalance</div>
          <div className="font-mono text-lg font-black text-themed mt-0.5 tnum">
            1 USYC ≈ ${PAIRS["USYC/USDC"].price.toFixed(6)} USDC
          </div>
          <div className="font-mono text-[10px] text-muted mt-1">
            NAV reference · review a router quote
          </div>
        </div>

        {/* Node 4: Arc Settlement Contract */}
        <div className="p-3.5 rounded-card bg-pos/5 border border-pos/30 relative group hover:border-pos/60 transition-colors">
          <div className="flex items-center justify-between text-pos text-[10px] font-mono uppercase font-bold">
            <span>Stage 4 · Finality</span>
            <Icon name="gavel" className="material-symbols-outlined text-[16px] text-pos" />
          </div>
          <div className="font-display font-bold text-sm text-pos mt-1">Arc Settlement</div>
          <div className="font-mono text-sm font-bold text-themed mt-1 truncate">
            {shortAddr(ARC.settlement)}
          </div>
          <div className="font-mono text-[10px] text-pos mt-1">
            Chain 5042 · Wallet estimates gas
          </div>
        </div>
      </div>
    </div>
  );
};

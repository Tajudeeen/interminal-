import React from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { calculateJitUnwind } from "../../lib/math/treasury";
import { Button } from "../ui/Button";

export const ReviewTradeModal: React.FC = () => {
  const {
    reviewOpen,
    setReviewOpen,
    pendingQuote,
    pair: pairKey,
    side,
    amount,
    balances,
    slippage,
    executeTrade,
    executing,
    livePortfolio,
  } = useAppStore();

  if (!pendingQuote) return null;
  const p = PAIRS[pairKey];

  const jit = calculateJitUnwind({
    tradeAmountUsd: amount,
    liquidUsdc: balances.USDC || 0,
    usycBalance: balances.USYC || 0,
    slippageBps: slippage * 100,
  });

  return (
    <GlassModalWrapper
      isOpen={reviewOpen}
      onClose={() => setReviewOpen(false)}
      title="Review EIP-712 Order"
      subtitle={`Zero-Custody Execution · ${side.toUpperCase()} ${pairKey}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Order Summary Card */}
        <div className="p-4 rounded-card card-themed border border-themed/40 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-xs text-sub">You Pay</span>
            <span className="font-display font-extrabold text-lg text-themed tnum">
              {side === "buy" ? `$${amount.toLocaleString()} USDC` : `${(amount / p.price).toFixed(4)} ${p.base}`}
            </span>
          </div>
          <div className="flex justify-between items-baseline pt-2 border-t border-themed/20">
            <span className="font-mono text-xs text-sub">Estimated Output</span>
            <span className="font-display font-extrabold text-xl text-pos tnum">
              {side === "buy"
                ? `${pendingQuote.received.toFixed(5)} ${p.base}`
                : `$${pendingQuote.received.toLocaleString()} USDC`}
            </span>
          </div>
        </div>

        {/* Detailed Execution Parameters */}
        <div className="p-3.5 rounded-card bg-themed-card/40 border border-themed/20 space-y-2 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Effective Rate:</span>
            <span className="text-themed font-medium tnum">${pendingQuote.effective.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Guaranteed Minimum:</span>
            <span className="text-themed font-medium tnum">
              {side === "buy"
                ? `${pendingQuote.minReceived.toFixed(5)} ${p.base}`
                : `$${pendingQuote.minReceived.toFixed(2)} USDC`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Max Slippage Band:</span>
            <span className="text-themed">{slippage}% ({pendingQuote.slippageBps} bps)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Price Impact:</span>
            <span className="text-themed">{(pendingQuote.impact * 100).toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Network Gas Fee:</span>
            <span className="text-pos">${pendingQuote.gasUsd} USDC</span>
          </div>
        </div>

        {/* JIT Unwind notice if buy and liquid is short */}
        {side === "buy" && jit.needed && (
          <div className="p-3 rounded-card bg-amber-500/10 border border-amber-500/30 font-mono text-xs text-amber-500 flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] shrink-0 mt-0.5">swap_calls</span>
            <div>
              <div className="font-semibold uppercase tracking-wider">JIT USYC Liquidity Auto-Bridge</div>
              <div className="text-[11px] text-amber-500/80 mt-0.5">
                ${(jit.shortfall || 0).toFixed(2)} deficit covered by instant par redemption of USYC T-Bills.
              </div>
            </div>
          </div>
        )}

        {/* Cryptographic Verification Details Box */}
        <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-themed font-semibold border-b border-themed/20 pb-1.5">
            <span className="flex items-center gap-1.5 text-pos">
              <span className="material-symbols-outlined text-[15px]">verified</span>
              <span>Cryptographic Verification</span>
            </span>
            <span className="text-[10px] text-muted">EIP-712 Standard</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-muted">
            <div>
              <span className="block text-[10px] uppercase text-muted/70">Verifying Contract</span>
              <a
                href={`${ARC.explorer}/address/${ARC.settlement}`}
                target="_blank"
                rel="noreferrer"
                className="text-cyan hover:underline inline-flex items-center gap-1 font-bold"
              >
                <span>{shortAddr(ARC.settlement)}</span>
                <span className="material-symbols-outlined text-[11px]">open_in_new</span>
              </a>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-muted/70">Arc Chain ID</span>
              <span className="text-themed font-bold">5042 (Mainnet)</span>
            </div>
          </div>

          <div>
            <span className="block text-[10px] uppercase text-muted/70">Domain Separator</span>
            <div className="text-[10px] text-muted truncate bg-themed/5 p-1 rounded font-mono select-all">
              0x9d8bb4d79ceb4795b26f8c3265ae5aac5492046989e8b74bc2b04d2c1853b190
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-themed/10">
            <span>Custody: Non-custodial</span>
            <span className="text-pos">Fail-Closed Authorization</span>
          </div>
        </div>

        {/* Sign Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={executeTrade}
          isLoading={executing}
          leftIcon={<span className="material-symbols-outlined text-[18px]">draw</span>}
        >
          {livePortfolio ? "Sign EIP-712 Permit in Wallet" : "Sign & Generate Audit Certificate"}
        </Button>
      </div>
    </GlassModalWrapper>
  );
};

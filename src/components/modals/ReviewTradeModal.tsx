import { Icon } from "../ui/Icon";
import React, { useEffect, useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { PAIRS } from "../../constants/pairs";
import { ARC } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { Button } from "../ui/Button";

export const ReviewTradeModal: React.FC = () => {
  const {
    reviewOpen,
    setReviewOpen,
    pendingQuote,
    pair: pairKey,
    side,
    amount,
    executeTrade,
    executing,
    environmentMode,
  } = useAppStore();

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!reviewOpen) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [reviewOpen]);
  if (!pendingQuote) return null;
  const p = PAIRS[pairKey];
  const expired = now >= pendingQuote.expiresAt;
  const live = environmentMode === "mainnet";

  return (
    <GlassModalWrapper
      isOpen={reviewOpen}
      onClose={() => { if (!executing) setReviewOpen(false); }}
      title={live ? "Review mainnet trade" : "Review simulated trade"}
      subtitle={`Wallet-controlled execution · ${side.toUpperCase()} ${pairKey}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Order Summary Card */}
        <div className="p-4 rounded-card card-themed border border-themed/40 space-y-2">
          <div className="flex justify-between items-baseline">
            <span className="font-mono text-xs text-sub">You Pay</span>
            <span className="font-display font-extrabold text-lg text-themed tnum">
              {side === "buy" ? `$${amount.toLocaleString()} USDC` : `${(amount / pendingQuote.price).toFixed(4)} ${p.base}`}
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
            <span className="text-muted">Minimum output:</span>
            <span className="text-themed font-medium tnum">
              {side === "buy"
                ? `${pendingQuote.minReceived.toFixed(5)} ${p.base}`
                : `$${pendingQuote.minReceived.toFixed(2)} USDC`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Max Slippage Band:</span>
            <span className="text-themed">{pendingQuote.slippageBps / 100}% ({pendingQuote.slippageBps} bps)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Price impact:</span>
            <span className="text-themed">{live ? "Not measured" : (pendingQuote.impact * 100).toFixed(2) + "% modeled"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Gas estimate:</span>
            <span className="text-pos">Estimated by wallet at submission</span>
          </div>
        </div>

        {/* Cryptographic Verification Details Box */}
        <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 space-y-2 font-mono text-[11px]">
          <div className="flex items-center justify-between text-themed font-semibold border-b border-themed/20 pb-1.5">
            <span className="flex items-center gap-1.5 text-pos">
              <Icon name="verified" className="material-symbols-outlined text-[15px]" />
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
                <Icon name="open_in_new" className="material-symbols-outlined text-[11px]" />
              </a>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-muted/70">Arc Chain ID</span>
              <span className="text-themed font-bold">5042 (Mainnet)</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-muted pt-1 border-t border-themed/10">
            <span>Custody: Non-custodial</span>
            <span className="text-pos">Fail-Closed Authorization</span>
          </div>
        </div>

        <div role="status" className="text-xs text-sub leading-relaxed">
          {expired ? "Quote expired. Close this dialog and review again." : `Quote expires in ${Math.max(0, Math.ceil((pendingQuote.expiresAt - now) / 1000))}s.`}
          {live && <p className="mt-2">An exact token approval may be required. Your wallet signs the reviewed input and minimum output. Receipt anchoring is a separate transaction after settlement.</p>}
        </div>
        {/* Sign Button */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={executeTrade}
          isLoading={executing}
          disabled={expired}
          leftIcon={<Icon name="draw" className="material-symbols-outlined text-[18px]" />}
        >
          {live ? "Sign & Execute on Arc" : "Simulate & Generate Certificate"}
        </Button>
      </div>
    </GlassModalWrapper>
  );
};

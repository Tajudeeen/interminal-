import React from "react";
import { Icon } from "../ui/Icon";
import { Button } from "../ui/Button";
import { usePaymentStore } from "../../store/usePaymentStore";
import { useAppStore } from "../../store/useAppStore";

const steps = ["Reserve", "Review", "Receipts", "Verify"];

export const JudgeTourBar: React.FC = () => {
  const {
    judgeTourOpen, judgeTourStep, setJudgeTourOpen, setJudgeTourStep,
    setView, balances, targetBufferUsd,
    reviewOpen, activeReceiptModal, environmentMode, executing,
  } = useAppStore();

  const payment = usePaymentStore();
  // Let the review and certificate dialogs take focus without covering them.
  if (!judgeTourOpen || environmentMode !== "demo" || reviewOpen || activeReceiptModal || payment.review) return null;

  const eligible = Math.max(0, (balances.USDC || 0) - targetBufferUsd);
  const goToStep = (step: number) => {
    if (executing) return;
    setJudgeTourStep(step);
    if (step === 1) setView("portfolio");
    if (step === 2) {
      const store = useAppStore.getState();
      if (store.pair !== "USYC/USDC") store.setPair("USYC/USDC");
      store.setSide("buy");
      store.setAmount(Math.min(500, eligible));
      setView("terminal");
    }
    if (step === 3) setView("ledger");
    if (step === 4) setView("proof");
  };

  return (
    <aside aria-label="Reviewer walkthrough" className="fixed left-4 right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:left-auto md:right-8 md:bottom-8 z-40 md:max-w-xl w-auto animate-view-fade">
      <div className="glass-modal rounded-2xl p-4 sm:p-5 border border-cyan/40 shadow-2xl space-y-4 max-h-[calc(100dvh-6rem)] overflow-y-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display font-black text-xs text-themed uppercase">Reviewer walkthrough</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30">90 SECONDS · SIMULATION</span>
          </div>
          <button aria-label="Close tour" onClick={() => setJudgeTourOpen(false)} className="text-muted hover:text-themed p-1">
            <Icon name="close" className="material-symbols-outlined text-[18px]" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 font-mono text-[10px]">
          {steps.map((label, index) => (
            <button key={label} disabled={executing} aria-current={judgeTourStep === index + 1 ? "step" : undefined} onClick={() => goToStep(index + 1)} className={`py-2 px-1 rounded-lg ${judgeTourStep === index + 1 ? "bg-lime-500 text-black font-bold" : "bg-themed-card/50 text-sub border border-themed/30"}`}>
              {index + 1}. {label}
            </button>
          ))}
        </div>
        {judgeTourStep === 1 && <div className="space-y-3">
          <p className="text-sm text-sub">Keep ${targetBufferUsd.toLocaleString()} USDC ready for operations. Only the remaining ${eligible.toLocaleString()} is available before payment fees. Change the reserve above to see that boundary move.</p>
          <Button size="sm" onClick={() => goToStep(2)}>Next: Review a bounded move</Button>
        </div>}
        {judgeTourStep === 2 && <div className="space-y-3">
          <p className="text-sm text-sub">Review a USDC payment. Use the demo recipient, inspect the exact amount and reserve, then simulate the payment. No wallet signs and no funds move.</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={eligible <= 0 || executing} onClick={() => setView("terminal")}>Open simulated review</Button>
            <Button variant="secondary" size="sm" onClick={() => goToStep(3)}>Next: Receipts</Button>
          </div>
        </div>}
        {judgeTourStep === 3 && <div className="space-y-3">
          <p className="text-sm text-sub">{payment.receipts.filter(r => r.mode === "simulation").length ? "Inspect the receipt, its simulation label, and SHA-256 integrity digest. Export JSON for a portable record. Local integrity does not prove a mainnet payment." : "Confirm the simulated review in step 2 to create a receipt. No transaction or certificate is invented by this tour."}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={!payment.receipts.filter(r => r.mode === "simulation").length} onClick={() => setView("ledger")}>Inspect latest receipt</Button>
            <Button variant="secondary" size="sm" onClick={() => goToStep(4)}>Next: Verify on Arc</Button>
          </div>
        </div>}
        {judgeTourStep === 4 && <div className="space-y-3">
          <p className="text-sm text-sub">The checks on this page query live Arc infrastructure without a wallet. To prove execution, verify a real payment transaction and its exported mainnet receipt. Simulation receipts are rejected as mainnet evidence.</p>
          <Button variant="secondary" size="sm" onClick={() => setJudgeTourOpen(false)}>Finish walkthrough</Button>
        </div>}
      </div>
    </aside>
  );
};

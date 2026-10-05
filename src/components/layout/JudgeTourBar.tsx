import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC, USYC_APY } from "../../constants/arc";
import { shortAddr } from "../../lib/arc/wallet";
import { Button } from "../ui/Button";

export const JudgeTourBar: React.FC = () => {
  const {
    judgeTourOpen,
    judgeTourStep,
    setJudgeTourOpen,
    setJudgeTourStep,
    setView,
    setSide,
    setAmount,
    balances,
    targetBufferUsd,
    setActiveReceiptModal,
    auditReceipts,
    addToast,
  } = useAppStore();

  if (!judgeTourOpen) return null;

  const liquidUsdc = balances.USDC || 0;
  const excessCash = Math.max(0, liquidUsdc - targetBufferUsd);

  // Step 1: Execute Sweep
  const handleStep1Sweep = () => {
    if (excessCash <= 0) {
      addToast("Cash Already Optimized", "Idle cash is already swept into USYC.", "info");
      return;
    }
    useAppStore.setState((s) => ({
      balances: {
        ...s.balances,
        USDC: s.targetBufferUsd,
        USYC: (s.balances.USYC || 0) + excessCash,
      },
      activity: [
        {
          ts: Date.now(),
          type: "sweep",
          label: `Interactive Sweep: $${excessCash.toLocaleString()} USDC -> USYC T-Bills`,
          detail: `Simulation: +${(excessCash * USYC_APY).toFixed(2)}/yr at the current reference rate`,
        },
        ...s.activity,
      ],
    }));
    addToast(
      "Yield Sweep Complete!",
      `Simulated ${excessCash.toLocaleString()} USDC → USYC using the current reference rate.`,
      "ok"
    );
  };

  // Step 2: Load a $25,000 JIT scenario without pretending a transaction happened.
  const handleStep2SimulateTrade = () => {
    setView("terminal");
    setSide("buy");
    setAmount(25000);
    addToast(
      "JIT Scenario Loaded",
      "The terminal now shows the USYC shortfall and live quote controls. No transaction was broadcast.",
      "info",
    );
  };

  // Step 3: Inspect latest receipt
  const handleStep3InspectReceipt = () => {
    setView("ledger");
    if (auditReceipts.length > 0) {
      setActiveReceiptModal(auditReceipts[0]);
    }
  };

  const goToStep = (step: number) => {
    setJudgeTourStep(step);
    if (step === 1) setView("portfolio");
    if (step === 2) {
      setView("terminal");
      setSide("buy");
      setAmount(25000);
    }
    if (step === 3) setView("ledger");
  };

  return (
    <div className="fixed left-4 right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:left-auto md:right-8 md:bottom-8 z-50 md:max-w-xl w-auto animate-view-fade">
      <div className="glass-modal rounded-2xl p-4 sm:p-5 border border-cyan/40 shadow-2xl space-y-4 max-h-[calc(100dvh-6rem)] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan animate-pulse" />
            <span className="font-display font-black text-xs sm:text-sm text-themed tracking-wide uppercase">
              Take a Tour
            </span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-cyan/15 text-cyan border border-cyan/30 font-bold">
              3-MIN WALKTHROUGH
            </span>
          </div>
          <button
            onClick={() => setJudgeTourOpen(false)}
            className="text-muted hover:text-themed transition-colors p-1"
            title="Close Tour"
          >
            <Icon name="close" className="material-symbols-outlined text-[18px]" />
          </button>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px]">
          {[
            { step: 1, label: "1. Policy Sweep" },
            { step: 2, label: "2. JIT Unwind" },
            { step: 3, label: "3. Arc Audit" },
          ].map((item) => (
            <button
              key={item.step}
              onClick={() => goToStep(item.step)}
              className={`py-1.5 px-2 rounded-lg text-center transition-all ${
                judgeTourStep === item.step
                  ? "bg-lime-500 text-black font-extrabold shadow-sm scale-102"
                  : "bg-themed-card/50 text-sub hover:text-themed border border-themed/30"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Step Content */}
        {judgeTourStep === 1 && (
          <div className="space-y-3">
            <div className="font-mono text-xs text-themed leading-relaxed">
              <span className="font-bold">Pillar 1: Policy-Driven Cash Optimization.</span> Operating cash buffer retains liquid USDC for operations; detects{" "}
              <span className="text-pos font-bold">${excessCash.toLocaleString()} USDC</span> excess cash and routes it to USYC in simulation mode.
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 min-w-0"
                onClick={handleStep1Sweep}
                leftIcon={<Icon name="bolt" className="material-symbols-outlined text-[16px]" />}
              >
                1-Click Sweep ${excessCash.toLocaleString()} to USYC
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 min-w-0"
                onClick={() => goToStep(2)}
                rightIcon={<Icon name="arrow_forward" className="material-symbols-outlined text-[14px]" />}
              >
                Next: JIT Unwind
              </Button>
            </div>
          </div>
        )}

        {judgeTourStep === 2 && (
          <div className="space-y-3">
            <div className="font-mono text-xs text-themed leading-relaxed">
              <span className="font-bold">Pillar 2: Just-In-Time (JIT) Liquidity.</span> An outgoing wire or trade of{" "}
              <span className="text-lime-500 font-bold">$25,000</span> exceeds liquid USDC. The demo calculates a USYC shortfall, while live mode can execute a fresh USYC/USDC route on Arc with bounded output.
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 min-w-0"
                onClick={handleStep2SimulateTrade}
                leftIcon={<Icon name="swap_calls" className="material-symbols-outlined text-[16px]" />}
              >
                Open $25k JIT Scenario
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 min-w-0"
                onClick={() => goToStep(3)}
                rightIcon={<Icon name="arrow_forward" className="material-symbols-outlined text-[14px]" />}
              >
                Next: Arc Audit
              </Button>
            </div>
          </div>
        )}

        {judgeTourStep === 3 && (
          <div className="space-y-3">
            <div className="font-mono text-xs text-themed leading-relaxed">
              <span className="font-bold">Pillar 3: Signed EIP-712 Controls & Arc Settlement.</span> Executed tickets generate a canonical JSON certificate with SHA-256 integrity proofs that can be anchored to the deployed Arc contract{" "}
              <span className="text-pos font-bold font-mono">{shortAddr(ARC.settlement)}</span> on Chain 5042.
            </div>
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1 min-w-0"
                onClick={handleStep3InspectReceipt}
                leftIcon={<Icon name="verified" className="material-symbols-outlined text-[16px]" />}
              >
                Inspect Cryptographic Certificate
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="flex-1 min-w-0"
                onClick={() => setJudgeTourOpen(false)}
              >
                Finish Tour
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

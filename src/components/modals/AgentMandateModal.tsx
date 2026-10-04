import React, { useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../ui/Button";

export const AgentMandateModal: React.FC = () => {
  const { mandateModalOpen, setMandateModalOpen, createAgentMandate, address } = useAppStore();

  const [spendUsd, setSpendUsd] = useState<number>(500);
  const [agent, setAgent] = useState<string>(address || "");
  const [slipBps, setSlipBps] = useState<number>(30);
  const [ttlHours, setTtlHours] = useState<number>(4);
  const [selectedPairs, setSelectedPairs] = useState<string[]>(["ETH/USDC", "EURC/USDC"]);

  const availablePairs = ["ETH/USDC", "EURC/USDC", "USYC/USDC", "BTC/USDC", "ARC/USDC"];

  const togglePair = (p: string) => {
    if (selectedPairs.includes(p)) {
      if (selectedPairs.length > 1) {
        setSelectedPairs(selectedPairs.filter((x) => x !== p));
      }
    } else {
      setSelectedPairs([...selectedPairs, p]);
    }
  };

  const handleAuthorize = async () => {
    await createAgentMandate({
      spendUsd,
      slipBps,
      ttlHours,
      pairs: selectedPairs,
      agent: agent.trim() || undefined,
    });
  };

  return (
    <GlassModalWrapper
      isOpen={mandateModalOpen}
      onClose={() => setMandateModalOpen(false)}
      title="Create Bounded Agent Mandate"
      subtitle="EIP-712 Scoped Delegation · Zero Custodial Risk"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4">
        {/* Agent Wallet */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Agent Wallet Address
          </label>
          <input
            value={agent}
            onChange={(e) => setAgent(e.target.value)}
            placeholder="0x... agent wallet"
            className="w-full px-3 py-2 rounded-card bg-themed-card text-themed border border-themed/50 font-mono text-xs focus:outline-none focus:border-lime-500"
          />
          <div className="font-mono text-[10px] text-muted mt-1">
            For a self-execution proof, use your connected wallet address.
          </div>
        </div>

        {/* Maximum Spend Limit */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Maximum Cumulative Budget (USDC)
          </label>
          <div className="flex gap-2">
            {[100, 250, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => setSpendUsd(amt)}
                className={`flex-1 py-1.5 rounded-card font-mono text-xs transition-colors ${
                  spendUsd === amt
                    ? "bg-text text-bg font-bold shadow-sm"
                    : "card-themed border border-themed/40 text-sub hover:text-themed"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Max Slippage */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Max Slippage Allowed ({slipBps} bps / {(slipBps / 100).toFixed(2)}%)
          </label>
          <div className="flex gap-2">
            {[10, 20, 30, 50].map((bps) => (
              <button
                key={bps}
                onClick={() => setSlipBps(bps)}
                className={`flex-1 py-1.5 rounded-card font-mono text-xs transition-colors ${
                  slipBps === bps
                    ? "bg-text text-bg font-bold shadow-sm"
                    : "card-themed border border-themed/40 text-sub hover:text-themed"
                }`}
              >
                {bps} bps
              </button>
            ))}
          </div>
        </div>

        {/* Authorized Pair Mask */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Authorized Market Pairs ({selectedPairs.length} Approved)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {availablePairs.map((p) => {
              const active = selectedPairs.includes(p);
              return (
                <button
                  key={p}
                  onClick={() => togglePair(p)}
                  className={`py-1 px-2.5 rounded-pill font-mono text-xs transition-colors ${
                    active
                      ? "bg-pos/15 border border-pos/40 text-pos font-semibold"
                      : "card-themed border border-themed/30 text-muted hover:text-sub"
                  }`}
                >
                  {active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-pos mr-1.5" />}
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* TTL / Duration */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Authorization TTL (Time-To-Live)
          </label>
          <div className="flex gap-2">
            {[1, 4, 12, 24].map((hr) => (
              <button
                key={hr}
                onClick={() => setTtlHours(hr)}
                className={`flex-1 py-1.5 rounded-card font-mono text-xs transition-colors ${
                  ttlHours === hr
                    ? "bg-text text-bg font-bold shadow-sm"
                    : "card-themed border border-themed/40 text-sub hover:text-themed"
                }`}
              >
                {hr}h
              </button>
            ))}
          </div>
        </div>

        {/* Safety Note */}
        <div className="p-3 rounded-card bg-themed-card/40 border border-themed/20 font-mono text-[11px] text-muted space-y-1">
          <div className="text-themed font-semibold">Deterministic Policy Enforcer:</div>
          <div>Agent cannot exceed ${spendUsd} total or trade outside selected pairs.</div>
          <div>Revocable on-chain at any time via `revokeMandate(bytes32)`.</div>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleAuthorize}
          leftIcon={<span className="material-symbols-outlined text-[18px]">verified_user</span>}
        >
          Authorize Scoped EIP-712 Mandate
        </Button>
      </div>
    </GlassModalWrapper>
  );
};

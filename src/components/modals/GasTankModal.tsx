import React, { useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../ui/Button";

export const GasTankModal: React.FC = () => {
  const { gasTankModalOpen, setGasTankModalOpen, nativeGasBalance, balances, refuelGasTank, gasRefueling } =
    useAppStore();
  const [selectedAmount, setSelectedAmount] = useState<number>(25);

  const presets = [10, 25, 50, 100];

  const handleRefuel = async () => {
    await refuelGasTank(selectedAmount);
  };

  return (
    <GlassModalWrapper
      isOpen={gasTankModalOpen}
      onClose={() => setGasTankModalOpen(false)}
      title="Arc Native Gas Tank"
      subtitle="Autonomous Fuel Cell · Sub-Cent Execution"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Tank Level Display */}
        <div className="p-4 rounded-card card-themed border border-themed/40">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-sub">Current Fuel Reserve</span>
            <span className="font-display font-black text-xl text-pos tnum">
              {nativeGasBalance.toFixed(3)} ARC
            </span>
          </div>
          <div className="mt-3 w-full bg-themed-card rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (nativeGasBalance / 0.25) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
            <span>Empty</span>
            <span>~{Math.round(nativeGasBalance / 0.0012)} Transactions remaining</span>
            <span>Full</span>
          </div>
        </div>

        {/* Refuel Amount Selection */}
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
            Select Refuel Amount (Liquid USDC)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {presets.map((amt) => (
              <button
                key={amt}
                onClick={() => setSelectedAmount(amt)}
                className={`py-2 px-3 rounded-card font-mono text-xs transition-all ${
                  selectedAmount === amt
                    ? "bg-text text-bg font-bold shadow-md"
                    : "card-themed border border-themed/40 text-sub hover:text-themed"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Breakdown */}
        <div className="p-3 rounded-card bg-themed-card/40 border border-themed/20 space-y-1.5 font-mono text-xs">
          <div className="flex justify-between">
            <span className="text-muted">Debit From:</span>
            <span className="text-themed">USDC Balance (${(balances.USDC || 0).toLocaleString()})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Rate:</span>
            <span className="text-themed">$1.00 USDC = 0.005 ARC Gas</span>
          </div>
          <div className="flex justify-between font-semibold pt-1 border-t border-themed/20">
            <span className="text-sub">Refuel Yield:</span>
            <span className="text-pos">+{(selectedAmount * 0.005).toFixed(3)} ARC Gas</span>
          </div>
        </div>

        {/* CTA */}
        <Button
          variant="primary"
          size="lg"
          fullWidth
          onClick={handleRefuel}
          disabled={(balances.USDC || 0) < selectedAmount}
          isLoading={gasRefueling}
          leftIcon={<span className="material-symbols-outlined text-[18px]">local_gas_station</span>}
        >
          Confirm Refuel (${selectedAmount} USDC)
        </Button>
      </div>
    </GlassModalWrapper>
  );
};

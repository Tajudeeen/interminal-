import { Icon } from "../ui/Icon";
import React, { useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../ui/Button";

export const GasTankModal: React.FC = () => {
  const { gasTankModalOpen, setGasTankModalOpen, nativeGasBalance, balances, refuelGasTank, gasRefueling, livePortfolio } =
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
      subtitle="Native USDC Gas Balance · Transaction Cost Estimate"
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        <div className="p-4 rounded-card card-themed border border-themed/40">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-sub">Current Native USDC Gas Balance</span>
            <span className="font-display font-black text-xl text-pos tnum">
              {nativeGasBalance.toFixed(6)} USDC
            </span>
          </div>
          <div className="mt-3 w-full bg-themed-card rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${Math.min(100, (nativeGasBalance / 0.25) * 100)}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between font-mono text-[10px] text-muted">
            <span>Native USDC gas</span>
            <span>~{Math.round(nativeGasBalance / 0.0012)} estimated transactions</span>
            <span>Estimate</span>
          </div>
        </div>

        {livePortfolio ? (
          <div className="p-3.5 rounded-card bg-cyan/10 border border-cyan/30 font-mono text-[11px] text-cyan space-y-1.5">
            <div className="font-bold text-themed">Live wallet mode</div>
            <div>Arc uses native USDC for gas. Interminal reads the native balance directly from the wallet.</div>
            <div>No synthetic gas conversion is shown in live mode.</div>
          </div>
        ) : (
          <>
            <div className="p-3.5 rounded-card bg-amber-500/10 border border-amber-500/30 font-mono text-[11px] text-amber-500">
              Demo control only. This refill changes simulated balances and never broadcasts an Arc transaction.
            </div>

            <div>
              <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-2">
                Simulated Refill Amount
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

            <div className="p-3 rounded-card bg-themed-card/40 border border-themed/20 space-y-1.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Simulated Debit:</span>
                <span className="text-themed">USDC Balance (${(balances.USDC || 0).toLocaleString()})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Simulated Gas Added:</span>
                <span className="text-themed">+${selectedAmount.toFixed(2)} native USDC</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleRefuel}
              disabled={(balances.USDC || 0) < selectedAmount}
              isLoading={gasRefueling}
              leftIcon={<Icon name="local_gas_station" className="material-symbols-outlined text-[18px]" />}
            >
              Simulate Gas Refill (${selectedAmount} USDC)
            </Button>
          </>
        )}
      </div>
    </GlassModalWrapper>
  );
};

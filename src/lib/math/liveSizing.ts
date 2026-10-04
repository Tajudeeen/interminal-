import { PAIRS } from "../../constants/pairs";

export interface LiveControlSizing {
  targetBufferUsd: number;
  stressTestAmount: number;
  tradeDefaultUsd: number;
  dcaSpendTotal: number;
  dcaSliceSize: number;
  mandateSpendUsd: number;
}

function roundToStep(value: number, step: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.max(step, Math.round(value / step) * step);
}

function roundUsd(value: number): number {
  if (value < 100) return Math.max(10, Math.round(value / 10) * 10);
  if (value < 1000) return Math.max(50, Math.round(value / 50) * 50);
  return Math.max(100, Math.round(value / 100) * 100);
}

/**
 * Turn the connected wallet's current holdings into sane starting controls.
 * These are UI defaults, not policy limits. The user can still override them.
 */
export function deriveLiveControlSizing(
  balances: Record<string, number>,
  usycPriceUsd = PAIRS["USYC/USDC"].price,
): LiveControlSizing {
  const liquidUsdc = Math.max(0, Number(balances.USDC || 0));
  const usycUsd = Math.max(0, Number(balances.USYC || 0)) * Math.max(usycPriceUsd, 0);
  const treasuryValue = liquidUsdc + usycUsd;

  if (treasuryValue <= 0) {
    return {
      targetBufferUsd: 0,
      stressTestAmount: 0,
      tradeDefaultUsd: 0,
      dcaSpendTotal: 0,
      dcaSliceSize: 0,
      mandateSpendUsd: 0,
    };
  }

  const targetBufferUsd = liquidUsdc > 0
    ? Math.min(liquidUsdc, roundUsd(liquidUsdc * 0.20))
    : 0;

  // The default stress case is slightly larger than liquid cash so JIT
  // can demonstrate a real shortfall when the wallet actually has treasury assets.
  const stressBase = Math.max(
    liquidUsdc * 1.25,
    targetBufferUsd * 1.5,
    treasuryValue * 0.15,
  );
  const stressTestAmount = roundUsd(Math.min(treasuryValue, stressBase));

  const tradeDefaultUsd = liquidUsdc > 0
    ? Math.min(liquidUsdc, Math.max(10, roundUsd(liquidUsdc * 0.10)))
    : 0;

  const dcaSpendTotal = liquidUsdc > 0
    ? Math.min(liquidUsdc, Math.max(20, roundUsd(liquidUsdc * 0.10)))
    : 0;
  const dcaSliceSize = dcaSpendTotal > 0
    ? Math.max(10, roundToStep(dcaSpendTotal / 5, dcaSpendTotal >= 500 ? 50 : 10))
    : 0;

  const mandateSpendUsd = liquidUsdc > 0
    ? Math.min(liquidUsdc, Math.max(25, roundUsd(liquidUsdc * 0.05)))
    : 0;

  return {
    targetBufferUsd,
    stressTestAmount,
    tradeDefaultUsd,
    dcaSpendTotal,
    dcaSliceSize,
    mandateSpendUsd,
  };
}

export function liveSizePresets(availableUsd: number): number[] {
  const available = Math.max(0, Number(availableUsd || 0));
  if (available <= 0) return [];

  const ratios = [0.025, 0.05, 0.10, 0.25];
  const values = ratios.map((ratio) => Math.min(available, Math.max(10, roundUsd(available * ratio))));
  return [...new Set(values)].sort((a, b) => a - b);
}

import { FED_FUNDS_RATE, ECB_DEPOSIT_RATE } from "../../constants/arc";
import { FxParityResult } from "../../types/treasury";

export interface FxParityInput {
  eurcUsdcPrice?: number;
  price?: number;
  fedRate?: number;
  ecbRate?: number;
  benchmarkRate?: number;
}

export function calculateFxParity(
  priceOrObj: number | FxParityInput,
  fedRateArg: number = FED_FUNDS_RATE,
  ecbRateArg: number = ECB_DEPOSIT_RATE
): FxParityResult {
  let price: number;
  let fedRate: number;
  let ecbRate: number;
  let benchmark: number;

  if (typeof priceOrObj === "object" && priceOrObj !== null) {
    price = Number(priceOrObj.eurcUsdcPrice ?? priceOrObj.price);
    fedRate = Number(priceOrObj.fedRate ?? FED_FUNDS_RATE);
    ecbRate = Number(priceOrObj.ecbRate ?? ECB_DEPOSIT_RATE);
    benchmark = Number(priceOrObj.benchmarkRate ?? 1.0840);
  } else {
    price = Number(priceOrObj);
    fedRate = Number(fedRateArg);
    ecbRate = Number(ecbRateArg);
    benchmark = 1.0840;
  }

  if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid FX price");

  const rateSpreadBps = Math.round((fedRate - ecbRate) * 10000);
  const pipSize = 0.0001;
  const pipSpread = Math.round((Math.abs(price - benchmark) / pipSize) * 10) / 10 || 1.2;
  const spreadBps = Math.round(((pipSpread * pipSize) / price) * 10000 * 10) / 10;
  const pipsFromParity = Math.round((price - 1.0) * 10000);
  const longUsdCarryAnnual = fedRate - ecbRate;
  const longEurCarryAnnual = ecbRate - fedRate;
  const carrySpreadBps = Math.round((fedRate - ecbRate) * 10000);
  const isWithinParityBand = Math.abs(price - benchmark) <= 0.0050;

  return {
    price,
    benchmarkRate: benchmark,
    fedRate,
    fedFundsRate: Math.round(fedRate * 10000) / 100,
    ecbRate,
    ecbDepositRate: Math.round(ecbRate * 10000) / 100,
    rateSpreadBps,
    carrySpreadBps,
    pipSize,
    pipSpread,
    spreadBps,
    pipsFromParity,
    longUsdCarryAnnual,
    longEurCarryAnnual,
    carryDirection: "Long USD / Short EUR (+175 bps carry)",
    isWithinParityBand,
  };
}

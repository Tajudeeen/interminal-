import { describe, it, expect } from "vitest";
import { sha256Hex } from "../lib/crypto/sha256";
import {
  calculateOpportunityCost,
  calculateJitUnwind,
  calculateYieldSweep,
} from "../lib/math/treasury";
import { decodeTradeSettledExecution } from "../lib/arc/rpcClient";
import { calculateFxParity } from "../lib/math/fx";
import { quoteTrade, parseUnits, formatUnits } from "../lib/math/quotes";
import { deriveLiveControlSizing, liveSizePresets } from "../lib/math/liveSizing";
import { generateCandles, computeIndicators, GECKO_RESOLUTION } from "../lib/math/indicators";
import {
  createAgentMandateDescriptor,
  validateAgentExecution,
  buildTradeTicket,
  buildAgentMandateTicket,
  generateTradeReceipt,
  verifyReceiptIntegrity,
  failClosedLocalProofs,
} from "../lib/crypto/eip712";
import { useAppStore } from "../store/useAppStore";

describe("React TypeScript Modular Engine", () => {
  it("SHA-256 bitwise matches known vectors", () => {
    expect(sha256Hex("abc")).toBe("0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(sha256Hex("")).toBe("0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("TradeSettled event decoder extracts confirmed execution amounts", () => {
    const trader = "0x1111111111111111111111111111111111111111";
    const tokenIn = "0x3600000000000000000000000000000000000000";
    const tokenOut = "0x128cC466B61f542da60c70e3aA11c10e19B84EDB";
    const data =
      "0x" +
      tokenIn.slice(2).padStart(64, "0") +
      tokenOut.slice(2).padStart(64, "0") +
      (500000000n).toString(16).padStart(64, "0") +
      (183000000000000000n).toString(16).padStart(64, "0") +
      (12345n).toString(16).padStart(64, "0");

    const decoded = decodeTradeSettledExecution(
      {
        logs: [
          {
            address: "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36",
            topics: ["0x6b3c2ce72b7b275a10cd77f8750ffdb92c7a6bd7e9c40b8b81652fd1448e0bc8", "0x" + "a".repeat(64), "0x" + trader.slice(2).padStart(64, "0")],
            data,
          },
        ],
      },
      "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36",
      trader,
      tokenIn,
      tokenOut,
    );

    expect(decoded).not.toBeNull();
    expect(decoded?.trader.toLowerCase()).toBe(trader);
    expect(decoded?.amountIn).toBe(500000000n);
    expect(decoded?.amountOut).toBe(183000000000000000n);
  });

  it("SHA-256 uses UTF-8 bytes for non-ASCII input", () => {
    expect(sha256Hex("₦")).toBe("0x8c0e184ef8d588e464cfea95ef83eddf266ca3a7350379a1c78b4cf6bd0113fc");
  });

  it("Opportunity cost accurately projects yield loss on idle cash", () => {
    const cost = calculateOpportunityCost(10000, 5.1);
    expect(cost.idleUsdc).toBe(10000);
    expect(cost.annualYieldBps).toBe(510);
    expect(cost.annualYieldUsd).toBe(510);
    expect(cost.monthlyYieldUsd).toBe(42.5);
    expect(Math.abs(cost.dailyYieldUsd - 1.397)).toBeLessThan(0.01);
  });

  it("JIT USYC liquidity unwind converts USD shortfall using USYC NAV", () => {
    const noUnwind = calculateJitUnwind({
      tradeAmountUsd: 100,
      liquidUsdc: 250,
      usycBalance: 1000,
      usycPriceUsd: 1.135836,
      slippageBps: 20,
    });
    expect(noUnwind.needed).toBe(false);
    expect(noUnwind.canCover).toBe(true);
    expect(noUnwind.usycToRedeem).toBe(0);

    const withUnwind = calculateJitUnwind({
      tradeAmountUsd: 500,
      liquidUsdc: 150,
      usycBalance: 1000,
      usycPriceUsd: 1.135836,
      slippageBps: 0,
    });
    expect(withUnwind.needed).toBe(true);
    expect(withUnwind.canCover).toBe(true);
    expect(withUnwind.shortfall).toBe(350);
    expect(withUnwind.usycToRedeem).toBeCloseTo(350 / 1.135836, 6);
    expect(withUnwind.remainingUsyc).toBeCloseTo(1000 - 350 / 1.135836, 6);
  });

  it("JIT coverage fails closed when USYC NAV is insufficient", () => {
    const result = calculateJitUnwind({
      tradeAmountUsd: 1500,
      liquidUsdc: 100,
      usycBalance: 1000,
      usycPriceUsd: 1.135836,
      slippageBps: 50,
    });
    expect(result.needed).toBe(true);
    expect(result.canCover).toBe(false);
  });

  it("Yield sweep triggers above operating cash buffer", () => {
    const under = calculateYieldSweep(300, 500);
    expect(under.recommended).toBe(false);
    expect(under.sweepAmount).toBe(0);

    const over = calculateYieldSweep(2500, 500);
    expect(over.recommended).toBe(true);
    expect(over.sweepAmount).toBe(2000);
    expect(over.annualExtraYield).toBeGreaterThan(0);
  });

  it("FX corridor computes pip spreads and carry rate differential", () => {
    const fx = calculateFxParity({
      eurcUsdcPrice: 1.0845,
      benchmarkRate: 1.084,
    });
    expect(fx.pipSpread).toBe(5.0);
    expect(fx.carrySpreadBps).toBe(175);
    expect(fx.isWithinParityBand).toBe(true);
  });

  it("Trade math quotes calculate received and minReceived with slippage", () => {
    const buyQuote = quoteTrade({ side: "buy", amountUsd: 1000, price: 2500, slippageBps: 50 });
    expect(buyQuote.effective).toBeGreaterThan(2500);
    expect(buyQuote.received).toBeGreaterThan(0.39);
    expect(buyQuote.minReceived).toBeLessThan(buyQuote.received);

    const sellQuote = quoteTrade({ side: "sell", amountUsd: 1000, price: 2500, slippageBps: 50 });
    expect(sellQuote.effective).toBeLessThan(2500);
    expect(sellQuote.received).toBeGreaterThan(990);
    expect(sellQuote.minReceived).toBeLessThan(sellQuote.received);
  });

  it("parseUnits and formatUnits precision", () => {
    expect(parseUnits("100.5", 6)).toBe(100500000n);
    expect(parseUnits("0.000001", 6)).toBe(1n);
    expect(formatUnits("0x5f5e100", 6)).toBe(100);
  });

  it("Candles & indicators compute deterministically", () => {
    const candles = generateCandles("ETH/USDC", "4h", 60);
    expect(candles.length).toBe(60);
    const ind = computeIndicators(candles);
    expect(ind.rsi).toBeGreaterThan(0);
    expect(ind.rsi).toBeLessThan(100);
    expect(ind.support).toBeLessThanOrEqual(ind.resistance);
    expect(GECKO_RESOLUTION["1m"]).toEqual({ bucket: "minute", aggregate: 1 });
    expect(GECKO_RESOLUTION["5m"]).toEqual({ bucket: "minute", aggregate: 5 });
    expect(GECKO_RESOLUTION["15m"]).toEqual({ bucket: "minute", aggregate: 15 });
    expect(GECKO_RESOLUTION["1h"]).toEqual({ bucket: "hour", aggregate: 1 });
    expect(GECKO_RESOLUTION["4h"]).toEqual({ bucket: "hour", aggregate: 4 });
    expect(GECKO_RESOLUTION["1D"]).toEqual({ bucket: "day", aggregate: 1 });
  });

  it("Agent mandates validate bounded limits", () => {
    const mandate = createAgentMandateDescriptor({
      delegator: "0x1111111111111111111111111111111111111111",
      agent: "0x2222222222222222222222222222222222222222",
      maxSpendUsdc: 300,
      maxSlippageBps: 30,
      allowedPairs: ["ETH/USDC"],
      ttlSeconds: 3600,
    });

    const valid = validateAgentExecution(mandate, {
      pair: "ETH/USDC",
      amountUsdc: 150,
      slippageBps: 20,
    }, false);
    expect(valid.valid).toBe(true);

    const overspend = validateAgentExecution(mandate, {
      pair: "ETH/USDC",
      amountUsdc: 350,
    }, false);
    expect(overspend.valid).toBe(false);
    expect(overspend.code).toBe("amount_exceeds_mandate");

    const wrongPair = validateAgentExecution(mandate, {
      pair: "BTC/USDC",
      amountUsdc: 50,
      slippageBps: 20,
    }, false);
    expect(wrongPair.valid).toBe(false);
    expect(wrongPair.code).toBe("unapproved_market");

    const highSlip = validateAgentExecution(mandate, {
      pair: "ETH/USDC",
      amountUsdc: 50,
      slippageBps: 40,
    }, false);
    expect(highSlip.valid).toBe(false);
    expect(highSlip.code).toBe("slippage_exceeds_band");

    const expired = {
      ...mandate,
      deadline: Math.floor(Date.now() / 1000) - 1,
    };
    const expiredResult = validateAgentExecution(expired, {
      pair: "ETH/USDC",
      amountUsdc: 50,
      slippageBps: 20,
    }, false);
    expect(expiredResult.valid).toBe(false);
    expect(expiredResult.code).toBe("mandate_expired");

    const mandateTicket = buildAgentMandateTicket(mandate);
    expect(mandateTicket.primaryType).toBe("AgentMandate");
    expect(mandateTicket.domain.chainId).toBe(5042);
  });

  it("Trade ticket builder creates valid EIP-712 structure", () => {
    const quote = quoteTrade({ side: "buy", amountUsd: 500, price: 2500, slippageBps: 50 });
    const ticket = buildTradeTicket(
      "0x1111111111111111111111111111111111111111",
      "ETH/USDC",
      "buy",
      500,
      quote
    );
    expect(ticket.primaryType).toBe("TradeTicket");
    expect(ticket.domain.chainId).toBe(5042);
    expect(ticket.message.amountIn).toBe("500000000");
  });

  it("Audit receipts are tamper-evident", () => {
    const quote = quoteTrade({ side: "buy", amountUsd: 100, price: 2500, slippageBps: 50 });
    const receipt = generateTradeReceipt({
      quote,
      pairKey: "ETH/USDC",
      trader: "0x3333333333333333333333333333333333333333",
      sig: "0x" + "a".repeat(130),
      blockNumber: 1084220,
    });

    expect(verifyReceiptIntegrity(receipt)).toBe(true);
    const tampered = { ...receipt, effectivePrice: 9999 };
    expect(verifyReceiptIntegrity(tampered)).toBe(false);
  });

  it("All 14 fail-closed negative proof gates pass", () => {
    const rows = failClosedLocalProofs();
    expect(rows.length).toBeGreaterThanOrEqual(14);
    rows.forEach((r) => expect(r.ok).toBe(true));
  });


  it("live control sizing adapts to wallet holdings", () => {
    const empty = deriveLiveControlSizing({ USDC: 0, USYC: 0 });
    expect(empty.targetBufferUsd).toBe(0);
    expect(empty.stressTestAmount).toBe(0);
    expect(empty.tradeDefaultUsd).toBe(0);

    const wallet = deriveLiveControlSizing({ USDC: 20000, USYC: 10000 }, 1.1);
    expect(wallet.targetBufferUsd).toBe(4000);
    expect(wallet.stressTestAmount).toBe(25000);
    expect(wallet.tradeDefaultUsd).toBe(2000);
    expect(wallet.dcaSpendTotal).toBe(2000);
    expect(wallet.dcaSliceSize).toBe(400);
    expect(wallet.mandateSpendUsd).toBe(1000);

    expect(liveSizePresets(20000)).toEqual([500, 1000, 2000, 5000]);
  });

  it("Zustand app store initializes with clean state and responds to actions", () => {
    const store = useAppStore.getState();
    expect(store.view).toBe("landing");
    expect(store.pair).toBe("ETH/USDC");

    store.setTargetBufferUsd(2500);
    expect(useAppStore.getState().targetBufferUsd).toBe(2500);

    store.setStressTestAmount(5000);
    expect(useAppStore.getState().stressTestAmount).toBe(5000);

    store.setSide("sell");
    expect(useAppStore.getState().side).toBe("sell");

    store.setAmount(750);
    expect(useAppStore.getState().amount).toBe(750);
  });
});

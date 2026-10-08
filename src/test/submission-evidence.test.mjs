import { describe, expect, it } from "vitest";
import {
  SUBMISSION,
  assertSubmissionExecution,
  assertSubmissionEvidenceRecord,
  buildSubmissionEvidence,
  renderSubmissionMarkdown,
} from "../../scripts/submissionEvidenceLib.mjs";

const TX = "0x" + "1".repeat(64);
const RECEIPT_HASH = "0x" + "2".repeat(64);
const DIGEST = "0x" + "3".repeat(64);
const FILE_SHA = "0x" + "4".repeat(64);
const TRADER = "0x" + "5".repeat(40);

function execution(overrides = {}) {
  return {
    verified: true,
    chainId: 5042,
    contract: SUBMISSION.settlement,
    transactionHash: TX,
    blockNumber: 25000000,
    trader: TRADER,
    tokenIn: SUBMISSION.usdc,
    tokenOut: SUBMISSION.usyc,
    amountInRaw: "1000000",
    amountOutRaw: "900000",
    executionReceiptHash: RECEIPT_HASH,
    isTreasuryFlow: true,
    certificateMatched: true,
    certificateAnchored: false,
    ...overrides,
  };
}

function certificate(overrides = {}) {
  return {
    receiptId: "rcpt-mainnet-proof",
    integrityDigest: DIGEST,
    mode: "mainnet",
    status: "confirmed",
    ...overrides,
  };
}

function infrastructure(overrides = {}) {
  return {
    chainId: 5042,
    headBlock: 25000010,
    runtimeKeccak256: SUBMISSION.runtimeKeccak256,
    ...overrides,
  };
}

describe("submission evidence fail-closed model", () => {
  it("accepts only a verified USDC/USYC execution with a matching certificate", () => {
    expect(assertSubmissionExecution(execution())).toBe(true);
    expect(() => assertSubmissionExecution(execution({ isTreasuryFlow: false }))).toThrow(/treasury route/i);
    expect(() => assertSubmissionExecution(execution({ certificateMatched: false }))).toThrow(/certificate/i);
    expect(() => assertSubmissionExecution(execution({ tokenOut: "0x" + "6".repeat(40) }))).toThrow(/USDC\/USYC/i);
  });

  it("builds deterministic public links from the observed transaction", () => {
    const evidence = buildSubmissionEvidence({
      execution: execution(),
      certificate: certificate(),
      infrastructure: infrastructure(),
      receiptFileSha256: FILE_SHA,
      receiptFileName: "receipt.json",
      generatedAt: "2026-10-08T22:00:00.000Z",
    });

    expect(evidence.publicLinks.execution).toBe(`${SUBMISSION.explorerBase}/tx/${TX}`);
    expect(evidence.publicLinks.reviewer).toBe(`${SUBMISSION.appUrl}?verify=${TX}`);
    expect(evidence.claims.successfulSettlementTransaction).toBe(true);
    expect(evidence.claims.sourceReproductionOfV1).toBe(false);
    expect(assertSubmissionEvidenceRecord(evidence)).toBe(true);
  });

  it("rejects simulation receipts and wrong runtime fingerprints", () => {
    expect(() => buildSubmissionEvidence({
      execution: execution(),
      certificate: certificate({ mode: "simulation", status: "simulated" }),
      infrastructure: infrastructure(),
      receiptFileSha256: FILE_SHA,
      receiptFileName: "receipt.json",
    })).toThrow(/confirmed mainnet/i);

    expect(() => buildSubmissionEvidence({
      execution: execution(),
      certificate: certificate(),
      infrastructure: infrastructure({ runtimeKeccak256: "0x" + "9".repeat(64) }),
      receiptFileSha256: FILE_SHA,
      receiptFileName: "receipt.json",
    })).toThrow(/fingerprint/i);
  });

  it("renders a reviewer-facing proof document with the transaction and claim boundary", () => {
    const evidence = buildSubmissionEvidence({
      execution: execution(),
      certificate: certificate(),
      infrastructure: infrastructure(),
      receiptFileSha256: FILE_SHA,
      receiptFileName: "receipt.json",
      generatedAt: "2026-10-08T22:00:00.000Z",
    });
    const md = renderSubmissionMarkdown(evidence);
    expect(md).toContain(TX);
    expect(md).toContain("USDC/USYC treasury route: **PASS**");
    expect(md).toContain("Strict source reproduction");
  });
});

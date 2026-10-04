import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("security regression guards", () => {
  it("keeps live agent mandates blocked until the hardened successor is deployed", () => {
    const store = source("src/store/useAppStore.ts");
    expect(store).toContain("Live Agent Mandates Disabled");
    expect(store).toContain("deployed settlement is v1");
  });

  it("binds the hardened agent executor to concrete token pairs", () => {
    const contract = source("contracts/InterminalSettlementV2.sol");
    expect(contract).toContain('require(execution.pairIndex < 4, "Interminal: invalid agent pair index")');
    expect(contract).toContain("require(execution.tokenIn == ARC_USDC_ERC20");
    expect(contract).toContain("execution.tokenOut == _agentPairTokenOut(execution.pairIndex)");
    expect(contract).toContain("mandate.maxSlippageBps");
  });

  it("does not accept deployment private keys through argv", () => {
    const deploy = source("scripts/deploy.mjs");
    expect(deploy).toContain("const privateKey = process.env.PRIVATE_KEY;");
    expect(deploy).not.toContain("process.argv[2]");
  });

  it("keeps imported tokens isolated from verified markets and live execution", () => {
    const store = source("src/store/useAppStore.ts");
    expect(store).toContain('const pairKey = "CUSTOM/" + sym + "-" + addr.slice(2, 8).toUpperCase() + "/USDC"');
    expect(store).toContain('p.cat === "imported"');
    expect(store).toContain("view-only until its contract is independently verified");
  });

  it("pins approval writes to the verified settlement and token registry", () => {
    const rpc = source("src/lib/arc/rpcClient.ts");
    expect(rpc).toContain("Approval token is not in the verified Arc token registry");
    expect(rpc).toContain("Approval spender is not the verified Interminal settlement contract");
  });

  it("rejects non-GET market proxy requests and caps candle requests", () => {
    const api = source("api/market-data.ts");
    expect(api).toContain('if (req.method !== "GET")');
    expect(api).toContain("Math.min(Math.max(requestedCount, 2), 500)");
  });
});

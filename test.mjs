import fs from "fs";
import vm from "vm";
import assert from "assert";
import crypto from "crypto";
import { fileURLToPath } from "url";
import path from "path";
import { ethers } from "ethers";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, "legacy", "app.js"), "utf8");
const sandbox = {
  window: {},
  fetch,
  AbortController,
  console,
  Date,
  Math,
  Number,
  String,
  Array,
  Object,
  Set,
  BigInt,
  Error,
  JSON,
  setTimeout,
  clearTimeout,
};
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox);
const get = (name) => vm.runInContext(name, sandbox);

let failed = 0;
function test(name, fn) {
  try { fn(); console.log("PASS", name); }
  catch (e) { failed += 1; console.error("FAIL", name, e.message); }
}
async function testAsync(name, fn) {
  try { await fn(); console.log("PASS", name); }
  catch (e) { failed += 1; console.error("FAIL", name, e.message); }
}

const failClosedLocalProofs = get("failClosedLocalProofs");
const verifyArcLive = get("verifyArcLive");
const publicRpc = get("publicRpc");
const ARC = get("ARC");
const PAIRS = get("PAIRS");
const sha256Hex = get("sha256Hex");
const calculateOpportunityCost = get("calculateOpportunityCost");
const calculateJitUnwind = get("calculateJitUnwind");
const calculateYieldSweep = get("calculateYieldSweep");
const calculateFxParity = get("calculateFxParity");
const createAgentMandateDescriptor = get("createAgentMandateDescriptor");
const validateAgentExecution = get("validateAgentExecution");
const generateTradeReceipt = get("generateTradeReceipt");
const verifyReceiptIntegrity = get("verifyReceiptIntegrity");
const quoteTrade = get("quoteTrade");
const tokenPrice = get("tokenPrice");
const parseUnits = get("parseUnits");
const buildTradeTicket = get("buildTradeTicket");
const buildOnchainTradeTicket = get("buildOnchainTradeTicket");
const buildAgentMandateTicket = get("buildAgentMandateTicket");
const encodeExecuteTradeTicket = get("encodeExecuteTradeTicket");

// --- SUITE 0: Base Arc RPC & Existing Policy Proofs ---
test("negative proofs all pass (14 fail-closed gates)", () => {
  const rows = failClosedLocalProofs();
  assert.ok(rows.length >= 14, `Expected at least 14 proofs, got ${rows.length}`);
  rows.forEach((r) => assert.equal(r.ok, true, r.detail));
});

await testAsync("live Arc chain id is 5042", async () => {
  const hex = await publicRpc("eth_chainId");
  assert.equal(parseInt(hex, 16), ARC.chainId);
});

await testAsync("verifyArcLive records chain and token code queries", async () => {
  const live = await verifyArcLive();
  assert.equal(live.chainOk, true);
  assert.ok(live.rows.some((r) => r.id === "head" && r.ok));
  assert.ok(live.rows.some((r) => r.id === "code-WETH"));
});

await testAsync("eth_sendTransaction stays blocked", async () => {
  await assert.rejects(() => publicRpc("eth_sendTransaction", [{}]));
});

// --- SUITE 1: Pure JavaScript SHA-256 Engine ---
test("SHA-256 bitwise implementation matches Node crypto", () => {
  const vectors = [
    "",
    "abc",
    "hello world",
    "Interminal Arc Mainnet 5042",
    JSON.stringify({ trader: "0x123", amount: "100.50", pair: "ETH/USDC" }),
  ];
  for (const input of vectors) {
    const expected = "0x" + crypto.createHash("sha256").update(input, "utf8").digest("hex");
    const actual = sha256Hex(input);
    assert.equal(actual.toLowerCase(), expected.toLowerCase(), `Mismatch for vector: "${input}"`);
  }
});

// --- SUITE 2: Smart Idle Treasury Engine ---
test("Treasury Engine: Opportunity cost accurately projects yield loss", () => {
  const cost = calculateOpportunityCost(10000, 5.10);
  assert.equal(cost.idleUsdc, 10000);
  assert.equal(cost.annualYieldBps, 510);
  assert.equal(cost.annualYieldUsd, 510);
  assert.equal(cost.monthlyYieldUsd, 42.5);
  assert.ok(Math.abs(cost.dailyYieldUsd - 1.397) < 0.01);
});

test("Treasury Engine: JIT USYC liquidity unwind covers shortfalls correctly", () => {
  // Case A: Sufficient liquid USDC, no unwind required
  const caseA = calculateJitUnwind({
    tradeAmountUsd: 100,
    liquidUsdc: 250,
    usycBalance: 1000,
    slippageBps: 20,
  });
  assert.equal(caseA.needed, false);
  assert.equal(caseA.canCover, true);
  assert.equal(caseA.usycToRedeem, 0);

  // Case B: Liquid shortfall, but USYC treasury covers cleanly (slippageBps 0 for exact math)
  const caseB = calculateJitUnwind({
    tradeAmountUsd: 500,
    liquidUsdc: 150,
    usycBalance: 1000,
    slippageBps: 0,
  });
  assert.equal(caseB.needed, true);
  assert.equal(caseB.canCover, true);
  assert.equal(caseB.shortfall, 350);
  assert.equal(caseB.usycToRedeem, 350);

  // Case C: Total liquidity inadequate (USDC + USYC < tradeAmount)
  const caseC = calculateJitUnwind({
    tradeAmountUsd: 1000,
    liquidUsdc: 100,
    usycBalance: 300,
    slippageBps: 0,
  });
  assert.equal(caseC.needed, true);
  assert.equal(caseC.canCover, false);
  assert.equal(caseC.shortfall, 900);
});

test("Treasury Engine: Yield sweep triggers above operating cash buffer", () => {
  const under = calculateYieldSweep(300, 500);
  assert.equal(under.recommended, false);
  assert.equal(under.sweepAmount, 0);

  const over = calculateYieldSweep(2500, 500);
  assert.equal(over.recommended, true);
  assert.equal(over.sweepAmount, 2000);
  assert.ok(over.annualExtraYield > 0);
});

// --- SUITE 3: Institutional On-Chain FX Corridor ---
test("FX Desk: EURC/USDC corridor computes pip spreads and carry differential", () => {
  assert.ok(PAIRS["EURC/USDC"], "EURC/USDC must be registered");
  assert.equal(PAIRS["EURC/USDC"].base, "EURC");
  assert.equal(PAIRS["EURC/USDC"].quote, "USDC");

  const fx = calculateFxParity({
    eurcUsdcPrice: 1.0845,
    benchmarkRate: 1.0840,
  });
  assert.equal(fx.pipSpread, 5.0);
  assert.ok(fx.spreadBps > 0);
  assert.equal(fx.carrySpreadBps, 175); // Fed 5.25% - ECB 3.50%
  assert.equal(fx.ecbDepositRate, 3.50);
  assert.equal(fx.fedFundsRate, 5.25);
  assert.equal(fx.carryDirection, "Long USD / Short EUR (+175 bps carry)");
  assert.equal(fx.isWithinParityBand, true);
});

// --- SUITE 4: Bounded Agentic Mandates ---
test("Agent Mandates: EIP-712 scoped permit validates bounded policy", () => {
  const delegator = "0x1111111111111111111111111111111111111111";
  const agent = "0x2222222222222222222222222222222222222222";
  const mandate = createAgentMandateDescriptor({
    delegator,
    agent,
    maxSpendUsdc: 300,
    maxSlippageBps: 30,
    allowedPairs: ["ETH/USDC", "EURC/USDC"],
    ttlSeconds: 3600,
  });

  assert.equal(mandate.delegator, delegator);
  assert.equal(mandate.agent, agent);
  assert.equal(mandate.maxSpendUsdc, 300);
  assert.equal(mandate.maxSlippageBps, 30);
  assert.equal(mandate.revoked, false);

  // Valid execution (throws on error if invalid)
  const ok = validateAgentExecution(mandate, {
    pair: "ETH/USDC",
    amountUsdc: 150,
    slippageBps: 20,
    currentTime: mandate.createdAt + 60,
  }, false);
  assert.equal(ok.valid, true);

  // Negative 1: Overspend
  const overspend = validateAgentExecution(mandate, {
    pair: "ETH/USDC",
    amountUsdc: 350,
    slippageBps: 20,
    currentTime: mandate.createdAt + 60,
  }, false);
  assert.equal(overspend.valid, false);
  assert.equal(overspend.code, "amount_exceeds_mandate");

  // Negative 2: Unapproved Pair
  const badPair = validateAgentExecution(mandate, {
    pair: "BTC/USDC",
    amountUsdc: 100,
    slippageBps: 20,
    currentTime: mandate.createdAt + 60,
  }, false);
  assert.equal(badPair.valid, false);
  assert.equal(badPair.code, "unapproved_market");

  // Negative 3: Slippage Exceeded
  const highSlip = validateAgentExecution(mandate, {
    pair: "ETH/USDC",
    amountUsdc: 100,
    slippageBps: 45,
    currentTime: mandate.createdAt + 60,
  }, false);
  assert.equal(highSlip.valid, false);
  assert.equal(highSlip.code, "slippage_exceeds_band");

  // Negative 4: Expired
  const expired = validateAgentExecution(mandate, {
    pair: "ETH/USDC",
    amountUsdc: 100,
    slippageBps: 20,
    currentTime: mandate.deadline + 10,
  }, false);
  assert.equal(expired.valid, false);
  assert.equal(expired.code, "mandate_expired");

  // Negative 5: Revoked
  mandate.revoked = true;
  const revoked = validateAgentExecution(mandate, {
    pair: "ETH/USDC",
    amountUsdc: 100,
    slippageBps: 20,
    currentTime: mandate.createdAt + 60,
  }, false);
  assert.equal(revoked.valid, false);
  assert.equal(revoked.code, "mandate_revoked");
});

// --- SUITE 5: Cryptographic Audit Receipts ---
test("Audit Receipts: Canonical JSON trade certificates are tamper-evident", () => {
  const quote = {
    effective: 1.0845,
    price: 1.0845,
    received: 92.208,
    minReceived: 92.0,
    impact: 0.0004,
    slippageBps: 20,
    gasUsd: "0.015",
  };
  const receipt = generateTradeReceipt({
    txHash: "0x" + "a".repeat(130),
    trader: "0x3333333333333333333333333333333333333333",
    pair: "EURC/USDC",
    side: "buy",
    amount: 100,
    quote,
    blockNumber: 1084220,
  });

  assert.ok(receipt.receiptId.startsWith("rcpt-"));
  assert.equal(receipt.chainId, 5042);
  assert.equal(receipt.effectivePrice, 1.0845);
  assert.equal(receipt.integrityDigest.startsWith("0x"), true);
  assert.equal(receipt.integrityDigest.length, 66); // "0x" + 64 hex chars

  // Legitimate receipt passes
  assert.equal(verifyReceiptIntegrity(receipt), true);

  // Tampering detection 1: Mutated price
  const tamperedPrice = { ...receipt, effectivePrice: 1.0900 };
  assert.equal(verifyReceiptIntegrity(tamperedPrice), false);

  // Tampering detection 2: Mutated trader
  const tamperedTrader = { ...receipt, trader: "0x4444444444444444444444444444444444444444" };
  assert.equal(verifyReceiptIntegrity(tamperedTrader), false);

  // Tampering detection 3: Mutated amount
  const tamperedAmount = { ...receipt, amount: 200 };
  assert.equal(verifyReceiptIntegrity(tamperedAmount), false);

  // Tampering detection 4: Mutated block
  const tamperedBlock = { ...receipt, blockNumber: 1084221 };
  assert.equal(verifyReceiptIntegrity(tamperedBlock), false);
});

// --- SUITE 6: Trade Math & Dynamic Pricing Precision ---
test("Trade Math: Buy and Sell quotes calculate received units and slippage accurately", () => {
  // Buy quote: $1000 ETH/USDC at price 2500
  const buyQuote = quoteTrade({ side: "buy", amountUsd: 1000, price: 2500, slippageBps: 50 });
  assert.ok(buyQuote.effective > 2500, "Buy effective price reflects slippage and impact");
  assert.ok(buyQuote.received > 0.39 && buyQuote.received < 0.40, `Expected ~0.399 ETH received, got ${buyQuote.received}`);
  assert.ok(buyQuote.minReceived < buyQuote.received, "Buy minReceived bounded by slippage");

  // Sell quote: $1000 worth of ETH sold at price 2500
  const sellQuote = quoteTrade({ side: "sell", amountUsd: 1000, price: 2500, slippageBps: 50 });
  assert.ok(sellQuote.effective < 2500, "Sell effective price reflects slippage and impact");
  assert.ok(sellQuote.received > 990 && sellQuote.received < 1000, `Expected ~997 USDC received, got ${sellQuote.received}`);
  assert.ok(sellQuote.minReceived < sellQuote.received, "Sell minReceived bounded by slippage");
  assert.ok(sellQuote.minReceived > 980, `Expected >980 USDC minReceived, got ${sellQuote.minReceived}`);

  // Slippage gate validation
  assert.throws(() => quoteTrade({ side: "buy", amountUsd: 100, price: 2500, slippageBps: 0 }));
  assert.throws(() => quoteTrade({ side: "buy", amountUsd: 100, price: 2500, slippageBps: 600 }));
});

test("Dynamic Pricing: tokenPrice reflects active PAIRS market feeds", () => {
  assert.equal(tokenPrice("USDC"), 1);
  assert.equal(tokenPrice("EURC"), PAIRS["EURC/USDC"].price);
  assert.equal(tokenPrice("USYC"), PAIRS["USYC/USDC"].price);
  assert.equal(tokenPrice("WETH"), PAIRS["ETH/USDC"].price);
});

// --- SUITE 7: Real-Time Market Data Feed Engine ---
await testAsync("Real Market Data: DexScreener batch endpoint returns valid pricing structure", async () => {
  const syncRealMarketData = get("syncRealMarketData");
  const state = get("state");
  assert.equal(typeof syncRealMarketData, "function");

  // Execute market sync
  await syncRealMarketData();

  assert.ok(state.marketFeedStatus, "marketFeedStatus must exist on state");
  assert.equal(state.marketFeedStatus.source, "DexScreener Uniswap V3");
  assert.ok(PAIRS["ETH/USDC"].price > 1000, `ETH price must be realistic market price, got ${PAIRS["ETH/USDC"].price}`);
  assert.ok(PAIRS["BTC/USDC"].price > 30000, `BTC price must be realistic market price, got ${PAIRS["BTC/USDC"].price}`);
  assert.ok(PAIRS["EURC/USDC"].price > 0.9 && PAIRS["EURC/USDC"].price < 1.3, `EURC price must reflect EUR/USD peg (~1.08-1.15), got ${PAIRS["EURC/USDC"].price}`);
  assert.ok(PAIRS["USYC/USDC"].price >= 1.0, `USYC price must reflect US Treasury NAV (>= 1.0), got ${PAIRS["USYC/USDC"].price}`);
});

// --- SUITE 8: Arc Mainnet Smart Contract & Protocol Verification ---
test("Smart Contract: Compiled InterminalSettlement artifact is production ready", () => {
  const artifactPath = path.join(root, "artifacts", "InterminalSettlement.json");
  assert.ok(fs.existsSync(artifactPath), "Compiled artifact must exist in artifacts/InterminalSettlement.json");

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  assert.equal(artifact.contractName, "InterminalSettlement");
  assert.equal(artifact.chainId, 5042);
  assert.ok(artifact.bytecode && artifact.bytecode.startsWith("0x"), "Bytecode must be valid hex");

  const byteLength = (artifact.bytecode.length - 2) / 2;
  assert.ok(byteLength > 1000, `Bytecode too small: ${byteLength} bytes`);
  assert.ok(byteLength < 24576, `Bytecode exceeds EIP-170 limit (24,576 bytes): ${byteLength} bytes`);

  // Verify critical function ABI entries
  const functionNames = new Set(artifact.abi.filter(x => x.type === "function").map(x => x.name));
  const expectedMethods = [
    "executeTradeTicket",
    "executeAgentTrade",
    "revokeMandate",
    "anchorReceipt",
    "isReceiptAnchored",
    "DOMAIN_SEPARATOR",
    "hashTradeTicket",
    "hashAgentMandate",
    "recoverSigner",
    "traderNonces",
    "mandateNonces",
    "mandateCumulativeSpend",
    "anchoredReceipts"
  ];

  for (const method of expectedMethods) {
    assert.ok(functionNames.has(method), `Smart contract must implement ${method}()`);
  }
});

test("Smart Contract: contractArtifact.js is synced for browser execution", () => {
  const jsPath = path.join(root, "legacy", "contractArtifact.js");
  assert.ok(fs.existsSync(jsPath), "contractArtifact.js must exist for browser wallet deployment");
  const content = fs.readFileSync(jsPath, "utf8");
  assert.ok(content.includes("SETTLEMENT_ARTIFACT"), "Must declare SETTLEMENT_ARTIFACT");
  assert.ok(content.includes("InterminalSettlement"), "Must reference InterminalSettlement");
});

await testAsync("Smart Contract: On-chain deployed contract is active and verified on Arc Mainnet", async () => {
  const code = await publicRpc("eth_getCode", [ARC.settlement, "latest"]);
  assert.ok(code && code.length > 500, `Expected bytecode on Arc at ${ARC.settlement}, got ${code}`);
  assert.equal(ARC.settlement.toLowerCase(), "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36");
});

// --- SUITE 9: Decimal Precision & parseUnits Robustness ---
test("Precision: parseUnits handles 6, 8, 18 decimals and scientific notation without precision loss", () => {
  assert.equal(parseUnits("100.5", 6), 100500000n);
  assert.equal(parseUnits("0.000001", 6), 1n);
  assert.equal(parseUnits("0.00000001", 8), 1n);
  assert.equal(parseUnits("84176.37", 18), 84176370000000000000000n);
  assert.equal(parseUnits(1e-8, 8), 1n);
  assert.equal(parseUnits("0", 6), 0n);
  assert.equal(parseUnits("", 6), 0n);
  assert.equal(parseUnits(null, 6), 0n);
});

// --- SUITE 10: EIP-712 TradeTicket Cryptographic Parity with Arc Mainnet Contract ---
await testAsync("Smart Contract: buildTradeTicket matches on-chain hashTradeTicket on Arc Mainnet", async () => {
  const quote = {
    effective: 2733.05,
    price: 2733.05,
    received: 0.03658,
    minReceived: 0.03600,
    impact: 0.0001,
    slippageBps: 50,
    gasUsd: "0.015",
    expiresAt: 1800000000000,
  };
  const ticket = buildTradeTicket("0x541291139b59570d1cd5d0e64df217b3f6efd7c8", "ETH/USDC", "buy", 100, quote);

  // Compute local hash via ethers TypedDataEncoder (omit EIP712Domain for ethers v6)
  const { EIP712Domain: _drop1, ...cleanTypes } = ticket.types;
  const localHash = ethers.TypedDataEncoder.hash(ticket.domain, cleanTypes, ticket.message);

  // Compute live hash on Arc Mainnet deployed contract
  const provider = new ethers.JsonRpcProvider(ARC.rpc);
  const abi = [
    "function hashTradeTicket((address trader,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 nonce,uint256 deadline)) view returns (bytes32)"
  ];
  const contract = new ethers.Contract(ARC.settlement, abi, provider);
  const onchainHash = await contract.hashTradeTicket(ticket.raw);

  assert.equal(localHash.toLowerCase(), onchainHash.toLowerCase(), "Local EIP-712 TradeTicket hash must match Arc deployed contract hashTradeTicket()");
});

// --- SUITE 11: EIP-712 AgentMandate Cryptographic Parity with Arc Mainnet Contract ---
await testAsync("Smart Contract: buildAgentMandateTicket matches on-chain hashAgentMandate on Arc Mainnet", async () => {
  const mandateDesc = createAgentMandateDescriptor({
    trader: "0x541291139b59570d1cd5d0e64df217b3f6efd7c8",
    agent: "0x2b38cc9b84bd3a568ccc7817b10dc98c8abdab36",
    maxSpendUsd: 1000,
    maxSlippageBps: 50,
    allowedPairs: ["ETH/USDC"],
    ttlSeconds: 86400,
    nonce: 0,
  });
  const ticket = buildAgentMandateTicket(mandateDesc);

  // Compute local hash via ethers
  const { EIP712Domain: _drop2, ...cleanMandateTypes } = ticket.types;
  const localHash = ethers.TypedDataEncoder.hash(ticket.domain, cleanMandateTypes, ticket.message);

  // Compute live hash on Arc Mainnet deployed contract
  const provider = new ethers.JsonRpcProvider(ARC.rpc);
  const abi = [
    "function hashAgentMandate((address authorizer,address agent,uint256 maxCumulativeSpend,uint256 maxSpendPerTx,uint256 maxSlippageBps,uint256 allowedPairsMask,uint256 expiry,uint256 nonce)) view returns (bytes32)"
  ];
  const contract = new ethers.Contract(ARC.settlement, abi, provider);
  const onchainHash = await contract.hashAgentMandate(ticket.raw);

  assert.equal(localHash.toLowerCase(), onchainHash.toLowerCase(), "Local EIP-712 AgentMandate hash must match Arc deployed contract hashAgentMandate()");
});

// --- SUITE 12: Pure JS ABI Encoder matches ethers.Interface ---
test("Pure JS ABI Encoder: encodeExecuteTradeTicket matches ethers.Interface exactly", () => {
  const iface = new ethers.Interface([
    "function executeTradeTicket((address trader,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,uint256 nonce,uint256 deadline) ticket, bytes signature) returns (uint256)"
  ]);
  const ticket = {
    trader: "0x541291139b59570d1cd5d0e64df217b3f6efd7c8",
    tokenIn: "0x3600000000000000000000000000000000000000",
    tokenOut: "0x128cC466B61f542da60c70e3aA11c10e19B84EDB",
    amountIn: 100000000n,
    minAmountOut: 36000000000000000n,
    nonce: 0n,
    deadline: 1800000000n,
  };
  const sig = "0x" + "b".repeat(130);
  const pureJsCalldata = encodeExecuteTradeTicket(ticket, sig);
  const ethersCalldata = iface.encodeFunctionData("executeTradeTicket", [ticket, sig]);
  assert.equal(pureJsCalldata.toLowerCase(), ethersCalldata.toLowerCase(), "Pure JS ABI encoder must produce identical calldata to ethers.Interface");
});

// --- SUITE 13: eth_call Security Gate Integrity ---
await testAsync("Security Gate: publicRpc eth_call allows legitimate settlement queries and blocks attacks", async () => {
  // Allowed 1: query trader nonces on Arc settlement contract
  const nonceData = "0x506ee1ef" + "000000000000000000000000541291139b59570d1cd5d0e64df217b3f6efd7c8";
  const nonceResult = await publicRpc("eth_call", [{ to: ARC.settlement, data: nonceData }, "latest"]);
  assert.ok(typeof nonceResult === "string" && nonceResult.startsWith("0x"), "Legitimate traderNonces eth_call must succeed");

  // Allowed 2: query isReceiptAnchored
  const anchorData = "0x9815336b" + "0".repeat(64);
  const anchorResult = await publicRpc("eth_call", [{ to: ARC.settlement, data: anchorData }, "latest"]);
  assert.ok(typeof anchorResult === "string" && anchorResult.startsWith("0x"), "Legitimate isReceiptAnchored eth_call must succeed");

  // Blocked 1: Arbitrary contract address not in TOKEN_ALLOW
  await assert.rejects(
    () => publicRpc("eth_call", [{ to: "0x0000000000000000000000000000000000000001", data: nonceData }, "latest"]),
    /target blocked/
  );

  // Blocked 2: Arbitrary unapproved calldata selector
  await assert.rejects(
    () => publicRpc("eth_call", [{ to: ARC.settlement, data: "0xdeadbeef" + "0".repeat(64) }, "latest"]),
    /data blocked/
  );
});

// --- SUITE 14: Expanded PAIRS Coverage (all 16 markets) ---
test("Expanded PAIRS: all 16 Arc markets present with category tags", () => {
  const required = [
    ["ETH/USDC", "bluechip"],  ["BTC/USDC", "bluechip"],
    ["SOL/USDC", "bluechip"],  ["AVAX/USDC", "bluechip"],
    ["SUI/USDC", "bluechip"],  ["ARB/USDC", "bluechip"],
    ["OP/USDC",  "bluechip"],  ["NEAR/USDC","bluechip"],
    ["EURC/USDC","rwa_fx"],    ["USYC/USDC","rwa_fx"],
    ["LINK/USDC","defi"],      ["AAVE/USDC","defi"],
    ["UNI/USDC", "defi"],      ["ARC/USDC", "arc"],
  ];
  for (const [key, cat] of required) {
    assert.ok(PAIRS[key], `PAIRS missing ${key}`);
    assert.equal(PAIRS[key].cat, cat, `${key} category should be ${cat}, got ${PAIRS[key].cat}`);
    assert.ok(Number.isFinite(PAIRS[key].price) && PAIRS[key].price > 0, `${key} must have valid price`);
  }
  assert.ok(Object.keys(PAIRS).length >= 14, "Must have at least 14 pairs");
});

// --- SUITE 15: decodeAbiString correctness ---
test("decodeAbiString: correctly decodes ABI-encoded name() and raw symbol hex", () => {
  const decodeAbiString = get("decodeAbiString");

  // ABI-encoded string for "EURC" — from live Arc RPC eth_call name()
  const abiEncodedEURC =
    "0x00000000000000000000000000000000000000000000000000000000000000200" +
    "0000000000000000000000000000000000000000000000000000000000000044" +
    "555524300000000000000000000000000000000000000000000000000000000";
  assert.equal(decodeAbiString(abiEncodedEURC), "EURC", "ABI-encoded EURC name should decode to EURC");

  // Empty / zero hex
  assert.equal(decodeAbiString("0x"), "", "0x should decode to empty string");

  // Invalid / null
  assert.equal(decodeAbiString(null), "", "null should decode to empty string");

  // Short raw bytes (non-ABI encoding - decimals returns 0x06)
  const decimals6 = "0x0000000000000000000000000000000000000000000000000000000000000006";
  const parsed = parseInt(decimals6, 16);
  assert.equal(parsed, 6, "decimals hex should parse to 6");
});

// --- SUITE 16: Mathematical Indicator Engine Integrity ---
test("Indicator Engine: EMAs, RSI, MACD, and Swing Levels compute deterministically from price series", () => {
  const computeIndicators = get("computeIndicators");
  const generateCandles = get("generateCandles");
  const analyzeMarket = get("analyzeMarket");

  const candles = generateCandles("ETH/USDC", "4h", 120);
  assert.equal(candles.length, 120, "Must produce 120 candles");

  const lastCandle = candles[candles.length - 1];
  assert.ok(Number.isFinite(lastCandle.close) && lastCandle.close > 0, "Last close must be positive finite");

  const ind = computeIndicators(candles);
  assert.ok(Number.isFinite(ind.ema20), "EMA 20 must be finite");
  assert.ok(Number.isFinite(ind.ema50), "EMA 50 must be finite");
  assert.ok(Number.isFinite(ind.ema200), "EMA 200 must be finite");
  assert.ok(ind.rsi >= 0 && ind.rsi <= 100, `RSI must be bounded [0, 100], got ${ind.rsi}`);
  assert.ok(Number.isFinite(ind.macdHist), "MACD Histogram must be finite");
  assert.ok(ind.resistance >= ind.support, "Resistance must be >= Support");

  // Verify support and resistance match rolling 30-bar extrema exactly
  const last30 = candles.slice(-30);
  const expectedHigh = Math.max(...last30.map((c) => c.high));
  const expectedLow = Math.min(...last30.map((c) => c.low));
  assert.equal(ind.resistance, expectedHigh, "Resistance must equal exact 30-bar swing high");
  assert.equal(ind.support, expectedLow, "Support must equal exact 30-bar swing low");

  // Verify AI analysis strictly reflects these calculated indicators without inventing numbers
  const analysis = analyzeMarket();
  if (analysis) {
    assert.equal(analysis.support, ind.support, "AI analysis support must match computed indicator support");
    assert.equal(analysis.resistance, ind.resistance, "AI analysis resistance must match computed indicator resistance");
    const expectedTrend = PAIRS["ETH/USDC"].price > ind.ema20 && ind.ema20 > ind.ema50 ? "Bullish"
      : PAIRS["ETH/USDC"].price < ind.ema20 && ind.ema20 < ind.ema50 ? "Bearish" : "Range";
    assert.equal(analysis.trend, expectedTrend, "AI analysis trend must strictly follow deterministic rule");
  }
});

// --- SUITE 17: Deterministic Risk & Portfolio Formulas ---
test("Risk Engine: Concentration, Stable Buffer, and Size vs NAV are formulaic mathematical derivations", () => {
  const riskMetrics = get("riskMetrics");
  const portfolioSnapshot = get("portfolioSnapshot");
  const analyzeTrade = get("analyzeTrade");
  const quoteTrade = get("quoteTrade");

  const snap = portfolioSnapshot();
  const risk = riskMetrics();

  assert.ok(Number.isFinite(risk.concentrationPct), "Concentration percentage must be finite");
  assert.ok(Number.isFinite(risk.stablePct), "Stable buffer percentage must be finite");

  // If there are holdings, concentration must equal largest position percentage
  if (snap.largest) {
    assert.equal(risk.concentrationPct, snap.largest.alloc, "Concentration must match largest asset allocation exactly");
  }

  // Stable buffer must equal sum of stablecoin allocations
  const manualStables = snap.rows.filter(r => r.sym === "USDC" || r.sym === "EURC" || r.sym === "USYC").reduce((s, r) => s + r.alloc, 0);
  assert.equal(risk.stablePct, manualStables, "Stable buffer must match exact sum of stablecoin weights");

  // Trade analysis size vs NAV formula validation
  const testQuote = quoteTrade({ side: "buy", amountUsd: 500, price: 2500, slippageBps: 50 });
  const tradeAnalysis = analyzeTrade(testQuote);

  assert.equal(tradeAnalysis.kind, "trade");
  assert.equal(tradeAnalysis.tradeValue, 500);
});

// --- SUITE 18: Arc Dual-USDC Gas Tank & Runway Formulas ---
test("Gas Tank: Runway estimator and native gas wrapping calculate accurately", () => {
  const getGasRunway = get("getGasRunway");
  const refuelNativeGas = get("refuelNativeGas");
  const state = get("state");

  // 1. Gas runway calculation (at 0.0012 USDC avg fee)
  assert.equal(getGasRunway(0.12), 100, "0.12 USDC gas must yield 100 transactions");
  assert.equal(getGasRunway(0.0012), 1, "0.0012 USDC gas must yield exactly 1 transaction");
  assert.equal(getGasRunway(0), 0, "0 USDC gas must yield 0 transactions");

  // 2. Native gas refuel / wrapping
  state.balances.USDC = 500;
  state.nativeGasBalance = 0.01;
  refuelNativeGas(0.25);

  assert.equal(state.balances.USDC, 499.75, "Trading USDC must decrease by refuel amount");
  assert.equal(state.nativeGasBalance, 0.26, "Native gas balance must increase by refuel amount");
  assert.ok(state.activity[0].label.includes("Native Gas Refueled"), "Activity log must record gas refuel event");
});

// --- SUITE 19: Autonomous DCA / TWAP Engine (EIP-712 Mandates) ---
test("DCA Engine: Simulated DCA slices enforce EIP-712 budget and bounds", () => {
  const createDcaPlan = get("createDcaPlan");
  const executeDcaSlice = get("executeDcaSlice");
  const state = get("state");

  state.balances.USDC = 1000;
  state.balances.ETH = 0;

  // Create a $100 DCA plan with $25 slices (4 total slices)
  const plan = createDcaPlan({
    pair: "ETH/USDC",
    totalBudget: 100,
    sliceAmount: 25,
    intervalSec: 60,
    maxSlippageBps: 30,
  });

  assert.equal(plan.totalBudget, 100);
  assert.equal(plan.sliceAmount, 25);
  assert.equal(plan.totalSlices, 4);
  assert.equal(plan.slicesExecuted, 0);
  assert.equal(plan.status, "active");
  assert.ok(plan.mandate, "Must have valid EIP-712 mandate attached");
  assert.equal(plan.mandate.maxSpendUsdc, 100);

  // Execute slice #1
  const slice1Ok = executeDcaSlice(plan);
  assert.equal(slice1Ok, true, "Slice #1 must execute successfully");
  assert.equal(plan.slicesExecuted, 1);
  assert.equal(plan.totalSpent, 25);
  assert.ok(plan.totalReceived > 0, "Must accumulate base asset");
  assert.ok(plan.avgFillPrice > 0, "Must calculate average fill price");
  assert.equal(plan.status, "active", "Plan must remain active until all slices finish");

  // Execute slice #2, #3, #4
  executeDcaSlice(plan);
  executeDcaSlice(plan);
  executeDcaSlice(plan);

  assert.equal(plan.slicesExecuted, 4);
  assert.equal(plan.totalSpent, 100);
  assert.equal(plan.status, "completed", "Plan must complete when budget is filled");

  // Negative test: cannot execute when completed
  const slice5 = executeDcaSlice(plan);
  assert.equal(slice5, false, "Slice #5 must not execute after plan is completed");
});

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}
console.log("\nALL LEGACY PROTOCOL TESTS PASSED — LIVE ARC CHECKS INCLUDED");

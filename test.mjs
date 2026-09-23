import fs from "fs";
import vm from "vm";
import assert from "assert";
import { fileURLToPath } from "url";
import path from "path";

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, "app.js"), "utf8");
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

test("negative proofs all pass", () => {
  const rows = failClosedLocalProofs();
  assert.ok(rows.length >= 4);
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

if (failed) {
  console.error("\n" + failed + " failed");
  process.exit(1);
}
console.log("\nALL TESTS PASSED");

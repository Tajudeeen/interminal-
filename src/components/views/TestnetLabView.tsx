import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { NETWORKS } from "../../constants/networks";
import { Button } from "../ui/Button";
import { shortAddr } from "../../lib/arc/wallet";
import { calculateJitUnwind, calculateYieldSweep } from "../../lib/math/treasury";

export const TestnetLabView: React.FC = () => {
  const {
    address,
    chainId,
    connected,
    connecting,
    nativeGasBalance,
    targetBufferUsd,
    connectWallet,
    switchToCurrentNetwork,
    completeTestnetTask,
    performMainnetFromTestnet,
    setStressTestAmount,
    stressTestAmount,
    testnetTaskComplete,
  } = useAppStore();
  const [headBlock, setHeadBlock] = useState<number | null>(null);
  const [loadingBlock, setLoadingBlock] = useState(true);

  const network = NETWORKS.testnet;
  const scenarioUsdc = 15000;
  const scenarioUsyc = 185000;
  const sweep = useMemo(() => calculateYieldSweep(25000, targetBufferUsd), [targetBufferUsd]);
  const jit = useMemo(() => calculateJitUnwind({
    tradeAmountUsd: stressTestAmount,
    liquidUsdc: scenarioUsdc,
    usycBalance: scenarioUsyc,
    usycPriceUsd: 1.135836,
    slippageBps: 30,
  }), [stressTestAmount]);

  useEffect(() => {
    let cancelled = false;
    setLoadingBlock(true);
    fetch(network.rpc, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "eth_blockNumber", params: [], id: 1 }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && typeof data?.result === "string") setHeadBlock(Number.parseInt(data.result, 16));
      })
      .catch(() => { if (!cancelled) setHeadBlock(null); })
      .finally(() => { if (!cancelled) setLoadingBlock(false); });
    return () => { cancelled = true; };
  }, [network.rpc, chainId]);

  const ready = connected && chainId === network.chainId;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-6 animate-view-fade">
      <section className="card-themed border border-themed rounded-3xl p-6 sm:p-8 overflow-hidden relative">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-cyan/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan">Testnet execution lab</div>
              <h1 className="font-display text-3xl sm:text-4xl font-black text-themed mt-2">Rehearse it before mainnet.</h1>
              <p className="font-mono text-sm text-sub mt-2 max-w-2xl leading-relaxed">
                Use Arc Testnet to verify wallet access, network switching, treasury policy math and the reviewer flow. Mainnet execution stays behind a separate gate.
              </p>
            </div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill bg-cyan/10 border border-cyan/30 text-cyan font-mono text-[10px] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" /> Arc Testnet · 5042002
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {[
              ["Network", ready ? "Connected" : chainId ? "Wrong network" : "Not connected", ready ? "text-pos" : "text-amber-500"],
              ["Testnet block", loadingBlock ? "Reading…" : headBlock ? headBlock.toLocaleString() : "Unavailable", "text-themed"],
              ["Native USDC", ready ? nativeGasBalance.toFixed(4) : "—", "text-themed"],
            ].map(([label, value, cls]) => (
              <div key={label} className="p-4 rounded-2xl bg-themed-card/60 border border-themed/30">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</div>
                <div className={`font-display font-black text-xl mt-1 ${cls}`}>{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            {!ready ? (
              <Button size="lg" variant="primary" isLoading={connecting} onClick={() => connectWallet("testnet")} leftIcon={<span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>}>
                {connected ? "Connect to Arc Testnet" : "Connect Testnet Wallet"}
              </Button>
            ) : null}
            {connected && chainId !== network.chainId ? (
              <Button size="lg" variant="outline" onClick={switchToCurrentNetwork} leftIcon={<span className="material-symbols-outlined text-[18px]">swap_horiz</span>}>
                Switch to Arc Testnet
              </Button>
            ) : null}
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-themed text-sub hover:text-themed hover:border-cyan/40 font-mono text-sm transition-all">
              Get testnet USDC <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            </a>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card-themed border border-themed rounded-3xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Task 01 · policy sweep</div>
          <div className="font-display font-bold text-xl text-themed mt-2">Move excess cash into the yield lane</div>
          <p className="font-mono text-xs text-sub mt-2">Test the exact same treasury calculation used in the demo. Nothing touches mainnet from this screen.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="p-3 rounded-2xl bg-themed-card/60 border border-themed/30"><span className="font-mono text-[10px] text-muted block">Scenario cash</span><span className="font-display font-black text-lg text-themed">$25,000</span></div>
            <div className="p-3 rounded-2xl bg-themed-card/60 border border-themed/30"><span className="font-mono text-[10px] text-muted block">Model sweep</span><span className="font-display font-black text-lg text-pos">${sweep.sweepAmount.toLocaleString()}</span></div>
          </div>
        </div>

        <div className="card-themed border border-themed rounded-3xl p-5">
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Task 02 · JIT liquidity</div>
          <div className="font-display font-bold text-xl text-themed mt-2">Stress an outgoing payment</div>
          <p className="font-mono text-xs text-sub mt-2">Tune the outgoing amount and inspect whether idle USYC can cover the shortfall.</p>
          <input
            type="range"
            min={500}
            max={50000}
            step={500}
            value={stressTestAmount}
            onChange={(e) => setStressTestAmount(Number(e.target.value))}
            className="w-full mt-5 accent-lime-500"
          />
          <div className="flex justify-between mt-2 font-mono text-xs"><span className="text-muted">Outgoing need</span><span className="text-themed font-bold">${stressTestAmount.toLocaleString()}</span></div>
          <div className="mt-3 p-3 rounded-2xl border border-themed/30 bg-themed-card/60 font-mono text-xs">
            {jit.canCover ? <span className="text-pos">Policy pass · USYC coverage available.</span> : <span className="text-neg">Policy stop · liquidity is insufficient.</span>}
          </div>
        </div>
      </section>

      <section className="card-themed border border-themed rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Testnet checkpoint</div>
            <div className="font-display font-black text-xl text-themed mt-1">{testnetTaskComplete ? "Ready for mainnet" : "Complete the rehearsal before promotion"}</div>
            <div className="font-mono text-xs text-sub mt-1">
              {address ? `Wallet ${shortAddr(address)} is connected for the test environment.` : "Connect a funded testnet wallet for network rehearsal. Policy balances shown above are scenarios."}
            </div>
          </div>
          {!testnetTaskComplete ? (
            <Button size="md" variant="pos" onClick={() => { completeTestnetTask(); }} disabled={!ready}>
              Complete Testnet Rehearsal
            </Button>
          ) : (
            <Button size="md" variant="primary" onClick={performMainnetFromTestnet} rightIcon={<span className="material-symbols-outlined text-[17px]">arrow_forward</span>}>
              Perform Task on Mainnet
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};
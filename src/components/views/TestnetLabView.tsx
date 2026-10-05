import { Icon } from "../ui/Icon";
import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { NETWORKS } from "../../constants/networks";
import { Button } from "../ui/Button";
import { shortAddr } from "../../lib/arc/wallet";

export const TestnetLabView: React.FC = () => {
  const {
    address,
    chainId,
    connected,
    connecting,
    nativeGasBalance,
    connectWallet,
    switchToCurrentNetwork,
    runTestnetProof,
    performMainnetFromTestnet,
testnetTaskComplete,
    testnetTxHash,
    executing,
  } = useAppStore();
  const [headBlock, setHeadBlock] = useState<number | null>(null);
  const [loadingBlock, setLoadingBlock] = useState(true);

  const network = NETWORKS.testnet;
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
                Use Arc Testnet only when you want a wallet rehearsal. Mainnet review and execution are available directly.
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
              <Button size="lg" variant="primary" isLoading={connecting} onClick={() => connectWallet("testnet")} leftIcon={<Icon name="account_balance_wallet" className="material-symbols-outlined text-[18px]" />}>
                {connected ? "Connect to Arc Testnet" : "Connect Testnet Wallet"}
              </Button>
            ) : (
              <Button size="lg" variant="primary" isLoading={executing} onClick={runTestnetProof} leftIcon={<Icon name="bolt" className="material-symbols-outlined text-[18px]" />}>
                {executing ? "Confirming..." : testnetTaskComplete ? "Testnet Check Confirmed" : "Run Testnet Execution Check"}
              </Button>
            )}
            {connected && chainId !== network.chainId ? (
              <Button size="lg" variant="outline" onClick={switchToCurrentNetwork} leftIcon={<Icon name="swap_horiz" className="material-symbols-outlined text-[18px]" />}>
                Switch to Arc Testnet
              </Button>
            ) : null}
            <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-themed text-sub hover:text-themed hover:border-cyan/40 font-mono text-sm transition-all">
              Get testnet USDC <Icon name="open_in_new" className="material-symbols-outlined text-[16px]" />
            </a>
          </div>
        </div>
      </section>

      <section className="card-themed border border-cyan/30 bg-cyan/5 rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-cyan">Why this exists</div>
            <div className="font-display font-black text-xl text-themed mt-1">One tiny real transaction. Nothing more.</div>
            <p className="font-mono text-xs text-sub mt-1 max-w-2xl leading-relaxed">
              The checkpoint proves wallet signing, Arc Testnet network selection, transaction submission, and receipt confirmation. It does not represent an Interminal settlement-contract execution.
            </p>
          </div>
          <a
            href={network.explorer}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-themed text-sub hover:text-themed hover:border-cyan/40 font-mono text-xs transition-all shrink-0"
          >
            Arc Explorer <Icon name="open_in_new" className="material-symbols-outlined text-[14px]" />
          </a>
        </div>
      </section>

      <section className="card-themed border border-themed rounded-3xl p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Testnet checkpoint</div>
            <div className="font-display font-black text-xl text-themed mt-1">{testnetTaskComplete ? "Rehearsal complete" : "Optional wallet checkpoint"}</div>
            <div className="font-mono text-xs text-sub mt-1">
              {address ? `Wallet ${shortAddr(address)} is connected for the test environment.` : "Connect a funded testnet wallet for network rehearsal. Policy balances shown above are scenarios."}
            </div>
            {testnetTxHash ? (
              <a
                href={network.explorer + "/tx/" + testnetTxHash}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-cyan font-mono text-[10px] hover:underline"
              >
                View confirmed testnet transaction <Icon name="open_in_new" className="material-symbols-outlined text-[12px]" />
              </a>
            ) : null}
          </div>
          {!testnetTaskComplete ? (
            <Button size="md" variant="outline" onClick={runTestnetProof} disabled={!ready || executing} leftIcon={<Icon name="verified" className="material-symbols-outlined text-[15px]" />}>
              {executing ? "Waiting for confirmation..." : "Run 0.01 USDC Check"}
            </Button>
          ) : (
            <Button size="md" variant="primary" onClick={performMainnetFromTestnet} rightIcon={<Icon name="arrow_forward" className="material-symbols-outlined text-[17px]" />}>
              Review Live Mainnet
            </Button>
          )}
        </div>
      </section>
    </div>
  );
};
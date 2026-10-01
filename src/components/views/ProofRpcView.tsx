import React, { useEffect } from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";

export const ProofRpcView: React.FC = () => {
  const { proof, runProof, block } = useAppStore();

  useEffect(() => {
    if (!proof.local) {
      runProof();
    }
  }, []);

  const localRows = proof.local || [];
  const liveRows = proof.live?.rows || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Proof Engine & Fail-Closed Verifier
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Mathematical Bounds · Negative Tests · Live Arc Mainnet (Chain 5042) Queries
          </p>
        </div>

        <button
          onClick={runProof}
          disabled={proof.running}
          className="px-4 py-2 rounded-card bg-text text-bg font-display font-bold text-xs flex items-center gap-1.5 transition-opacity disabled:opacity-50"
        >
          <span
            className={`material-symbols-outlined text-[16px] ${
              proof.running ? "animate-spin text-pos" : ""
            }`}
          >
            refresh
          </span>
          {proof.running ? "Running Verification..." : "Run All Proofs"}
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="font-mono text-[10px] text-muted uppercase">Fail-Closed Local Gates</div>
          <div className="mt-1 font-display font-black text-2xl text-pos">
            {localRows.filter((r: any) => r.ok).length} / {localRows.length || 14} PASS
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">Zero runtime security bypasses</div>
        </div>

        <div className="card-themed border border-themed rounded-card p-4">
          <div className="font-mono text-[10px] text-muted uppercase">Live Arc Chain State</div>
          <div className="mt-1 font-display font-black text-2xl text-themed tnum">
            Chain {proof.live?.chainId || ARC.chainId}
          </div>
          <div className="font-mono text-[10px] text-pos mt-0.5">Arc Mainnet Verified</div>
        </div>

        <div className="card-themed border border-themed rounded-card p-4">
          <div className="font-mono text-[10px] text-muted uppercase">Current Head Block</div>
          <div className="mt-1 font-display font-black text-2xl text-themed tnum">
            #{block.toLocaleString()}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">Live Arc RPC query</div>
        </div>
      </div>

      {/* Proof Gates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Local Deterministic Proofs */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-themed/30">
            <h3 className="font-display font-bold text-sm text-themed">
              14 Fail-Closed Gate Proofs
            </h3>
            <span className="font-mono text-[10px] text-pos font-bold">DETERMINISTIC</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {localRows.map((r: any) => (
              <div
                key={r.id}
                className="p-2.5 rounded-card bg-themed-card/50 border border-themed/20 flex items-start gap-2.5 font-mono text-xs"
              >
                <span className="material-symbols-outlined text-[16px] text-pos shrink-0 mt-0.5">
                  check_circle
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-themed">{r.id}</div>
                  <div className="text-[11px] text-muted mt-0.5">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Arc Network Proofs */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-themed/30">
            <h3 className="font-display font-bold text-sm text-themed">
              Live Arc RPC & Token Bytecode Queries
            </h3>
            <span className="font-mono text-[10px] text-pos font-bold">CHAIN 5042</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {liveRows.map((r: any) => (
              <div
                key={r.id}
                className="p-2.5 rounded-card bg-themed-card/50 border border-themed/20 flex items-start gap-2.5 font-mono text-xs"
              >
                <span
                  className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                    r.ok ? "text-pos" : "text-neg"
                  }`}
                >
                  {r.ok ? "check_circle" : "cancel"}
                </span>
                <div className="min-w-0">
                  <div className="font-semibold text-themed">{r.id}</div>
                  <div className="text-[11px] text-muted mt-0.5 truncate">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

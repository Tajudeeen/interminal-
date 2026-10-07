import { SettlementEvidencePanel } from "../treasury/SettlementEvidencePanel";
import { Icon } from "../ui/Icon";
import React, { useEffect, useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { Button } from "../ui/Button";
import { querySettlementDetails } from "../../lib/arc/rpcClient";

export const ProofRpcView: React.FC = () => {
  const { proof, runProof, block } = useAppStore();
  const [settlementDetails, setSettlementDetails] = useState<{
    contract: string;
    bytecodeBytes: number;
    domainSeparator: string;
    isDomainMatch: boolean;
    blockNumber: number;
    latencyMs: number;
  } | null>(null);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    if (!proof.local) {
      runProof();
    }
    handleProbeSettlement();
  }, []);

  const handleProbeSettlement = async () => {
    setProbing(true);
    try {
      const res = await querySettlementDetails();
      setSettlementDetails(res);
    } catch (err) {
      console.error("Failed to query settlement details", err);
    } finally {
      setProbing(false);
    }
  };

  const localRows = proof.local || [];
  const liveRows = proof.live?.rows || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Verify an Arc execution
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Wallet-free settlement checks · Live Arc Mainnet (Chain 5042) · Independent receipt verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleProbeSettlement}
            isLoading={probing}
            leftIcon={<Icon name="sensors" className="material-symbols-outlined text-[16px]" />}
          >
            Probe Settlement RPC
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={runProof}
            isLoading={proof.running}
            leftIcon={<Icon name="refresh" className="material-symbols-outlined text-[16px]" />}
          >
            {proof.running ? "Running Verification..." : "Run All Proofs"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-sub border border-amber-500/40 rounded-card p-4">Source reproduction is unresolved: the maintained Solidity source does not match the live executable runtime with recorded settings. Infrastructure reads and event verification below are separate checks. The strict repository source gate currently fails.</p>
      <SettlementEvidencePanel />
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card-themed border border-themed rounded-card p-4">
          <div className="font-mono text-[10px] text-muted uppercase">Fail-Closed Local Gates</div>
          <div className="mt-1 font-display font-black text-2xl text-pos">
            {localRows.filter((r: any) => r.ok).length} / {localRows.length || 14} PASS
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">Local regression checks, not a contract audit</div>
        </div>

        <div className="card-themed border border-themed rounded-card p-4">
          <div className="font-mono text-[10px] text-muted uppercase">Live Arc Chain State</div>
          <div className="mt-1 font-display font-black text-2xl text-themed tnum">
            Chain {proof.live?.chainId || ARC.chainId}
          </div>
          <div className="font-mono text-[10px] text-pos mt-0.5">{proof.live?.chainOk ? "Arc RPC chain matched" : "Not yet verified"}</div>
        </div>

        <div className="card-themed border border-themed rounded-card p-4">
          <div className="font-mono text-[10px] text-muted uppercase">Current Head Block</div>
          <div className="mt-1 font-display font-black text-2xl text-themed tnum">
            #{block.toLocaleString()}
          </div>
          <div className="font-mono text-[10px] text-muted mt-0.5">Live Arc RPC query</div>
        </div>
      </div>

      {/* On-Chain Settlement Contract Live Verifier */}
      <div className="card-themed border border-cyan/40 rounded-card p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-themed/20">
          <div className="flex items-center gap-2">
            <Icon name="verified_user" className="material-symbols-outlined text-[20px] text-cyan" />
            <div>
              <h2 className="font-display font-bold text-base text-themed">
                Arc Mainnet settlement checks
              </h2>
              <p className="font-mono text-xs text-muted">
                Live reads: bytecode presence and EIP-712 domain match
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`${ARC.explorer}/address/${ARC.settlement}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan/10 hover:bg-cyan/20 border border-cyan/30 text-cyan font-mono text-[11px] transition-colors"
            >
              <span>View on Arc Explorer</span>
              <Icon name="open_in_new" className="material-symbols-outlined text-[13px]" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
            <div className="text-[10px] text-muted uppercase">Contract Address</div>
            <div className="font-bold text-themed truncate" title={ARC.settlement}>
              {ARC.settlement}
            </div>
            <div className="text-[11px] text-pos">Arc Mainnet (5042)</div>
          </div>

          <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
            <div className="text-[10px] text-muted uppercase">Bytecode Payload</div>
            <div className="font-bold text-themed tnum">
              {settlementDetails ? `${settlementDetails.bytecodeBytes.toLocaleString()} bytes` : "Querying..."}
            </div>
            <div className="text-[11px] text-pos">
              Deployed Block #{ARC.deployBlock.toLocaleString()}
            </div>
          </div>

          <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
            <div className="text-[10px] text-muted uppercase">EIP-712 DOMAIN_SEPARATOR</div>
            <div className="font-bold text-themed truncate" title={settlementDetails?.domainSeparator}>
              {settlementDetails?.domainSeparator ? settlementDetails.domainSeparator.slice(0, 18) + "..." : "Querying..."}
            </div>
            <div className="text-[11px] text-pos">
              {settlementDetails?.isDomainMatch ? "Matched Interminal Domain" : "Awaiting RPC"}
            </div>
          </div>

          <div className="p-3 rounded-card bg-themed-card/50 border border-themed/20 space-y-1">
            <div className="text-[10px] text-muted uppercase">RPC Query Latency</div>
            <div className="font-bold text-themed tnum">
              {settlementDetails ? `${settlementDetails.latencyMs} ms` : "---"}
            </div>
            <div className="text-[11px] text-muted">
              Head #{settlementDetails?.blockNumber.toLocaleString() || block.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-3 rounded-card bg-themed-card/40 border border-themed/20 font-mono text-[11px] space-y-1 text-muted">
          <div className="flex items-center justify-between text-themed font-semibold">
            <span>Critical Settlement Reads:</span>
            <span className="text-pos font-bold">{settlementDetails?.isDomainMatch ? "Domain read matched" : "Not yet verified"}</span>
          </div>
          <div>• <code className="text-cyan">DOMAIN_SEPARATOR()</code> [0x3644e515] - Returns canonical EIP-712 domain hash</div>
          <div>• <code className="text-cyan">anchorReceipt(bytes32)</code> [0xea683470] - Writes a certificate digest. Does not independently prove execution</div>
          <div>• <code className="text-cyan">isReceiptAnchored(bytes32)</code> [0x9815336b] - Checks whether a digest was stored</div>
        </div>
      </div>

      {/* Proof Gates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Local Deterministic Proofs */}
        <div className="card-themed border border-themed rounded-card p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-themed/30">
            <h3 className="font-display font-bold text-sm text-themed">
              Local authorization checks
            </h3>
            <span className="font-mono text-[10px] text-pos font-bold">DETERMINISTIC</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {localRows.map((r: any) => (
              <div
                key={r.id}
                className="p-2.5 rounded-card bg-themed-card/50 border border-themed/20 flex items-start gap-2.5 font-mono text-xs"
              >
                <Icon name={r.ok ? "check_circle" : "cancel"} className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${r.ok ? "text-pos" : "text-neg"}`} />
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
                <Icon name={r.ok ? "check_circle" : "cancel"}
                  className={`material-symbols-outlined text-[16px] shrink-0 mt-0.5 ${
                    r.ok ? "text-pos" : "text-neg"
                  }`}
                 />
                <div className="min-w-0">
                  <div className="font-semibold text-themed">{r.id}</div>
                  <div className="text-[11px] text-muted mt-0.5 truncate">{r.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Verified Arc Mainnet Contracts Registry */}
      <div className="card-themed border border-themed rounded-card p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-themed/30">
          <h3 className="font-display font-bold text-sm text-themed">
            Arc Mainnet Token & Infrastructure Contracts Registry
          </h3>
          <span className="font-mono text-[10px] text-muted">Arc Mainnet (5042)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-themed/20 text-muted text-[11px] uppercase">
                <th className="pb-2">Asset / Role</th>
                <th className="pb-2">Contract Address</th>
                <th className="pb-2">Decimals</th>
                <th className="pb-2 text-right">Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-themed/10">
              <tr>
                <td className="py-2.5 font-semibold text-themed">USDC (ERC-20 Interface)</td>
                <td className="py-2.5 text-muted truncate max-w-xs">{ARC.usdcErc20}</td>
                <td className="py-2.5 text-muted">6</td>
                <td className="py-2.5 text-right">
                  <a
                    href={`${ARC.explorer}/address/${ARC.usdcErc20}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explorer</span>
                    <Icon name="open_in_new" className="material-symbols-outlined text-[12px]" />
                  </a>
                </td>
              </tr>
              {Object.entries(ARC.tokens).map(([sym, meta]) => (
                <tr key={sym}>
                  <td className="py-2.5 font-semibold text-themed">{sym} ({meta.name})</td>
                  <td className="py-2.5 text-muted truncate max-w-xs">{meta.address}</td>
                  <td className="py-2.5 text-muted">{meta.decimals}</td>
                  <td className="py-2.5 text-right">
                    <a
                      href={`${ARC.explorer}/address/${meta.address}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan hover:underline inline-flex items-center gap-1"
                    >
                      <span>Explorer</span>
                      <Icon name="open_in_new" className="material-symbols-outlined text-[12px]" />
                    </a>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="py-2.5 font-semibold text-themed">Interminal Settlement Contract</td>
                <td className="py-2.5 text-muted truncate max-w-xs">{ARC.settlement}</td>
                <td className="py-2.5 text-muted">18 (Gas)</td>
                <td className="py-2.5 text-right">
                  <a
                    href={`${ARC.explorer}/address/${ARC.settlement}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-pos font-semibold hover:underline inline-flex items-center gap-1"
                  >
                    <span>Explorer</span>
                    <Icon name="open_in_new" className="material-symbols-outlined text-[12px]" />
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

import { SettlementEvidencePanel } from "../treasury/SettlementEvidencePanel";
import { Icon } from "../ui/Icon";
import React, { useState } from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { verifyReceiptIntegrity } from "../../lib/crypto/eip712";
import { Button } from "../ui/Button";

export const CorporateLedgerView: React.FC = () => {
  const { auditReceipts, setActiveReceiptModal, setView, archiveWarning, pendingTransactions, resolvePendingTransaction } = useAppStore();

  const [pendingError, setPendingError] = useState("");
  const [resolving, setResolving] = useState(false);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <p className="text-sm text-sub">Receipts are saved on this device. Mainnet records can be reopened from the mainnet workspace without connecting a wallet. Export JSON for a portable backup. Storage is local and is not an accounting database.</p>
      {archiveWarning ? <p role="alert" className="text-neg text-sm">Device storage failed. Export your receipts before closing this page.</p> : null}
      {pendingTransactions.length ? <section className="border border-amber-500/40 rounded-card p-4 space-y-3">
        <h2 className="text-themed font-bold">Submitted transactions need a status check</h2>
        <p className="text-sm text-sub">A timeout does not mean failure. New mainnet executions are blocked until these are resolved. Verify confirmed events below and download the evidence.</p>
        {pendingTransactions.map(hash => <div key={hash} className="space-y-2">
          <a className="text-cyan text-xs break-all" href={`${ARC.explorer}/tx/${hash}`} target="_blank" rel="noreferrer">{hash}</a>
          <Button size="sm" disabled={resolving} onClick={async () => {
            setResolving(true); setPendingError("");
            try { await resolvePendingTransaction(hash); } catch (e) { setPendingError(e instanceof Error ? e.message : String(e)); }
            finally { setResolving(false); }
          }}>Check transaction status</Button>
        </div>)}
        {pendingError ? <p className="text-neg text-sm" role="alert">{pendingError}</p> : null}
      </section> : null}
      <SettlementEvidencePanel />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Receipts & execution evidence
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Device-saved certificates · Exportable evidence · Independent Arc verification
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setView("terminal")}
          leftIcon={<Icon name="draw" className="material-symbols-outlined text-[16px]" />}
        >
          Review another Arc trade
        </Button>
      </div>

      {/* Receipts Table */}
      <div className="card-themed border border-themed rounded-card overflow-hidden">
        {auditReceipts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-themed bg-themed-card/50 text-muted uppercase text-[10px]">
                  <th className="py-3 px-4">Receipt ID</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Market / Side</th>
                  <th className="py-3 px-4 text-right">Value (USD)</th>
                  <th className="py-3 px-4 text-right">Effective Rate</th>
                  <th className="py-3 px-4 text-center">Integrity</th>
                  <th className="py-3 px-4 text-center">Mode / Arc Anchor</th>
                  <th className="py-3 px-4 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-themed/30">
                {auditReceipts.map((rcpt) => {
                  const isValid = verifyReceiptIntegrity(rcpt);
                  return (
                    <tr key={rcpt.receiptId} className="hover:bg-themed-card/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-themed">{rcpt.receiptId}</td>
                      <td className="py-3 px-4 text-muted text-[11px]">
                        {new Date(rcpt.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-themed">
                        <span
                          className={`mr-1.5 uppercase ${
                            rcpt.side === "buy" ? "text-pos" : "text-neg"
                          }`}
                        >
                          {rcpt.side}
                        </span>
                        {rcpt.pair}
                      </td>
                      <td className="py-3 px-4 text-right text-themed tnum">
                        ${rcpt.amountUsd.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-sub tnum">
                        ${rcpt.effectivePrice.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-bold ${
                            isValid
                              ? "bg-pos/10 border border-pos/30 text-pos"
                              : "bg-neg/10 border border-neg/30 text-neg"
                          }`}
                        >
                          <Icon name={isValid ? "verified" : "error"} className="material-symbols-outlined text-[12px]" />
                          {isValid ? "VALID" : "MUTATED"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {rcpt.mode === "simulation" ? (
                          <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            SIMULATED
                          </span>
                        ) : rcpt.onchainAnchored && rcpt.anchorTx ? (
                          <a
                            href={`${ARC.explorer}/tx/${rcpt.anchorTx}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-bold bg-pos/15 text-pos border border-pos/30 hover:bg-pos/25 transition-colors"
                            title="View confirmed transaction on Arc Explorer"
                          >
                            <span>ANCHORED</span>
                            <Icon name="open_in_new" className="material-symbols-outlined text-[11px]" />
                          </a>
                        ) : (
                          <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-themed-card text-muted border border-themed/40">
                            LOCAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          size="xs"
                          onClick={() => setActiveReceiptModal(rcpt)}
                          leftIcon={<Icon name="visibility" className="material-symbols-outlined text-[13px]" />}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <Icon name="receipt_long" className="material-symbols-outlined text-[36px] text-muted" />
            <div className="font-display font-bold text-sm text-themed">No Audit Receipts Yet</div>
            <p className="font-mono text-xs text-muted max-w-sm mx-auto">
              Every confirmed execution can generate a canonical JSON certificate with SHA-256 integrity proofs.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setView("terminal")}
              className="mt-2"
            >
              Execute a Trade to Generate Receipt
            </Button>
          </div>
        )}
      </div>

    </div>
  );
};

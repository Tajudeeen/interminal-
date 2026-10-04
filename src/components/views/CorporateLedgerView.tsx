import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { verifyReceiptIntegrity } from "../../lib/crypto/eip712";
import { Button } from "../ui/Button";

export const CorporateLedgerView: React.FC = () => {
  const { auditReceipts, setActiveReceiptModal, setView } = useAppStore();

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-black text-2xl sm:text-3xl text-themed tracking-tight">
            Corporate Ledger & Audit Certificates
          </h1>
          <p className="font-mono text-xs text-muted mt-1">
            Canonical JSON Receipts · SHA-256 Tamper Proofs · Arc Mainnet Anchor
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => setView("terminal")}
          leftIcon={<span className="material-symbols-outlined text-[16px]">draw</span>}
        >
          Sign New Trade Ticket
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
                          <span className="material-symbols-outlined text-[12px]">
                            {isValid ? "verified" : "error"}
                          </span>
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
                            <span className="material-symbols-outlined text-[11px]">open_in_new</span>
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
                          leftIcon={<span className="material-symbols-outlined text-[13px]">visibility</span>}
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
            <span className="material-symbols-outlined text-[36px] text-muted">receipt_long</span>
            <div className="font-display font-bold text-sm text-themed">No Audit Receipts Yet</div>
            <p className="font-mono text-xs text-muted max-w-sm mx-auto">
              Every EIP-712 signed order generates a canonical JSON-LD certificate with SHA-256 integrity proofs.
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

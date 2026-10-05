import React, { useState } from "react";
import { ARC } from "../../constants/arc";
import { useAppStore } from "../../store/useAppStore";
import { parseReceiptFile } from "../../lib/evidence/archive";
import { verifySettlement, reconstructReceiptFromEvent, type SettlementEvidence } from "../../lib/evidence/settlement";
import { Button } from "../ui/Button";
import type { TradeReceipt } from "../../types/receipt";

export const SettlementEvidencePanel: React.FC = () => {
  const importReceipt = useAppStore(s => s.importReceipt);
  const [tx, setTx] = useState(() => new URLSearchParams(window.location.search).get("verify") || "");
  const [certificate, setCertificate] = useState<TradeReceipt | undefined>();
  const [report, setReport] = useState<SettlementEvidence | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    setBusy(true); setError(""); setReport(null);
    try {
      const evidence = await verifySettlement(tx.trim(), certificate);
      setReport(evidence);
      importReceipt(certificate ? { ...certificate, status: "confirmed", onchainAnchored: evidence.certificateAnchored === true } : reconstructReceiptFromEvent(evidence));
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };
  const upload = async (file?: File) => {
    setReport(null); setCertificate(undefined); setError("");
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error("Receipt exceeds 2 MB");
      const r = parseReceiptFile(await file.text());
      if (r.mode !== "mainnet") throw new Error("Simulation receipts cannot prove a mainnet execution");
      setCertificate(r); setTx(r.transactionHash!);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  const download = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify({ evidence: report, certificate: certificate ?? null }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `interminal-evidence-${report.transactionHash}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <section className="card-themed border border-themed rounded-card p-5 space-y-4">
    <div><h2 className="text-lg font-bold text-themed">Verify a mainnet execution</h2>
      <p className="text-sm text-sub mt-1">No wallet required. Paste a settlement transaction or import an exported receipt. We query Arc and compare the actual event, token route, amounts, and block.</p></div>
    <label className="block text-sm text-sub">Settlement transaction
      <input className="mt-2 w-full rounded-lg border border-themed bg-themed-card px-3 py-2 text-themed font-mono text-xs" value={tx} disabled={busy}
        onChange={e => { setTx(e.target.value); setCertificate(undefined); setReport(null); setError(""); }} placeholder="0x…" autoComplete="off" spellCheck={false} />
    </label>
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => void verify()} isLoading={busy} disabled={!tx.trim()}>Verify settlement</Button>
      <label className="text-sm text-sub">Import receipt JSON
        <input className="block mt-1 max-w-full text-xs" type="file" accept=".json,application/json" disabled={busy} onChange={e => void upload(e.target.files?.[0])} />
      </label>
    </div>
    {certificate ? <p className="text-xs text-sub">Certificate digest matches locally. Its execution has not been verified until you run the check.</p> : null}
    {error ? <p role="alert" className="text-sm text-neg break-words">{error}</p> : null}
    <div aria-live="polite">
      {report ? <div className="space-y-3 text-sm">
        <p className="text-pos font-bold">Settlement event verified on Arc Mainnet</p>
        <p className="text-themed">{report.amountIn.toLocaleString(undefined, { maximumFractionDigits: 8 })} {report.inputSymbol} → {report.amountOut.toLocaleString(undefined, { maximumFractionDigits: 8 })} {report.outputSymbol}</p>
        <p className="text-sub">Block {report.blockNumber.toLocaleString()} · {report.isTreasuryFlow ? "USDC/USYC treasury flow" : "Token trade, does not prove the USYC treasury flow"}</p>
        <p className="text-sub">Certificate {report.certificateMatched ? "matches the event" : "not provided"} · Digest anchor {report.certificateAnchored === null ? report.anchorError ? "query unavailable" : "not checked" : report.certificateAnchored ? "found" : "not found"}</p>
        <a className="text-cyan underline break-all" href={`${ARC.explorer}/tx/${report.transactionHash}`} target="_blank" rel="noreferrer">Open transaction on Arc Explorer</a>
        <div className="flex flex-wrap gap-3"><Button variant="secondary" onClick={download}>Download evidence</Button>
          <Button variant="secondary" onClick={() => { const link = new URL(window.location.origin); link.searchParams.set("verify", report.transactionHash); void navigator.clipboard.writeText(link.toString()); }}>Copy verification link</Button></div>
      </div> : <p className="text-xs text-muted">An on-chain digest alone does not prove execution. Reports are based on the configured public Arc RPC and can be checked again independently.</p>}
    </div>
  </section>;
};

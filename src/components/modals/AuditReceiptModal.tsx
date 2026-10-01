import React, { useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { verifyReceiptIntegrity } from "../../lib/crypto/eip712";
import { anchorReceiptOnchain } from "../../lib/arc/receiptAnchor";
import { shortAddr } from "../../lib/arc/wallet";
import { Button } from "../ui/Button";

export const AuditReceiptModal: React.FC = () => {
  const {
    activeReceiptModal,
    setActiveReceiptModal,
    addToast,
    address,
    settlementContractAddress,
  } = useAppStore();
  const [anchoring, setAnchoring] = useState(false);

  if (!activeReceiptModal) return null;

  const isValid = verifyReceiptIntegrity(activeReceiptModal);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(activeReceiptModal, null, 2));
    addToast("Copied", "Cryptographic JSON-LD audit certificate copied to clipboard.", "ok");
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(activeReceiptModal, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interminal-receipt-${activeReceiptModal.receiptId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported", "Audit certificate downloaded as JSON-LD file.", "ok");
  };

  const handleAnchor = async () => {
    if (!address) {
      addToast("Wallet Required", "Connect an Arc Mainnet wallet to anchor receipt on-chain.", "err");
      return;
    }
    setAnchoring(true);
    try {
      const txHash = await anchorReceiptOnchain(activeReceiptModal, address, settlementContractAddress);
      addToast("Receipt Anchored!", `Anchored in Arc state. Tx: ${shortAddr(txHash)}`, "ok");
      // update state
      setActiveReceiptModal({ ...activeReceiptModal, onchainAnchored: true, anchorTx: txHash });
    } catch (e: any) {
      addToast("Anchoring Failed", e?.message || String(e), "err");
    } finally {
      setAnchoring(false);
    }
  };

  return (
    <GlassModalWrapper
      isOpen={!!activeReceiptModal}
      onClose={() => setActiveReceiptModal(null)}
      title="Cryptographic Audit Certificate"
      subtitle={`Receipt ID: ${activeReceiptModal.receiptId}`}
      maxWidth="max-w-xl"
    >
      <div className="space-y-4">
        {/* Verification Status Banner */}
        <div
          className={`p-3.5 rounded-card border flex items-center justify-between font-mono text-xs ${
            isValid
              ? "bg-pos/10 border-pos/30 text-pos"
              : "bg-neg/10 border-neg/30 text-neg"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">
              {isValid ? "verified" : "gpp_bad"}
            </span>
            <span className="font-bold tracking-wide uppercase">
              {isValid ? "SHA-256 Digest Verified Intact" : "Tamper Detected - Hash Mismatch"}
            </span>
          </div>
          <span className="text-[10px] opacity-80">Canonical JSON-LD</span>
        </div>

        {/* Certificate Overview Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-3 rounded-card card-themed border border-themed/30">
            <div className="text-muted text-[10px] uppercase">Market Pair</div>
            <div className="text-themed font-bold mt-0.5">{activeReceiptModal.pair}</div>
          </div>
          <div className="p-3 rounded-card card-themed border border-themed/30">
            <div className="text-muted text-[10px] uppercase">Side & Amount</div>
            <div className="text-themed font-bold mt-0.5">
              {activeReceiptModal.side.toUpperCase()} ${activeReceiptModal.amountUsd.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-card card-themed border border-themed/30">
            <div className="text-muted text-[10px] uppercase">Effective Rate</div>
            <div className="text-themed font-bold mt-0.5">${activeReceiptModal.effectivePrice.toFixed(4)}</div>
          </div>
          <div className="p-3 rounded-card card-themed border border-themed/30">
            <div className="text-muted text-[10px] uppercase">Arc Block Height</div>
            <div className="text-themed font-bold mt-0.5">#{activeReceiptModal.blockNumber}</div>
          </div>
        </div>

        {/* Raw JSON-LD viewer with syntax styling */}
        <div>
          <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] text-muted">
            <span>CANONICAL PAYLOAD</span>
            <span className="text-pos">Chain ID: {activeReceiptModal.chainId}</span>
          </div>
          <pre className="p-3 rounded-card bg-themed-surface/80 border border-themed/30 text-[11px] font-mono text-sub overflow-x-auto max-h-48 leading-relaxed selection:bg-pos/20">
            {JSON.stringify(activeReceiptModal, null, 2)}
          </pre>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCopy}
            className="flex-1"
            leftIcon={<span className="material-symbols-outlined text-[15px]">content_copy</span>}
          >
            Copy JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownload}
            className="flex-1"
            leftIcon={<span className="material-symbols-outlined text-[15px]">download</span>}
          >
            Download .JSON
          </Button>
          {!activeReceiptModal.onchainAnchored && (
            <Button
              variant="primary"
              size="sm"
              onClick={handleAnchor}
              isLoading={anchoring}
              className="w-full sm:w-auto"
              leftIcon={<span className="material-symbols-outlined text-[15px]">anchor</span>}
            >
              Anchor to Arc Settlement
            </Button>
          )}
        </div>
      </div>
    </GlassModalWrapper>
  );
};

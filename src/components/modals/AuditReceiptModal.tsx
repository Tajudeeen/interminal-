import React, { useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";
import { ARC } from "../../constants/arc";
import { verifyReceiptIntegrity } from "../../lib/crypto/eip712";
import { anchorReceiptOnchain, checkReceiptAnchoredOnchain } from "../../lib/arc/receiptAnchor";
import { shortAddr } from "../../lib/arc/wallet";
import { Button } from "../ui/Button";

export const AuditReceiptModal: React.FC = () => {
  const {
    activeReceiptModal,
    setActiveReceiptModal,
    addToast,
    address,
    wrongNetwork,
    settlementContractAddress,
  } = useAppStore();
  const [anchoring, setAnchoring] = useState(false);
  const [anchorStage, setAnchorStage] = useState<string>("");
  const [verifyingOnchain, setVerifyingOnchain] = useState(false);
  const [onchainStatusText, setOnchainStatusText] = useState<string | null>(null);

  if (!activeReceiptModal) return null;

  const isValid = verifyReceiptIntegrity(activeReceiptModal);

  const handleVerifyOnchain = async () => {
    setVerifyingOnchain(true);
    setOnchainStatusText(null);
    try {
      const isAnchored = await checkReceiptAnchoredOnchain(activeReceiptModal, settlementContractAddress);
      if (isAnchored) {
        setOnchainStatusText("Anchored in Arc Mainnet State and verified via isReceiptAnchored");
        setActiveReceiptModal({ ...activeReceiptModal, onchainAnchored: true });
        addToast("On-Chain Verified", "Receipt hash verified in Arc settlement contract storage.", "ok");
      } else {
        setOnchainStatusText("Receipt hash not yet anchored in Arc settlement contract.");
        addToast("Not Anchored", "Receipt hash is held in local audit storage.", "info");
      }
    } catch (e: any) {
      setOnchainStatusText("Failed to query Arc RPC: " + (e?.message || String(e)));
    } finally {
      setVerifyingOnchain(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(activeReceiptModal, null, 2));
    addToast("Copied", "Cryptographic JSON audit certificate copied to clipboard.", "ok");
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(activeReceiptModal, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interminal-receipt-${activeReceiptModal.receiptId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast("Exported", "Audit certificate downloaded as JSON file.", "ok");
  };

  const handleAnchor = async () => {
    if (activeReceiptModal.mode === "simulation") {
      addToast("Simulation Receipt", "Simulation certificates are local-only and cannot be anchored as mainnet execution.", "info");
      return;
    }
    if (!address) {
      addToast("Wallet Required", "Connect an Arc Mainnet wallet to anchor receipt on-chain.", "err");
      return;
    }
    if (wrongNetwork) {
      addToast("Wrong Network", "Switch the connected wallet to Arc Mainnet (5042) before anchoring.", "err");
      return;
    }
    setAnchoring(true);
    setAnchorStage("Awaiting wallet approval...");
    try {
      setAnchorStage("Broadcasting to Arc Mainnet...");
      const txHash = await anchorReceiptOnchain(activeReceiptModal, address, settlementContractAddress);
      setAnchorStage("Confirmed on Arc L1");
      addToast("Receipt Anchored!", `Anchored in Arc state. Tx: ${shortAddr(txHash)}`, "ok");
      // update state
      setActiveReceiptModal({ ...activeReceiptModal, onchainAnchored: true, anchorTx: txHash });
    } catch (e: any) {
      setAnchorStage("");
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
          <span className="text-[10px] opacity-80">Canonical JSON · SHA-256</span>
        </div>

        {/* Execution Provenance */}
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-3 rounded-card card-themed border border-themed/30">
            <div className="text-muted text-[10px] uppercase">Execution Mode</div>
            <div className={activeReceiptModal.mode === "mainnet" ? "text-pos font-bold mt-0.5" : "text-amber-500 font-bold mt-0.5"}>
              {activeReceiptModal.mode.toUpperCase()} · {activeReceiptModal.status.toUpperCase()}
            </div>
          </div>
          <div className="p-3 rounded-card card-themed border border-themed/30">
            <div className="text-muted text-[10px] uppercase">Settled Output</div>
            <div className="text-themed font-bold mt-0.5">
              {activeReceiptModal.actualReceived != null
                ? activeReceiptModal.actualReceived.toLocaleString("en-US", { maximumFractionDigits: 8 })
                : "Pending / Simulation"}
            </div>
          </div>
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

        {/* Canonical JSON viewer with syntax styling */}
        <div>
          <div className="flex items-center justify-between mb-1.5 font-mono text-[10px] text-muted">
            <span>CANONICAL PAYLOAD</span>
            <span className="text-pos">Chain ID: {activeReceiptModal.chainId}</span>
          </div>
          <pre className="p-3 rounded-card bg-themed-surface/80 border border-themed/30 text-[11px] font-mono text-sub overflow-x-auto max-h-48 leading-relaxed selection:bg-pos/20">
            {JSON.stringify(activeReceiptModal, null, 2)}
          </pre>
        </div>

        {/* On-Chain Anchored Link Badge */}
        {activeReceiptModal.onchainAnchored && activeReceiptModal.anchorTx && (
          <a
            href={`${ARC.explorer}/tx/${activeReceiptModal.anchorTx}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-card bg-pos/10 border border-pos/30 text-pos text-xs font-mono hover:bg-pos/20 transition-colors"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              <span className="truncate">Anchored on Arc: {shortAddr(activeReceiptModal.anchorTx)}</span>
            </div>
            <span className="flex items-center gap-1 font-bold text-[11px] shrink-0">
              View on Arc Explorer <span className="material-symbols-outlined text-[12px]">open_in_new</span>
            </span>
          </a>
        )}

        {/* Anchoring in-progress stage */}
        {anchoring && anchorStage && (
          <div className="flex items-center gap-2 p-2.5 rounded-card bg-cyan/10 border border-cyan/30 text-cyan text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-cyan animate-ping" />
            <span>{anchorStage}</span>
          </div>
        )}

        {/* Integrity Digest Display */}
        <div className="p-3 rounded-card bg-themed-card/50 border border-themed/30 space-y-1 font-mono text-xs">
          <div className="flex items-center justify-between text-muted text-[10px] uppercase">
            <span>SHA-256 Integrity Digest</span>
            <span className="text-pos">Deterministic Hash</span>
          </div>
          <div className="text-[11px] text-themed break-all select-all font-mono bg-themed/5 p-1.5 rounded">
            {activeReceiptModal.integrityDigest || "Digest not computed"}
          </div>
        </div>

        {/* Live Arc State Query Result */}
        {onchainStatusText && (
          <div className="p-2.5 rounded-card bg-themed-card/60 border border-themed/30 font-mono text-xs text-themed flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-cyan">travel_explore</span>
            <span>{onchainStatusText}</span>
          </div>
        )}

        {/* Execution transaction proof */}
        {activeReceiptModal.transactionHash && (
          <a
            href={ARC.explorer + "/tx/" + activeReceiptModal.transactionHash}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-3 rounded-card bg-cyan/10 border border-cyan/30 text-cyan text-xs font-mono hover:bg-cyan/15 transition-colors"
          >
            <span>Execution Tx: {shortAddr(activeReceiptModal.transactionHash)}</span>
            <span className="material-symbols-outlined text-[12px]">open_in_new</span>
          </a>
        )}

        {/* Action Controls */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleVerifyOnchain}
            isLoading={verifyingOnchain}
            leftIcon={<span className="material-symbols-outlined text-[15px]">travel_explore</span>}
          >
            Verify On-Chain RPC
          </Button>
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
          {activeReceiptModal.mode === "mainnet" && !activeReceiptModal.onchainAnchored && (
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

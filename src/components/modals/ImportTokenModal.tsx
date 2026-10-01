import React, { useState } from "react";
import { GlassModalWrapper } from "./GlassModalWrapper";
import { useAppStore } from "../../store/useAppStore";

export const ImportTokenModal: React.FC = () => {
  const { importTokenOpen, setImportTokenOpen, importCustomToken, importingToken, importTokenError } =
    useAppStore();
  const [address, setAddress] = useState("");

  const handleImport = async () => {
    if (!address.trim()) return;
    await importCustomToken(address.trim());
  };

  return (
    <GlassModalWrapper
      isOpen={importTokenOpen}
      onClose={() => setImportTokenOpen(false)}
      title="Import Custom Arc Token"
      subtitle="Register ERC-20 Asset on Arc Mainnet (Chain 5042)"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5">
            Token Contract Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-card bg-themed-card border border-themed/40 font-mono text-xs text-themed placeholder:text-muted focus:outline-none focus:border-themed"
          />
          {importTokenError && (
            <div className="mt-1 font-mono text-[10px] text-neg">{importTokenError}</div>
          )}
        </div>

        <div className="p-3 rounded-card bg-themed-card/40 border border-themed/20 font-mono text-[11px] text-muted space-y-1">
          <div>Importing adds the token to local market feeds and enables trading against USDC.</div>
          <div>Make sure the contract is verified on Arc Explorer.</div>
        </div>

        <button
          onClick={handleImport}
          disabled={importingToken || !address.trim()}
          className="w-full py-2.5 rounded-card bg-text text-bg font-display font-extrabold text-xs tracking-wide transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {importingToken ? "Querying Arc Contract..." : "Import Token"}
        </button>
      </div>
    </GlassModalWrapper>
  );
};

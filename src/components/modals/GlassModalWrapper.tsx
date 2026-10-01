import React, { useEffect } from "react";

interface GlassModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  children: React.ReactNode;
}

export const GlassModalWrapper: React.FC<GlassModalWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = "max-w-lg",
  children,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Glassmorphic Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} glass-modal rounded-card overflow-hidden shadow-2xl z-10 animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-themed/30 flex items-center justify-between">
          <div>
            <h3 className="font-display font-extrabold text-base text-themed tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="font-mono text-[10px] text-muted uppercase tracking-wider mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full card-themed border border-themed/50 text-sub hover:text-themed flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

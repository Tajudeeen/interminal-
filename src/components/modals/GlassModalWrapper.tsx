import { Icon } from "../ui/Icon";
import React, { useEffect, useId, useRef } from "react";

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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') || []).filter(el => el.getClientRects().length > 0);
    (focusable()[0] || dialog)?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeRef.current(); }
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0]; const last = items[items.length - 1];
        if (!first) { e.preventDefault(); dialog?.focus(); }
        else if (e.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 modal-backdrop backdrop-blur-md transition-opacity animate-in fade-in duration-200"
      />

      {/* Glassmorphic Modal Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative w-full ${maxWidth} glass-modal rounded-card overflow-hidden z-10 animate-in zoom-in-95 duration-200`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-themed/30 flex items-center justify-between">
          <div>
            <h3 id={titleId} className="font-display font-extrabold text-base text-themed tracking-tight">
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
            aria-label="Close dialog"
            className="w-7 h-7 rounded-full card-themed border border-themed/50 text-sub hover:text-themed flex items-center justify-center transition-colors"
          >
            <Icon name="close" className="material-symbols-outlined text-[16px]" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 max-h-[82vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

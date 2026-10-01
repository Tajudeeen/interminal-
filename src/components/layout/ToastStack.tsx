import React from "react";
import { useAppStore } from "../../store/useAppStore";

export const ToastStack: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full px-3">
      {toasts.map((t) => {
        const borderKind =
          t.kind === "ok"
            ? "border-pos text-pos"
            : t.kind === "err"
            ? "border-neg text-neg"
            : "border-sub text-sub";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto p-3.5 rounded-card card-themed border-l-4 ${borderKind} border border-themed/40 shadow-xl transition-all animate-in slide-in-from-bottom-2`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display font-extrabold text-xs uppercase tracking-wider">
                  {t.title}
                </div>
                <div className="font-mono text-xs text-muted mt-1 leading-snug">{t.body}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-muted hover:text-themed ml-2"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

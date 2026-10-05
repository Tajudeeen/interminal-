import { Icon } from "../ui/Icon";
import React from "react";
import { useAppStore } from "../../store/useAppStore";

export const BottomNav: React.FC = () => {
  const { view, setView } = useAppStore();

  const navItems = [
    { id: "portfolio", label: "Treasury", icon: "savings" },
    { id: "terminal", label: "Trade", icon: "candlestick_chart" },
    { id: "markets", label: "Markets", icon: "query_stats" },
    { id: "ai", label: "Analysis", icon: "psychology" },
    { id: "ledger", label: "Ledger", icon: "receipt_long" },
  ] as const;

  return (
    <nav aria-label="Quick navigation" className="safe-bottom lg:hidden fixed bottom-0 left-0 right-0 z-30 surface-themed border-t border-themed px-2 py-1.5 flex items-center justify-around select-none">
      {navItems.map((item) => {
        const isActive = view === item.id;
        return (
          <button
            key={item.id}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setView(item.id)}
            className={`flex flex-col items-center py-1 px-2 rounded-card transition-colors ${
              isActive ? "text-lime-500 font-bold" : "text-muted hover:text-themed"
            }`}
          >
            <Icon name={item.icon} className="material-symbols-outlined text-[20px]" />
            <span className="text-[10px] font-display mt-0.5">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

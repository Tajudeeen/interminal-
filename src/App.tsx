import React, { useEffect, useState } from "react";
import { useAppStore } from "./store/useAppStore";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { MarketTickerMarquee } from "./components/layout/MarketTickerMarquee";
import { ToastStack } from "./components/layout/ToastStack";
import { SplashScreen } from "./components/layout/SplashScreen";

// Views
import { LandingView } from "./components/views/LandingView";
import { TreasuryCockpitView } from "./components/views/TreasuryCockpitView";
import { TerminalTradeView } from "./components/views/TerminalTradeView";
import { MarketsView } from "./components/views/MarketsView";
import { AiAnalystView } from "./components/views/AiAnalystView";
import { CorporateLedgerView } from "./components/views/CorporateLedgerView";
import { ProofRpcView } from "./components/views/ProofRpcView";

// Modals
import { GasTankModal } from "./components/modals/GasTankModal";
import { ReviewTradeModal } from "./components/modals/ReviewTradeModal";
import { AuditReceiptModal } from "./components/modals/AuditReceiptModal";
import { AgentMandateModal } from "./components/modals/AgentMandateModal";
import { MarketSearchModal } from "./components/modals/MarketSearchModal";
import { ImportTokenModal } from "./components/modals/ImportTokenModal";

export const App: React.FC = () => {
  const { view, theme, setTheme, setSearchOpen } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initial theme setup
    setTheme(theme);

    // Global keyboard shortcuts (Ctrl+K or Cmd+K for search)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const renderCurrentView = () => {
    switch (view) {
      case "landing":
        return <LandingView />;
      case "portfolio":
        return <TreasuryCockpitView />;
      case "terminal":
        return <TerminalTradeView />;
      case "markets":
        return <MarketsView />;
      case "ai":
        return <AiAnalystView />;
      case "ledger":
        return <CorporateLedgerView />;
      case "proof":
        return <ProofRpcView />;
      default:
        return <LandingView />;
    }
  };

  return (
    <div className="min-h-screen bg-bg text-themed flex flex-col lg:flex-row antialiased">
      {/* Institutional Desktop Sidebar (Visible on lg: screens) */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Mobile / Tablet Header (Hidden on lg:) */}
        <Header />

        {/* Live Animated Ticker Marquee */}
        <MarketTickerMarquee />

        {/* Dynamic Viewport Container with Smooth Transitions */}
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-8 scroll-smooth">
          <div key={view} className="animate-view-fade w-full h-full">
            {renderCurrentView()}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Rail (Hidden on lg:) */}
      <BottomNav />

      {/* Glassmorphic Modals */}
      <GasTankModal />
      <ReviewTradeModal />
      <AuditReceiptModal />
      <AgentMandateModal />
      <MarketSearchModal />
      <ImportTokenModal />

      {/* Real-Time Toast Notifications */}
      <ToastStack />

      {/* 2-Second Initial Splashscreen */}
      {showSplash && (
        <SplashScreen
          durationMs={2000}
          onComplete={() => setShowSplash(false)}
        />
      )}
    </div>
  );
};

export default App;

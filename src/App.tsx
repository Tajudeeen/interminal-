import React, { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { useAppStore } from "./store/useAppStore";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { BottomNav } from "./components/layout/BottomNav";
import { MarketTickerMarquee } from "./components/layout/MarketTickerMarquee";
import { ToastStack } from "./components/layout/ToastStack";
import { SplashScreen } from "./components/layout/SplashScreen";
import { WorkspaceErrorBoundary } from "./components/layout/WorkspaceErrorBoundary";
import { JudgeTourBar } from "./components/layout/JudgeTourBar";

// Views
import { LandingView } from "./components/views/LandingView";
const TreasuryCockpitView = lazy(() => import("./components/views/TreasuryCockpitView").then(m => ({ default: m.TreasuryCockpitView })));
const TerminalTradeView = lazy(() => import("./components/views/TerminalTradeView").then(m => ({ default: m.TerminalTradeView })));
const MarketsView = lazy(() => import("./components/views/MarketsView").then(m => ({ default: m.MarketsView })));
const AiAnalystView = lazy(() => import("./components/views/AiAnalystView").then(m => ({ default: m.AiAnalystView })));
const CorporateLedgerView = lazy(() => import("./components/views/CorporateLedgerView").then(m => ({ default: m.CorporateLedgerView })));
const ProofRpcView = lazy(() => import("./components/views/ProofRpcView").then(m => ({ default: m.ProofRpcView })));
const TestnetLabView = lazy(() => import("./components/views/TestnetLabView").then(m => ({ default: m.TestnetLabView })));

// Modals
import { GasTankModal } from "./components/modals/GasTankModal";
import { ReviewTradeModal } from "./components/modals/ReviewTradeModal";
import { AuditReceiptModal } from "./components/modals/AuditReceiptModal";
import { AgentMandateModal } from "./components/modals/AgentMandateModal";
import { MarketSearchModal } from "./components/modals/MarketSearchModal";
import { ImportTokenModal } from "./components/modals/ImportTokenModal";

export const App: React.FC = () => {
  const { view, theme, setTheme, setSearchOpen, syncMarketData, environmentMode } = useAppStore();
  const [showSplash, setShowSplash] = useState(true);
  const finishSplash = useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    // Theme is applied independently of market refreshes.

    // Global keyboard shortcuts (Ctrl+K or Cmd+K for search)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    if (environmentMode !== "testnet") {
      void syncMarketData();
    }
    const refreshTimer = window.setInterval(() => {
      if (useAppStore.getState().environmentMode !== "testnet") {
        void useAppStore.getState().syncMarketData();
      }
    }, 60_000);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.clearInterval(refreshTimer);
    };
  }, [setSearchOpen, syncMarketData, environmentMode]);

  useEffect(() => { setTheme(theme); }, [theme, setTheme]);

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
      case "testnet":
        return <TestnetLabView />;
      default:
        return <LandingView />;
    }
  };

  return (
    <div className="h-dvh overflow-hidden bg-bg text-themed flex flex-col lg:flex-row antialiased">
      {/* Institutional Desktop Sidebar (Visible on lg: screens) */}
      <Sidebar />

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 h-dvh">
        {/* Mobile / Tablet Header (Hidden on lg:) */}
        <Header />

        {/* Live Animated Ticker Marquee */}
        <MarketTickerMarquee />

        {/* Dynamic Viewport Container with Smooth Transitions */}
        <main className="app-scroll flex-1 min-h-0 overflow-y-auto pb-16 lg:pb-8 scroll-smooth">
          <WorkspaceErrorBoundary key={view}>
            <Suspense fallback={<div role="status" className="p-8 text-sub text-sm">Loading workspace…</div>}>
              <div className="animate-view-fade w-full min-h-full">{renderCurrentView()}</div>
            </Suspense>
          </WorkspaceErrorBoundary>
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

      {/* Arc Hackathon Judge Showcase Tour Floating HUD */}
      <JudgeTourBar />

      {/* 2-Second Initial Splashscreen */}
      {showSplash && (
        <SplashScreen
          durationMs={2000}
          onComplete={finishSplash}
        />
      )}
    </div>
  );
};

export default App;

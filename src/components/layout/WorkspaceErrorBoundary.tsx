import React from "react";
import { useAppStore } from "../../store/useAppStore";
import { Button } from "../ui/Button";

export class WorkspaceErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error) {
    console.error("Workspace render failed", error);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="p-8 max-w-lg mx-auto space-y-4">
        <h1 className="font-display text-xl font-bold">
          This workspace couldn't load.
        </h1>
        <p className="text-sub text-sm">
          Your wallet hasn't submitted a transaction because of this screen
          error. Retry the screen or return home.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => this.setState({ failed: false })}>
            Retry
          </Button>
          <Button
            variant="secondary"
            onClick={() => useAppStore.getState().setView("landing")}
          >
            Return home
          </Button>
        </div>
      </section>
    );
  }
}

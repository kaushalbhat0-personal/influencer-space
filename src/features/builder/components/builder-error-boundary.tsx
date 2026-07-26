"use client";

import { Component } from "react";

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; error: Error | null; }

export class BuilderErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    console.error("Builder error:", error.message);
    console.error("Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-8">
          <div className="max-w-md rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-400">Builder Error</h2>
            <p className="mt-2 text-sm text-zinc-400">{this.state.error?.message || "Unknown error"}</p>
            <p className="mt-1 text-xs text-zinc-600 font-mono">{this.state.error?.stack?.split("\n").slice(0, 3).join("\n")}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
            <p className="text-lg font-semibold">Something went wrong</p>
            <p className="mt-1 text-sm text-red-300">{this.state.error?.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded bg-red-500/20 px-4 py-2 text-sm hover:bg-red-500/30"
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

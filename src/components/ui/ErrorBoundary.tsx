"use client";

import { Component, type ReactNode } from "react";

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
        this.props.fallback ?? (
          <div className="admin-card p-6 text-center" role="alert">
            <p className="text-lg font-semibold text-white">Something went wrong</p>
            <p className="mt-1 text-sm text-zinc-400">{this.state.error?.message}</p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="admin-btn-outline mt-4"
            >
              Try Again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

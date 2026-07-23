"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  componentId: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ComponentErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    console.error(JSON.stringify({
      event: "component.render.failed",
      componentId: this.props.componentId,
      error: error.message,
      timestamp: new Date().toISOString(),
    }));
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="rounded border border-dashed border-red-500/20 bg-red-500/5 p-3 text-center">
          <p className="text-xs text-red-400">Component error</p>
          <p className="mt-0.5 text-[10px] text-zinc-600">{this.props.componentId}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

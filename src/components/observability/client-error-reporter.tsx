"use client";

import { useEffect } from "react";

const MAX_PAYLOAD = 5 * 1024;

function safePost(payload: Record<string, unknown>) {
  try {
    const body = JSON.stringify(payload);
    if (body.length > MAX_PAYLOAD) return;
    // Fire-and-forget, no credentials needed
    fetch("/api/observability/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      // Ignore script errors with no message
      if (!event.message) return;
      safePost({
        message: event.message.slice(0, 2000),
        stack: event.error?.stack?.slice(0, 8000) ?? `${event.filename}:${event.lineno}:${event.colno}`,
        route: window.location.pathname.slice(0, 500),
        operation: "window.onerror",
      });
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason ?? "unhandledrejection");
      const stack = reason instanceof Error ? reason.stack : undefined;
      safePost({
        message: message.slice(0, 2000),
        stack: stack?.slice(0, 8000),
        route: window.location.pathname.slice(0, 500),
        operation: "unhandledrejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

// React error boundary for client components
import React from "react";

type BoundaryState = { hasError: boolean };

export class ClientErrorBoundary extends React.Component<{ children: React.ReactNode }, BoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    safePost({
      message: error.message.slice(0, 2000),
      stack: (error.stack ?? info.componentStack ?? "").slice(0, 8000),
      route: typeof window !== "undefined" ? window.location.pathname.slice(0, 500) : undefined,
      operation: "react_error_boundary",
    });
  }

  render() {
    if (this.state.hasError) {
      // Fallback is handled by Next.js error.tsx; we just capture
      return this.props.children;
    }
    return this.props.children;
  }
}

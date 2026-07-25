import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryMetricsCollector } from "@/lib/generation/infrastructure/metrics/in-memory-metrics";

describe("InMemoryMetricsCollector", () => {
  let metrics: InMemoryMetricsCollector;

  beforeEach(() => {
    metrics = new InMemoryMetricsCollector();
  });

  describe("increment", () => {
    it("increments a counter", () => {
      metrics.increment("requests");
      metrics.increment("requests");
      expect(metrics.getCounter("requests")).toBe(2);
    });

    it("increments by custom value", () => {
      metrics.increment("bytes", 1024);
      expect(metrics.getCounter("bytes")).toBe(1024);
    });

    it("supports tags", () => {
      metrics.increment("api_calls", 1, { method: "GET", path: "/gen" });
      metrics.increment("api_calls", 1, { method: "POST", path: "/gen" });
      expect(metrics.getCounter("api_calls")).toBe(0);
      expect(metrics.getCounter("api_calls", { method: "GET", path: "/gen" })).toBe(1);
      expect(metrics.getCounter("api_calls", { method: "POST", path: "/gen" })).toBe(1);
    });
  });

  describe("gauge", () => {
    it("sets a gauge value", () => {
      metrics.gauge("active_generations", 5);
      expect(metrics.getGauge("active_generations")).toBe(5);
    });

    it("overwrites previous value", () => {
      metrics.gauge("queue_depth", 10);
      metrics.gauge("queue_depth", 3);
      expect(metrics.getGauge("queue_depth")).toBe(3);
    });
  });

  describe("histogram", () => {
    it("records values", () => {
      metrics.histogram("latency", 100);
      metrics.histogram("latency", 200);
      const s = metrics.snapshot();
      expect(s.histograms["latency"].count).toBe(2);
      expect(s.histograms["latency"].sum).toBe(300);
      expect(s.histograms["latency"].min).toBe(100);
      expect(s.histograms["latency"].max).toBe(200);
      expect(s.histograms["latency"].avg).toBe(150);
    });

    it("supports tags", () => {
      metrics.histogram("latency", 50, { stage: "seo" });
      metrics.histogram("latency", 150, { stage: "theme" });
      const s = metrics.snapshot();
      expect(s.histograms["latency{stage=seo}"]).toBeDefined();
      expect(s.histograms["latency{stage=theme}"]).toBeDefined();
    });
  });

  describe("timer", () => {
    it("records a timer", () => {
      metrics.timer("stage_exec", 500);
      metrics.timer("stage_exec", 1500);
      const s = metrics.snapshot();
      expect(s.timers["timer:stage_exec"].count).toBe(2);
      expect(s.timers["timer:stage_exec"].sum).toBe(2000);
      expect(s.timers["timer:stage_exec"].avg).toBe(1000);
    });
  });

  describe("snapshot", () => {
    it("returns snapshot of all metrics", () => {
      metrics.increment("req", 1);
      metrics.gauge("active", 3);
      metrics.histogram("lat", 50);
      metrics.timer("exec", 100);
      const s = metrics.snapshot();
      expect(s.counters).toHaveProperty("req");
      expect(s.gauges).toHaveProperty("active");
      expect(s.histograms).toHaveProperty("lat");
      expect(s.timers).toHaveProperty("timer:exec");
    });
  });

  describe("reset", () => {
    it("clears all metrics", () => {
      metrics.increment("req", 1);
      metrics.gauge("active", 3);
      metrics.reset();
      expect(metrics.getCounter("req")).toBe(0);
      expect(metrics.getGauge("active")).toBe(0);
      const s = metrics.snapshot();
      expect(Object.keys(s.counters)).toHaveLength(0);
      expect(Object.keys(s.gauges)).toHaveLength(0);
    });
  });
});

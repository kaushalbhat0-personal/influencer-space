import { describe, it, expect, beforeEach, vi } from "vitest";
import { InProcessEventPublisher } from "@/lib/generation/infrastructure/events/in-process-events";

describe("InProcessEventPublisher", () => {
  let events: InProcessEventPublisher;

  beforeEach(() => {
    events = new InProcessEventPublisher();
  });

  it("publishes and delivers to subscriber", async () => {
    const handler = vi.fn();
    events.subscribe("generation.completed", handler);
    await events.publish("generation.completed", { id: "g1" });
    expect(handler).toHaveBeenCalledWith({ id: "g1" });
  });

  it("does not deliver to non-matching subscribers", async () => {
    const handler = vi.fn();
    events.subscribe("generation.*", handler);
    await events.publish("other.event", {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("supports wildcard patterns", async () => {
    const handler = vi.fn();
    events.subscribe("generation.*", handler);
    await events.publish("generation.started", {});
    await events.publish("generation.completed", {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("once handler fires only once", async () => {
    const handler = vi.fn();
    events.once("generation.started", handler);
    await events.publish("generation.started", {});
    await events.publish("generation.started", {});
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("subscribe returns unsubscribe function", async () => {
    const handler = vi.fn();
    const unsubscribe = events.subscribe("test.event", handler);
    unsubscribe();
    await events.publish("test.event", {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("once returns unsubscribe function", async () => {
    const handler = vi.fn();
    const unsubscribe = events.once("test.event", handler);
    unsubscribe();
    await events.publish("test.event", {});
    expect(handler).not.toHaveBeenCalled();
  });

  it("unsubscribeAll removes all handlers", async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    events.subscribe("a", h1);
    events.subscribe("b", h2);
    events.unsubscribeAll();
    await events.publish("a", {});
    await events.publish("b", {});
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it("getHistory returns published events", async () => {
    await events.publish("gen.started", { id: "g1" });
    await events.publish("gen.completed", { id: "g1" });
    const h = events.getHistory();
    expect(h).toHaveLength(2);
    expect(h[0]!.eventType).toBe("gen.started");
    expect(h[1]!.eventType).toBe("gen.completed");
  });

  it("getHistory filters by event type", async () => {
    await events.publish("gen.started", {});
    await events.publish("gen.completed", {});
    const h = events.getHistory("gen.started");
    expect(h).toHaveLength(1);
  });

  it("clearHistory empties history", async () => {
    await events.publish("gen.started", {});
    events.clearHistory();
    expect(events.getHistory()).toHaveLength(0);
  });

  it("subscriberCount returns correct count", () => {
    expect(events.subscriberCount()).toBe(0);
    events.subscribe("a", () => {});
    events.subscribe("b", () => {});
    expect(events.subscriberCount()).toBe(2);
  });

  it("handles multiple subscribers to same event", async () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    events.subscribe("test", h1);
    events.subscribe("test", h2);
    await events.publish("test", {});
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it("handles deep wildcards", async () => {
    const handler = vi.fn();
    events.subscribe("generation.*.completed", handler);
    await events.publish("generation.stage.completed", {});
    await events.publish("generation.pipeline.completed", {});
    expect(handler).toHaveBeenCalledTimes(2);
  });

  it("handles question mark in pattern", async () => {
    const handler = vi.fn();
    events.subscribe("gen.st?rted", handler);
    await events.publish("gen.started", {});
    expect(handler).toHaveBeenCalledOnce();
  });

  it("does not throw on handler error", async () => {
    events.subscribe("error", () => { throw new Error("handler fail"); });
    await expect(events.publish("error", {})).resolves.toBeDefined();
  });
});

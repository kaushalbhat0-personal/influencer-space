/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuilderSelection } from "../selection";

describe("BuilderSelection", () => {
  let selection: BuilderSelection;

  beforeEach(() => {
    selection = new BuilderSelection();
  });

  it("starts with empty selection", () => {
    expect(selection.selected).toEqual([]);
    expect(selection.count).toBe(0);
    expect(selection.lastSelected).toBeNull();
  });

  it("selects a single element", () => {
    selection.select("e1");
    expect(selection.selected).toEqual(["e1"]);
    expect(selection.count).toBe(1);
    expect(selection.lastSelected).toBe("e1");
  });

  it("select replaces previous single selection", () => {
    selection.select("e1");
    selection.select("e2");
    expect(selection.selected).toEqual(["e2"]);
    expect(selection.count).toBe(1);
  });

  it("toggle adds element to selection", () => {
    selection.select("e1");
    selection.toggle("e2");
    expect(selection.selected).toContain("e1");
    expect(selection.selected).toContain("e2");
    expect(selection.count).toBe(2);
  });

  it("toggle removes already selected element", () => {
    selection.select("e1");
    selection.toggle("e1");
    expect(selection.selected).toEqual([]);
  });

  it("selectAll adds multiple elements", () => {
    selection.selectAll(["e1", "e2", "e3"]);
    expect(selection.count).toBe(3);
    expect(selection.isSelected("e1")).toBe(true);
    expect(selection.isSelected("e2")).toBe(true);
    expect(selection.isSelected("e3")).toBe(true);
  });

  it("deselectAll clears everything", () => {
    selection.selectAll(["e1", "e2"]);
    selection.deselectAll();
    expect(selection.selected).toEqual([]);
    expect(selection.lastSelected).toBeNull();
  });

  it("isSelected returns correct boolean", () => {
    selection.select("e1");
    expect(selection.isSelected("e1")).toBe(true);
    expect(selection.isSelected("e2")).toBe(false);
  });

  it("multi mode adds to selection without clearing", () => {
    selection.setMode("multi");
    selection.select("e1", "multi");
    selection.select("e2", "multi");
    expect(selection.count).toBe(2);
  });

  it("notifies listeners on select", () => {
    const listener = vi.fn();
    selection.onChange(listener);
    selection.select("e1");
    expect(listener).toHaveBeenCalledWith(["e1"]);
  });

  it("notifies listeners on toggle", () => {
    const listener = vi.fn();
    selection.onChange(listener);
    selection.toggle("e1");
    expect(listener).toHaveBeenCalledWith(["e1"]);
  });

  it("notifies listeners on deselectAll", () => {
    selection.select("e1");
    const listener = vi.fn();
    selection.onChange(listener);
    selection.deselectAll();
    expect(listener).toHaveBeenCalledWith([]);
  });

  it("onChange returns unsubscribe function", () => {
    const listener = vi.fn();
    const unsubscribe = selection.onChange(listener);
    unsubscribe();
    selection.select("e1");
    expect(listener).not.toHaveBeenCalled();
  });

  it("setMode changes selection mode", () => {
    selection.setMode("multi");
    expect(selection.mode).toBe("multi");
  });

  it("range mode clears previous before selection", () => {
    selection.select("e1");
    selection.select("e2", "range");
    expect(selection.selected).toEqual(["e2"]);
  });
});

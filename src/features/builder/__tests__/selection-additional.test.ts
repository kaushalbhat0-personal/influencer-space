/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { BuilderSelection } from "../selection";

describe("BuilderSelection advanced", () => {
  let selection: BuilderSelection;

  beforeEach(() => {
    selection = new BuilderSelection();
  });

  it("handles empty toggle", () => {
    selection.toggle("e1");
    expect(selection.isSelected("e1")).toBe(true);
    selection.toggle("e1");
    expect(selection.isSelected("e1")).toBe(false);
  });

  it("selectAll with empty array", () => {
    selection.selectAll([]);
    expect(selection.count).toBe(0);
  });

  it("deselectAll on empty selection does not error", () => {
    expect(() => selection.deselectAll()).not.toThrow();
  });

  it("isSelected returns false for non-existent id", () => {
    expect(selection.isSelected("nonexistent")).toBe(false);
  });

  it("mode defaults to single", () => {
    expect(selection.mode).toBe("single");
  });

  it("onChange fires for multi-mode selects", () => {
    const listener = vi.fn();
    selection.onChange(listener);
    selection.setMode("multi");
    selection.select("e1", "multi");
    expect(listener).toHaveBeenCalledWith(["e1"]);
  });

  it("select then toggle adds second element", () => {
    selection.select("e1");
    selection.toggle("e2");
    expect(selection.selected).toEqual(["e1", "e2"]);
  });

  it("toggle same element twice removes it", () => {
    selection.toggle("e1");
    selection.toggle("e1");
    expect(selection.isSelected("e1")).toBe(false);
  });

  it("lastSelected tracks most recent selection", () => {
    selection.select("e1");
    expect(selection.lastSelected).toBe("e1");
    selection.select("e2");
    expect(selection.lastSelected).toBe("e2");
  });

  it("lastSelected updates on toggle", () => {
    selection.toggle("e1");
    expect(selection.lastSelected).toBe("e1");
  });
});

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BuilderHistory } from "../history";
import type { BuilderCommand } from "../commands";

function createMockCommand(label: string): BuilderCommand {
  return {
    type: label,
    execute: vi.fn(),
    undo: vi.fn(),
  };
}

describe("BuilderHistory", () => {
  let history: BuilderHistory;

  beforeEach(() => {
    history = new BuilderHistory();
  });

  it("starts empty", () => {
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(0);
  });

  it("pushes a history entry", () => {
    history.push([createMockCommand("cmd1")], "First action");
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(1);
    expect(history.currentLabel).toBe("First action");
  });

  it("undo reverts the command", () => {
    const cmd = createMockCommand("test");
    history.push([cmd], "Test");
    history.undo();
    expect(cmd.undo).toHaveBeenCalled();
    expect(history.canRedo).toBe(true);
  });

  it("redo re-executes after undo", () => {
    const cmd = createMockCommand("test");
    history.push([cmd], "Test");
    history.undo();
    history.redo();
    expect(cmd.execute).toHaveBeenCalledTimes(1);
  });

  it("undo returns null when nothing to undo", () => {
    expect(history.undo()).toBeNull();
  });

  it("redo returns null when nothing to redo", () => {
    expect(history.redo()).toBeNull();
  });

  it("pushes clear redo stack", () => {
    const cmd1 = createMockCommand("cmd1");
    history.push([cmd1], "First");
    history.undo();
    expect(history.canRedo).toBe(true);
    history.push([createMockCommand("cmd2")], "Second");
    expect(history.canRedo).toBe(false);
  });

  it("enforces max history limit", () => {
    for (let i = 0; i < 60; i++) {
      history.push([createMockCommand(`cmd${i}`)], `Entry ${i}`);
    }
    expect(history.size).toBe(50);
  });

  it("clear resets everything", () => {
    history.push([createMockCommand("cmd1")], "First");
    history.push([createMockCommand("cmd2")], "Second");
    expect(history.canUndo).toBe(true);
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(0);
  });

  it("snapshot returns all entries", () => {
    history.push([createMockCommand("cmd1")], "Entry 1");
    history.push([createMockCommand("cmd2")], "Entry 2");
    const snap = history.snapshot();
    expect(snap).toHaveLength(2);
    expect(snap[0].label).toBe("Entry 1");
    expect(snap[1].label).toBe("Entry 2");
  });

  it("undo reverses command order for multi-command entries", () => {
    const cmd1 = createMockCommand("first");
    const cmd2 = createMockCommand("second");
    history.push([cmd1, cmd2], "Multi");
    history.undo();
    expect(cmd2.undo).toHaveBeenCalled();
    expect(cmd1.undo).toHaveBeenCalled();
  });

  it("currentLabel returns null when empty", () => {
    expect(history.currentLabel).toBeNull();
  });

  it("pushes multiple entries correctly", () => {
    history.push([createMockCommand("a")], "A");
    history.push([createMockCommand("b")], "B");
    history.push([createMockCommand("c")], "C");
    expect(history.size).toBe(3);
    expect(history.currentLabel).toBe("C");
    history.undo();
    expect(history.currentLabel).toBe("B");
    history.undo();
    expect(history.currentLabel).toBe("A");
  });
});

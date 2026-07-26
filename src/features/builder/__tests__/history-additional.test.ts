/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { BuilderHistory } from "../history";
import type { BuilderCommand } from "../commands";

function mockCmd(): BuilderCommand {
  return { type: "test", execute: vi.fn(), undo: vi.fn() };
}

describe("BuilderHistory advanced", () => {
  let history: BuilderHistory;

  beforeEach(() => {
    history = new BuilderHistory();
  });

  it("undo restores after multiple commands in entry", () => {
    const cmd1 = mockCmd();
    const cmd2 = mockCmd();
    history.push([cmd1, cmd2], "Two commands");
    history.undo();
    expect(cmd2.undo).toHaveBeenCalled();
    expect(cmd1.undo).toHaveBeenCalled();
  });

  it("redo after undo executes commands in order", () => {
    const cmd1 = mockCmd();
    const cmd2 = mockCmd();
    history.push([cmd1, cmd2], "Two commands");
    history.undo();
    history.redo();
    expect(cmd1.execute).toHaveBeenCalled();
    expect(cmd2.execute).toHaveBeenCalled();
  });

  it("can undo multiple times", () => {
    history.push([mockCmd()], "A");
    history.push([mockCmd()], "B");
    history.push([mockCmd()], "C");
    expect(history.canUndo).toBe(true);
    history.undo();
    expect(history.currentLabel).toBe("B");
    history.undo();
    expect(history.currentLabel).toBe("A");
    history.undo();
    expect(history.canUndo).toBe(false);
  });

  it("can redo after undoing multiple", () => {
    history.push([mockCmd()], "A");
    history.push([mockCmd()], "B");
    history.undo();
    history.undo();
    expect(history.canRedo).toBe(true);
    history.redo();
    expect(history.currentLabel).toBe("A");
    history.redo();
    expect(history.currentLabel).toBe("B");
    expect(history.canRedo).toBe(false);
  });

  it("push after undo clears redo stack", () => {
    history.push([mockCmd()], "A");
    history.push([mockCmd()], "B");
    history.undo();
    expect(history.canRedo).toBe(true);
    history.push([mockCmd()], "C");
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(2);
  });

  it("clear resets from any state", () => {
    history.push([mockCmd()], "A");
    history.push([mockCmd()], "B");
    history.undo();
    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.size).toBe(0);
    expect(history.currentLabel).toBeNull();
  });

  it("snapshot before any pushes returns empty", () => {
    expect(history.snapshot()).toEqual([]);
  });

  it("discards oldest entry when over max", () => {
    for (let i = 0; i < 51; i++) {
      history.push([mockCmd()], `E${i}`);
    }
    expect(history.size).toBe(50);
    expect(history.currentLabel).toBe("E50");
    history.undo();
    expect(history.currentLabel).toBe("E49");
  });
});

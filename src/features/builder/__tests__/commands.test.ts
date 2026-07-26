/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi } from "vitest";
import {
  MoveSectionCommand, ToggleVisibilityCommand, ChangeVariantCommand,
  UpdateSpacingCommand, ChangeThemeCommand, AddSectionCommand, RemoveSectionCommand,
} from "../commands";

describe("MoveSectionCommand", () => {
  it("executes reorder with toIndex", () => {
    const reorder = vi.fn();
    const restore = vi.fn();
    const cmd = new MoveSectionCommand("s1", 0, 2, reorder, restore);
    cmd.execute();
    expect(reorder).toHaveBeenCalledWith("s1", 2);
  });

  it("undo restores to fromIndex", () => {
    const reorder = vi.fn();
    const restore = vi.fn();
    const cmd = new MoveSectionCommand("s1", 0, 2, reorder, restore);
    cmd.undo();
    expect(restore).toHaveBeenCalledWith("s1", 0);
  });

  it("has type move-section", () => {
    const cmd = new MoveSectionCommand("s1", 0, 1, vi.fn(), vi.fn());
    expect(cmd.type).toBe("move-section");
  });
});

describe("ToggleVisibilityCommand", () => {
  it("execute toggles to opposite state", () => {
    const toggle = vi.fn();
    const cmd = new ToggleVisibilityCommand("e1", true, toggle);
    cmd.execute();
    expect(toggle).toHaveBeenCalledWith("e1", false);
  });

  it("undo restores original state", () => {
    const toggle = vi.fn();
    const cmd = new ToggleVisibilityCommand("e1", true, toggle);
    cmd.undo();
    expect(toggle).toHaveBeenCalledWith("e1", true);
  });
});

describe("ChangeVariantCommand", () => {
  it("execute applies new variant", () => {
    const apply = vi.fn();
    const cmd = new ChangeVariantCommand("s1", "default", "hero", apply);
    cmd.execute();
    expect(apply).toHaveBeenCalledWith("s1", "hero");
  });

  it("undo applies old variant", () => {
    const apply = vi.fn();
    const cmd = new ChangeVariantCommand("s1", "default", "hero", apply);
    cmd.undo();
    expect(apply).toHaveBeenCalledWith("s1", "default");
  });
});

describe("UpdateSpacingCommand", () => {
  it("execute updates spacing with new value", () => {
    const update = vi.fn();
    const cmd = new UpdateSpacingCommand("s1", "padding", "sm", "lg", update);
    cmd.execute();
    expect(update).toHaveBeenCalledWith("s1", "padding", "lg");
  });

  it("undo reverts to old value", () => {
    const update = vi.fn();
    const cmd = new UpdateSpacingCommand("s1", "padding", "sm", "lg", update);
    cmd.undo();
    expect(update).toHaveBeenCalledWith("s1", "padding", "sm");
  });
});

describe("ChangeThemeCommand", () => {
  it("execute applies new theme", () => {
    const apply = vi.fn();
    const cmd = new ChangeThemeCommand({ primary: "#000" }, { primary: "#fff" }, apply);
    cmd.execute();
    expect(apply).toHaveBeenCalledWith({ primary: "#fff" });
  });

  it("undo applies old theme", () => {
    const apply = vi.fn();
    const cmd = new ChangeThemeCommand({ primary: "#000" }, { primary: "#fff" }, apply);
    cmd.undo();
    expect(apply).toHaveBeenCalledWith({ primary: "#000" });
  });
});

describe("AddSectionCommand", () => {
  it("execute adds section", () => {
    const add = vi.fn();
    const remove = vi.fn();
    const cmd = new AddSectionCommand("s1", add, remove);
    cmd.execute();
    expect(add).toHaveBeenCalledWith("s1");
  });

  it("undo removes section", () => {
    const add = vi.fn();
    const remove = vi.fn();
    const cmd = new AddSectionCommand("s1", add, remove);
    cmd.undo();
    expect(remove).toHaveBeenCalledWith("s1");
  });
});

describe("RemoveSectionCommand", () => {
  it("execute removes section", () => {
    const add = vi.fn();
    const remove = vi.fn();
    const cmd = new RemoveSectionCommand("s1", add, remove);
    cmd.execute();
    expect(remove).toHaveBeenCalledWith("s1");
  });

  it("undo adds section back", () => {
    const add = vi.fn();
    const remove = vi.fn();
    const cmd = new RemoveSectionCommand("s1", add, remove);
    cmd.undo();
    expect(add).toHaveBeenCalledWith("s1");
  });
});

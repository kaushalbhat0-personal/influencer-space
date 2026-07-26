/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

import { describe, it, expect, vi } from "vitest";
import {
  MoveSectionCommand, ToggleVisibilityCommand, ChangeVariantCommand,
  UpdateSpacingCommand, ChangeThemeCommand, AddSectionCommand, RemoveSectionCommand,
} from "../commands";

describe("MoveSectionCommand edge cases", () => {
  it("execute with same from/to index is a no-op", () => {
    const reorder = vi.fn();
    const cmd = new MoveSectionCommand("s1", 1, 1, reorder, vi.fn());
    cmd.execute();
    expect(reorder).toHaveBeenCalledWith("s1", 1);
  });

  it("handles undefined fromIndex gracefully", () => {
    const cmd = new MoveSectionCommand("s1", undefined as any, 3, vi.fn(), vi.fn());
    expect(() => cmd.execute()).not.toThrow();
  });
});

describe("ToggleVisibilityCommand edge cases", () => {
  it("executes multiple times toggles correctly", () => {
    const toggle = vi.fn();
    const cmd = new ToggleVisibilityCommand("e1", true, toggle);
    cmd.execute();
    cmd.execute();
    expect(toggle).toHaveBeenNthCalledWith(1, "e1", false);
    expect(toggle).toHaveBeenNthCalledWith(2, "e1", false);
  });

  it("undo after multiple executes still restores original", () => {
    const toggle = vi.fn();
    const cmd = new ToggleVisibilityCommand("e1", true, toggle);
    cmd.execute();
    cmd.execute();
    cmd.undo();
    expect(toggle).toHaveBeenLastCalledWith("e1", true);
  });
});

describe("ChangeVariantCommand edge cases", () => {
  it("handles identical variants", () => {
    const apply = vi.fn();
    const cmd = new ChangeVariantCommand("s1", "hero", "hero", apply);
    cmd.execute();
    expect(apply).toHaveBeenCalledWith("s1", "hero");
  });

  it("type returns change-variant", () => {
    const cmd = new ChangeVariantCommand("s1", "a", "b", vi.fn());
    expect(cmd.type).toBe("change-variant");
  });
});

describe("UpdateSpacingCommand edge cases", () => {
  it("updates multiple spacing keys", () => {
    const update = vi.fn();
    const cmd1 = new UpdateSpacingCommand("s1", "padding", "sm", "md", update);
    const cmd2 = new UpdateSpacingCommand("s1", "margin", "sm", "md", update);
    cmd1.execute();
    cmd2.execute();
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("undo reverts only its own key", () => {
    const update = vi.fn();
    const cmd = new UpdateSpacingCommand("s1", "padding", "sm", "lg", update);
    cmd.execute();
    cmd.undo();
    expect(update).toHaveBeenLastCalledWith("s1", "padding", "sm");
  });
});

describe("ChangeThemeCommand edge cases", () => {
  it("handles nested theme objects", () => {
    const apply = vi.fn();
    const oldTheme = { colors: { primary: "#000", secondary: "#fff" }, fonts: { heading: "Inter" } };
    const newTheme = { colors: { primary: "#ff0" }, fonts: { heading: "Roboto" } };
    const cmd = new ChangeThemeCommand(oldTheme, newTheme, apply);
    cmd.execute();
    expect(apply).toHaveBeenCalledWith(newTheme);
    cmd.undo();
    expect(apply).toHaveBeenCalledWith(oldTheme);
  });

  it("type returns change-theme", () => {
    const cmd = new ChangeThemeCommand({}, {}, vi.fn());
    expect(cmd.type).toBe("change-theme");
  });
});

describe("AddSectionCommand edge cases", () => {
  it("executing twice calls add twice", () => {
    const add = vi.fn();
    const cmd = new AddSectionCommand("s1", add, vi.fn());
    cmd.execute();
    cmd.execute();
    expect(add).toHaveBeenCalledTimes(2);
  });

  it("undo twice calls remove twice", () => {
    const remove = vi.fn();
    const cmd = new AddSectionCommand("s1", vi.fn(), remove);
    cmd.undo();
    cmd.undo();
    expect(remove).toHaveBeenCalledTimes(2);
  });
});

describe("RemoveSectionCommand edge cases", () => {
  it("execute calls remove", () => {
    const remove = vi.fn();
    const cmd = new RemoveSectionCommand("s1", vi.fn(), remove);
    cmd.execute();
    expect(remove).toHaveBeenCalledWith("s1");
  });

  it("undo calls add", () => {
    const add = vi.fn();
    const cmd = new RemoveSectionCommand("s1", add, vi.fn());
    cmd.undo();
    expect(add).toHaveBeenCalledWith("s1");
  });
});

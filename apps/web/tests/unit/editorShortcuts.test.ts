import { describe, expect, it, vi, afterEach } from "vitest";

import {
  getCopyShortcut,
  getDuplicateShortcut,
  getEditorShortcuts,
  getPasteShortcut,
  getRotateClockwiseShortcut,
  getRotateCounterClockwiseShortcut,
} from "@shared/config/editorShortcuts";

describe("editorShortcuts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("includes core editor shortcuts", () => {
    const labels = getEditorShortcuts().map((shortcut) => shortcut.label);
    expect(labels).toContain("Undo");
    expect(labels).toContain("Redo");
    expect(labels).toContain("Copy selection");
    expect(labels).toContain("Paste");
    expect(labels).toContain("Duplicate selection");
    expect(labels).toContain("Delete selection");
    expect(labels).toContain("Rotate shape 90°");
    expect(labels).toContain("Rotate shape −90°");
    expect(labels).toContain("Zoom canvas");
    expect(labels).toContain("Close menu, dialog, or dropdown");
  });

  it("exposes rotate shortcuts", () => {
    expect(getRotateClockwiseShortcut()).toBe("R");
    expect(getRotateCounterClockwiseShortcut()).toBe("Shift+R");
  });

  it("merges label editing shortcuts into one row", () => {
    const editShortcut = getEditorShortcuts().find(
      (shortcut) => shortcut.label === "Edit label or button",
    );
    expect(editShortcut?.keys).toBe("Enter / Double-click");
    expect(
      getEditorShortcuts().filter((shortcut) => shortcut.label === "Edit label or button"),
    ).toHaveLength(1);
  });

  it("formats copy/paste/duplicate shortcuts for non-mac platforms", () => {
    vi.stubGlobal("navigator", { platform: "Win32" });
    expect(getCopyShortcut()).toBe("Ctrl+C");
    expect(getPasteShortcut()).toBe("Ctrl+V");
    expect(getDuplicateShortcut()).toBe("Ctrl+D");
  });

  it("formats copy/paste/duplicate shortcuts for mac platforms", () => {
    vi.stubGlobal("navigator", { platform: "MacIntel" });
    expect(getCopyShortcut()).toBe("⌘C");
    expect(getPasteShortcut()).toBe("⌘V");
    expect(getDuplicateShortcut()).toBe("⌘D");
  });
});

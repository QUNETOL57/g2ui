import { describe, expect, it } from "vitest";

import { getEditorShortcuts } from "@shared/config/editorShortcuts";

describe("editorShortcuts", () => {
  it("includes core editor shortcuts", () => {
    const labels = getEditorShortcuts().map((shortcut) => shortcut.label);
    expect(labels).toContain("Undo");
    expect(labels).toContain("Redo");
    expect(labels).toContain("Delete selection");
    expect(labels).toContain("Zoom canvas");
    expect(labels).toContain("Close menu, dialog, or dropdown");
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
});

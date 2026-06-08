export interface EditorShortcut {
  label: string;
  keys: string;
}

export function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
}

export function getUndoShortcut() {
  return isMacPlatform() ? "⌘Z" : "Ctrl+Z";
}

export function getRedoShortcut() {
  return isMacPlatform() ? "⌘⇧Z" : "Ctrl+Shift+Z";
}

export function getEditorShortcuts(): EditorShortcut[] {
  const mac = isMacPlatform();
  const mod = mac ? "⌘" : "Ctrl";

  return [
    { label: "Undo", keys: getUndoShortcut() },
    { label: "Redo", keys: mac ? getRedoShortcut() : `${getRedoShortcut()} / Ctrl+Y` },
    { label: "Delete selection", keys: "Delete / Backspace" },
    { label: "Edit label or button", keys: "Enter / Double-click" },
    { label: "Add to selection", keys: mac ? "⌘Click" : "Ctrl+Click" },
    { label: "Range selection", keys: "Shift+Click" },
    { label: "Zoom canvas", keys: mac ? "⌘Wheel" : "Ctrl+Wheel" },
    { label: "Apply property value", keys: "Enter" },
    { label: "Revert property value", keys: "Escape" },
    { label: "Close menu, dialog, or dropdown", keys: "Escape" },
  ];
}

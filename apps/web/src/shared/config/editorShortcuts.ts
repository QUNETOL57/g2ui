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

export function getCopyShortcut() {
  return isMacPlatform() ? "⌘C" : "Ctrl+C";
}

export function getPasteShortcut() {
  return isMacPlatform() ? "⌘V" : "Ctrl+V";
}

export function getDuplicateShortcut() {
  return isMacPlatform() ? "⌘D" : "Ctrl+D";
}

export function getRotateClockwiseShortcut() {
  return "R";
}

export function getRotateCounterClockwiseShortcut() {
  return "Shift+R";
}

export function getEditorShortcuts(): EditorShortcut[] {
  const mac = isMacPlatform();
  const mod = mac ? "⌘" : "Ctrl";

  return [
    { label: "Undo", keys: getUndoShortcut() },
    { label: "Redo", keys: mac ? getRedoShortcut() : `${getRedoShortcut()} / Ctrl+Y` },
    { label: "Copy selection", keys: getCopyShortcut() },
    { label: "Paste", keys: getPasteShortcut() },
    { label: "Duplicate selection", keys: getDuplicateShortcut() },
    { label: "Delete selection", keys: "Delete / Backspace" },
    { label: "Rotate shape 90°", keys: getRotateClockwiseShortcut() },
    { label: "Rotate shape −90°", keys: getRotateCounterClockwiseShortcut() },
    { label: "Edit label or button", keys: "Enter / Double-click" },
    { label: "Add to selection", keys: mac ? "⌘Click · tree or canvas · ⇧Click · canvas" : "Ctrl+Click · tree or canvas · Shift+Click · canvas" },
    { label: "Range selection", keys: "Shift+Click · tree" },
    { label: "Marquee selection", keys: "Drag empty canvas or around it" },
    { label: "Zoom canvas", keys: mac ? "⌘Wheel" : "Ctrl+Wheel" },
    { label: "Apply property value", keys: "Enter" },
    { label: "Revert property value", keys: "Escape" },
    { label: "Close menu, dialog, or dropdown", keys: "Escape" },
  ];
}

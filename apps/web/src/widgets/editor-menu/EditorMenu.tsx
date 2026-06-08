import { useEffect, useId, useRef, useState } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { getRedoShortcut, getUndoShortcut } from "@shared/config/editorShortcuts";
import { cn } from "@shared/lib/cn";
import { ExportProjectModal } from "@widgets/export-panel/ExportProjectModal";
import { ImportProjectModal } from "@widgets/export-panel/ImportProjectModal";
import { PaletteModal } from "@widgets/palette-panel/PaletteModal";

import styles from "./EditorMenu.module.css";

type OpenMenuId = "project" | "edit" | null;

interface EditorMenuProps {
  onBackToLibrary: () => void;
}

export function EditorMenu({ onBackToLibrary }: EditorMenuProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.historyPast.length > 0);
  const canRedo = useEditorStore((s) => s.historyFuture.length > 0);

  const [openMenuId, setOpenMenuId] = useState<OpenMenuId>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuBaseId = useId();

  useEffect(() => {
    if (!openMenuId) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenuId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenuId(null);
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const closeMenu = () => setOpenMenuId(null);

  const openModal = (modal: "export" | "import" | "palette") => {
    closeMenu();
    if (modal === "export") setExportOpen(true);
    if (modal === "import") setImportOpen(true);
    if (modal === "palette") setPaletteOpen(true);
  };

  const projectMenuId = `${menuBaseId}-project`;
  const editMenuId = `${menuBaseId}-edit`;

  return (
    <>
      <div className={styles.menuBar} ref={rootRef} role="menubar" aria-label="Editor menu">
        <div className={styles.menuGroup}>
          <button
            type="button"
            className={cn(styles.menuTrigger, openMenuId === "project" && styles.menuTriggerOpen)}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openMenuId === "project"}
            aria-controls={projectMenuId}
            onClick={() => setOpenMenuId((current) => (current === "project" ? null : "project"))}
          >
            Project
          </button>
          {openMenuId === "project" ? (
            <div className={styles.menu} id={projectMenuId} role="menu" aria-label="Project">
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => {
                  closeMenu();
                  onBackToLibrary();
                }}
              >
                <span className={styles.menuItemLabel}>Back to library</span>
              </button>
              <div className={styles.menuSeparator} role="separator" />
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => openModal("export")}
              >
                <span className={styles.menuItemLabel}>Export…</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => openModal("import")}
              >
                <span className={styles.menuItemLabel}>Import…</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                onClick={() => openModal("palette")}
              >
                <span className={styles.menuItemLabel}>Edit palette…</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className={styles.menuGroup}>
          <button
            type="button"
            className={cn(styles.menuTrigger, openMenuId === "edit" && styles.menuTriggerOpen)}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openMenuId === "edit"}
            aria-controls={editMenuId}
            onClick={() => setOpenMenuId((current) => (current === "edit" ? null : "edit"))}
          >
            Edit
          </button>
          {openMenuId === "edit" ? (
            <div className={styles.menu} id={editMenuId} role="menu" aria-label="Edit">
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                disabled={!canUndo}
                onClick={() => {
                  closeMenu();
                  undo();
                }}
              >
                <span className={styles.menuItemLabel}>Undo</span>
                <span className={styles.menuItemShortcut}>{getUndoShortcut()}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                disabled={!canRedo}
                onClick={() => {
                  closeMenu();
                  redo();
                }}
              >
                <span className={styles.menuItemLabel}>Redo</span>
                <span className={styles.menuItemShortcut}>{getRedoShortcut()}</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <PaletteModal open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ExportProjectModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportProjectModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}

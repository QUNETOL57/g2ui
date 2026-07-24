import { useEffect, useId, useRef, useState } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import {
  getCopyShortcut,
  getDuplicateShortcut,
  getPasteShortcut,
  getRedoShortcut,
  getUndoShortcut,
} from "@shared/config/editorShortcuts";
import { cn } from "@shared/lib/cn";
import { ExportProjectModal } from "@widgets/export-panel/ExportProjectModal";
import { ImportProjectModal } from "@widgets/export-panel/ImportProjectModal";
import { PaletteModal } from "@widgets/palette-panel/PaletteModal";

import styles from "./EditorMenu.module.css";

type OpenMenuId = "project" | "edit" | "view" | null;
type ViewSettingId = "grid" | "rulers" | "guides";

interface EditorMenuProps {
  onBackToLibrary: () => void;
  viewSettings?: {
    showGrid: boolean;
    showRulers: boolean;
    showGuides: boolean;
    onToggleGrid: () => void;
    onToggleRulers: () => void;
    onToggleGuides: () => void;
  };
}

const viewSettingPreviews: Record<
  ViewSettingId,
  { title: string; description: string; kind: ViewSettingId }
> = {
  grid: {
    title: "Grid",
    description: "Shows the pixel grid on high zoom for precise drawing and placement.",
    kind: "grid",
  },
  rulers: {
    title: "Rulers",
    description: "Shows horizontal and vertical rulers around the canvas.",
    kind: "rulers",
  },
  guides: {
    title: "Guides",
    description: "Shows alignment guide lines from the selected object to the canvas edges.",
    kind: "guides",
  },
};

export function EditorMenu({ onBackToLibrary, viewSettings }: EditorMenuProps) {
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const copySelectedNodes = useEditorStore((s) => s.copySelectedNodes);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const duplicateSelectedNodes = useEditorStore((s) => s.duplicateSelectedNodes);
  const canUndo = useEditorStore((s) => s.historyPast.length > 0);
  const canRedo = useEditorStore((s) => s.historyFuture.length > 0);
  const hasClipboard = useEditorStore((s) => s.hasClipboard);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const canCopy = selectedNodeIds.some((id) => id !== activeScreenId);
  const canDuplicate = canCopy;

  const [openMenuId, setOpenMenuId] = useState<OpenMenuId>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [hoveredViewSetting, setHoveredViewSetting] = useState<ViewSettingId | null>(null);
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
  const viewMenuId = `${menuBaseId}-view`;
  const viewPreview = hoveredViewSetting ? viewSettingPreviews[hoveredViewSetting] : null;

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
            className={cn(styles.menuTrigger, openMenuId === "view" && styles.menuTriggerOpen)}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={openMenuId === "view"}
            aria-controls={viewMenuId}
            onClick={() => setOpenMenuId((current) => (current === "view" ? null : "view"))}
          >
            View
          </button>
          {openMenuId === "view" ? (
            <div className={styles.menu} id={viewMenuId} role="menu" aria-label="View">
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={viewSettings?.showGrid ?? true}
                className={styles.menuItem}
                onMouseEnter={() => setHoveredViewSetting("grid")}
                onFocus={() => setHoveredViewSetting("grid")}
                onClick={viewSettings?.onToggleGrid}
              >
                <span className={styles.menuItemCheck} aria-hidden>
                  {viewSettings?.showGrid ?? true ? "✓" : ""}
                </span>
                <span className={styles.menuItemLabel}>Grid</span>
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={viewSettings?.showRulers ?? true}
                className={styles.menuItem}
                onMouseEnter={() => setHoveredViewSetting("rulers")}
                onFocus={() => setHoveredViewSetting("rulers")}
                onClick={viewSettings?.onToggleRulers}
              >
                <span className={styles.menuItemCheck} aria-hidden>
                  {viewSettings?.showRulers ?? true ? "✓" : ""}
                </span>
                <span className={styles.menuItemLabel}>Rulers</span>
              </button>
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={viewSettings?.showGuides ?? true}
                className={styles.menuItem}
                onMouseEnter={() => setHoveredViewSetting("guides")}
                onFocus={() => setHoveredViewSetting("guides")}
                onClick={viewSettings?.onToggleGuides}
              >
                <span className={styles.menuItemCheck} aria-hidden>
                  {viewSettings?.showGuides ?? true ? "✓" : ""}
                </span>
                <span className={styles.menuItemLabel}>Guides</span>
              </button>
              {viewPreview ? (
                <aside
                  className={styles.menuPreview}
                  data-testid="view-setting-preview"
                  aria-live="polite"
                >
                  <div className={styles.previewTitle}>{viewPreview.title}</div>
                  <div className={styles.previewCanvas} aria-hidden>
                    {viewPreview.kind === "grid" ? <div className={styles.previewGrid} /> : null}
                    {viewPreview.kind === "rulers" ? (
                      <>
                        <div className={styles.previewRulerGrid} />
                        <div className={styles.previewRulerTop} />
                        <div className={styles.previewRulerLeft} />
                      </>
                    ) : null}
                    {viewPreview.kind === "guides" ? (
                      <>
                        <div className={styles.previewRulerGrid} />
                        <div className={styles.previewRulerTop} />
                        <div className={styles.previewRulerLeft} />
                        <div className={cn(styles.previewGuideV, styles.previewGuideVLeft)} />
                        <div className={cn(styles.previewGuideV, styles.previewGuideVRight)} />
                        <div className={cn(styles.previewGuideH, styles.previewGuideHTop)} />
                        <div className={cn(styles.previewGuideH, styles.previewGuideHBottom)} />
                        <span className={cn(styles.previewGuideLabel, styles.previewGuideLabelTopLeft)}>
                          15
                        </span>
                        <span
                          className={cn(styles.previewGuideLabel, styles.previewGuideLabelTopRight)}
                        >
                          36
                        </span>
                        <span
                          className={cn(styles.previewGuideLabel, styles.previewGuideLabelLeftTop)}
                        >
                          10
                        </span>
                        <span
                          className={cn(
                            styles.previewGuideLabel,
                            styles.previewGuideLabelLeftBottom,
                          )}
                        >
                          18
                        </span>
                        <span className={styles.previewSelectionText}>Text</span>
                        <span className={cn(styles.previewHandle, styles.previewHandleNw)} />
                        <span className={cn(styles.previewHandle, styles.previewHandleNe)} />
                        <span className={cn(styles.previewHandle, styles.previewHandleSw)} />
                        <span className={cn(styles.previewHandle, styles.previewHandleSe)} />
                      </>
                    ) : null}
                  </div>
                  <p className={styles.previewDescription}>{viewPreview.description}</p>
                </aside>
              ) : null}
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
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                disabled={!canCopy}
                onClick={() => {
                  closeMenu();
                  copySelectedNodes();
                }}
              >
                <span className={styles.menuItemLabel}>Copy</span>
                <span className={styles.menuItemShortcut}>{getCopyShortcut()}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                disabled={!hasClipboard}
                onClick={() => {
                  closeMenu();
                  pasteClipboard();
                }}
              >
                <span className={styles.menuItemLabel}>Paste</span>
                <span className={styles.menuItemShortcut}>{getPasteShortcut()}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                className={styles.menuItem}
                disabled={!canDuplicate}
                onClick={() => {
                  closeMenu();
                  duplicateSelectedNodes();
                }}
              >
                <span className={styles.menuItemLabel}>Duplicate</span>
                <span className={styles.menuItemShortcut}>{getDuplicateShortcut()}</span>
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

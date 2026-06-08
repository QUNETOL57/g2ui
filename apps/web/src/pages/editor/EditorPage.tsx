import { useEffect, useState } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { cn } from "@shared/lib/cn";
import { findNode } from "@entities/ui-project/model/tree-ops";
import logoUrl from "@shared/assets/logo.svg";
import { TopBar } from "@shared/ui/TopBar";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";
import { LeftPanelLayout } from "@widgets/left-panel/LeftPanelLayout";

import styles from "./EditorPage.module.css";

interface EditorPageProps {
  autosaveStatus?: "local" | "saved" | "saving" | "unsynced" | "error";
  autosaveError?: string | null;
  onBackToLibrary: () => void;
}

export function EditorPage({
  autosaveStatus = "local",
  autosaveError = null,
  onBackToLibrary,
}: EditorPageProps) {
  const lastError = useEditorStore((s) => s.lastError);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const isModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const isUndoKey = isModifier && key === "z" && !event.shiftKey;
      const isRedoKey = isModifier && ((key === "z" && event.shiftKey) || key === "y");

      if ((isUndoKey || isRedoKey) && !isEditingText) {
        event.preventDefault();
        if (isUndoKey) undo();
        else redo();
        return;
      }

      if (
        event.key === "Enter" &&
        !isModifier &&
        !isEditingText &&
        selectedNodeId
      ) {
        const node = findNode(useEditorStore.getState().project, selectedNodeId);
        if (node?.type === "label" || node?.type === "button") {
          event.preventDefault();
          beginLabelTextEdit(selectedNodeId);
          return;
        }
      }

      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";

      if (!isDeleteKey || selectedNodeIds.length === 0) return;
      if (isEditingText) return;

      event.preventDefault();
      deleteNodes(selectedNodeIds);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [beginLabelTextEdit, deleteNodes, redo, selectedNodeId, selectedNodeIds, undo]);

  return (
    <div
      className={cn(
        styles.appShell,
        !leftPanelOpen && styles.appShellLeftCollapsed,
        !rightPanelOpen && styles.appShellRightCollapsed,
      )}
    >
      <TopBar>
        <div className={styles.brand}>
          <button
            type="button"
            className={styles.brandLogoButton}
            onClick={onBackToLibrary}
            title="Back to project library"
            aria-label="Back to project library"
          >
            <img
              className={styles.brandLogo}
              src={logoUrl}
              alt=""
              aria-hidden
            />
          </button>
        </div>
      </TopBar>
      <aside
        className={cn(styles.leftPanel, !leftPanelOpen && styles.panelCollapsed)}
        aria-hidden={!leftPanelOpen}
      >
        {leftPanelOpen ? <LeftPanelLayout /> : null}
      </aside>
      <div className={styles.centerPanel}>
        <CanvasWorkspace
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
          onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
        />
        {lastError ? <div className={styles.errorBanner}>{lastError}</div> : null}
      </div>
      <aside
        className={cn(styles.rightPanel, !rightPanelOpen && styles.panelCollapsed)}
        aria-hidden={!rightPanelOpen}
      >
        {rightPanelOpen ? <PropertiesPanel /> : null}
      </aside>
      <div className={styles.statusBarSlot}>
        <EditorStatusBar autosaveStatus={autosaveStatus} autosaveError={autosaveError} />
      </div>
    </div>
  );
}

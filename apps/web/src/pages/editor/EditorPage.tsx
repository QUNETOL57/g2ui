import { useEffect } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import logoUrl from "@shared/assets/logo.svg";
import { IconButton } from "@shared/ui/IconButton";
import { TopBar } from "@shared/ui/TopBar";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";
import { ExportPanel } from "@widgets/export-panel/ExportPanel";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";
import { TreePanel } from "@widgets/tree-panel/TreePanel";

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
  const project = useEditorStore((s) => s.project);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const deleteNode = useEditorStore((s) => s.deleteNode);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

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
        if (node?.type === "label") {
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

      if (!isDeleteKey || !selectedNodeId) return;
      if (isEditingText) return;

      event.preventDefault();
      deleteNode(selectedNodeId);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [beginLabelTextEdit, deleteNode, redo, selectedNodeId, undo]);

  return (
    <div className={styles.appShell}>
      <TopBar>
        <div className={styles.brand}>
          <img
            className={styles.brandLogo}
            src={logoUrl}
            alt="GuiMintLab Studio"
            title="GuiMintLab Studio"
          />
          <div className={styles.brandMain}>
            <IconButton
              className={styles.libraryLink}
              onClick={onBackToLibrary}
              title="Back to project library"
              aria-label="Back to project library"
            >
              ←
            </IconButton>
            <span className={styles.brandMeta}>
              project <strong>{project.name}</strong> · schema {project.schemaVersion}
            </span>
          </div>
        </div>
        <TopBar.Controls>
          <span className={styles.saveStatus}>{autosaveStatusLabel(autosaveStatus, autosaveError)}</span>
          <ExportPanel />
        </TopBar.Controls>
      </TopBar>
      <div className={styles.leftPanel}>
        <TreePanel />
      </div>
      <div className={styles.centerPanel}>
        <CanvasWorkspace />
        {lastError ? <div className={styles.errorBanner}>{lastError}</div> : null}
      </div>
      <div className={styles.rightPanel}>
        <PropertiesPanel />
      </div>
    </div>
  );
}

function autosaveStatusLabel(status: NonNullable<EditorPageProps["autosaveStatus"]>, error: string | null): string {
  if (status === "local") return "local draft";
  if (status === "saved") return "saved";
  if (status === "saving") return "saving...";
  if (status === "unsynced") return "unsynced";
  return error ? `save error: ${error}` : "save error";
}

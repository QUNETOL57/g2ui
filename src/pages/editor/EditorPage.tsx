import { useEffect } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";
import { ExportPanel } from "@widgets/export-panel/ExportPanel";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";
import { TreePanel } from "@widgets/tree-panel/TreePanel";
import { IconButton } from "@shared/ui/IconButton";
import logoUrl from "@shared/assets/logo.svg";

interface EditorPageProps {
  onBackToLibrary: () => void;
}

export function EditorPage({ onBackToLibrary }: EditorPageProps) {
  const lastError = useEditorStore((s) => s.lastError);
  const project = useEditorStore((s) => s.project);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const deleteNode = useEditorStore((s) => s.deleteNode);
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
  }, [deleteNode, redo, selectedNodeId, undo]);

  return (
    <div className="app-shell">
      <div className="top-bar">
        <div className="top-bar-brand">
          <img className="top-bar-logo" src={logoUrl} alt="GuiMintLab Studio" title="GuiMintLab Studio" />
          <div className="top-bar-brand-main">
            <IconButton
              className="library-link-button"
              onClick={onBackToLibrary}
              title="Back to project library"
              aria-label="Back to project library"
            >
              ←
            </IconButton>
            <span className="top-bar-meta">
              project <strong>{project.name}</strong> · schema {project.schemaVersion}
            </span>
          </div>
        </div>
      </div>
      <div className="left-panel">
        <TreePanel />
      </div>
      <div className="center-panel">
        <CanvasWorkspace />
        {lastError ? <div className="error-banner">{lastError}</div> : null}
      </div>
      <div className="right-panel">
        <PropertiesPanel />
        <ExportPanel />
      </div>
    </div>
  );
}

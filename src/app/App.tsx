import { useEffect } from "react";

import { useEditorStore } from "../store/editorStore";
import { TreePanel } from "../features/tree/TreePanel";
import { CanvasWorkspace } from "../features/canvas/CanvasWorkspace";
import { PropertiesPanel } from "../features/properties/PropertiesPanel";
import { ExportPanel } from "../features/export/ExportPanel";
import { DISPLAY_PRESETS, presetForSize } from "../layout/displayPresets";

export function App() {
  const lastError = useEditorStore((s) => s.lastError);
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const setActiveScreen = useEditorStore((s) => s.setActiveScreen);
  const setDisplaySize = useEditorStore((s) => s.setDisplaySize);
  const loadHelloSample = useEditorStore((s) => s.loadHelloSample);
  const deleteNode = useEditorStore((s) => s.deleteNode);

  const currentPreset = presetForSize(project.display.width, project.display.height);
  const currentValue = currentPreset ? currentPreset.id : "custom";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";

      if (!isDeleteKey || !selectedNodeId) return;

      const target = event.target;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      event.preventDefault();
      deleteNode(selectedNodeId);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [deleteNode, selectedNodeId]);

  return (
    <div className="app-shell">
      <div className="top-bar">
        <h1>GuiMintLab Studio</h1>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>
          project: <strong style={{ color: "var(--fg)" }}>{project.name}</strong> · schema{" "}
          {project.schemaVersion}
        </span>
        <button onClick={loadHelloSample} title="Load the bundled hello sample">
          load hello
        </button>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "var(--muted)" }}>display</label>
          <select
            value={currentValue}
            onChange={(e) => {
              const preset = DISPLAY_PRESETS.find((p) => p.id === e.target.value);
              if (preset) setDisplaySize(preset.width, preset.height);
            }}
            style={{ width: 130 }}
          >
            {DISPLAY_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {currentValue === "custom" ? (
              <option value="custom">
                custom ({project.display.width} × {project.display.height})
              </option>
            ) : null}
          </select>
          <input
            type="number"
            value={project.display.width}
            min={1}
            onChange={(e) =>
              setDisplaySize(Number(e.target.value) || 1, project.display.height)
            }
            style={{ width: 64 }}
            title="width"
          />
          <span style={{ color: "var(--muted)" }}>×</span>
          <input
            type="number"
            value={project.display.height}
            min={1}
            onChange={(e) =>
              setDisplaySize(project.display.width, Number(e.target.value) || 1)
            }
            style={{ width: 64 }}
            title="height"
          />
          <label style={{ fontSize: 12, color: "var(--muted)", marginLeft: 10 }}>screen</label>
          <select
            value={activeScreenId}
            onChange={(e) => setActiveScreen(e.target.value)}
            style={{ width: 140 }}
          >
            {project.screens.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.id}
              </option>
            ))}
          </select>
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

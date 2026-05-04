import { useEffect } from "react";

import { useEditorStore } from "../store/editorStore";
import { TreePanel } from "../features/tree/TreePanel";
import { CanvasWorkspace } from "../features/canvas/CanvasWorkspace";
import { PropertiesPanel } from "../features/properties/PropertiesPanel";
import { ExportPanel } from "../features/export/ExportPanel";
import { DISPLAY_PRESETS, presetForSize } from "../layout/displayPresets";
import { CustomSelect } from "../components/CustomSelect";
import { DraftNumberInput } from "../components/DraftNumberInput";

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
        <div className="top-bar-brand">
          <div>
            <h1>GuiMintLab Studio</h1>
            <span className="top-bar-meta">
              project <strong>{project.name}</strong> · schema {project.schemaVersion}
            </span>
          </div>
          <button onClick={loadHelloSample} title="Load the bundled hello sample">
            load hello
          </button>
        </div>
        <div className="top-bar-controls">
          <label>display</label>
          <CustomSelect
            ariaLabel="display"
            value={currentValue}
            options={[
              ...DISPLAY_PRESETS.map((p) => ({ value: p.id, label: p.label })),
              ...(currentValue === "custom"
                ? [
                    {
                      value: "custom",
                      label: `custom (${project.display.width} × ${project.display.height})`,
                    },
                  ]
                : []),
            ]}
            onChange={(nextValue) => {
              const preset = DISPLAY_PRESETS.find((p) => p.id === nextValue);
              if (preset) setDisplaySize(preset.width, preset.height);
            }}
          />
          <div className="display-size-control">
            <DraftNumberInput
              value={project.display.width}
              min={1}
              onChange={(value) => setDisplaySize(value, project.display.height)}
              title="width"
            />
            <span>×</span>
            <DraftNumberInput
              value={project.display.height}
              min={1}
              onChange={(value) => setDisplaySize(project.display.width, value)}
              title="height"
            />
          </div>
          <label>screen</label>
          <CustomSelect
            ariaLabel="screen"
            value={activeScreenId}
            options={project.screens.map((screen) => ({
              value: screen.id,
              label: screen.name ?? screen.id,
            }))}
            onChange={setActiveScreen}
          />
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

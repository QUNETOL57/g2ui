import { useMemo, useState } from "react";

import { useEditorStore } from "../../store/editorStore";

export function ExportPanel() {
  const project = useEditorStore((s) => s.project);
  const exportJson = useEditorStore((s) => s.exportJson);
  const importJson = useEditorStore((s) => s.importJson);

  const [pasted, setPasted] = useState("");

  const output = useMemo(() => exportJson(), [exportJson, project]);

  return (
    <>
      <div className="section-title">Export IR</div>
      <div className="prop-group">
        <textarea className="export-output" value={output} readOnly />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button
            onClick={() => navigator.clipboard?.writeText(output)}
            title="Copy JSON to clipboard"
          >
            copy
          </button>
          <button
            onClick={() => {
              const blob = new Blob([output], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.id}.project.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            download
          </button>
        </div>
        <p className="hint">
          Save this file to your ESP-IDF project and embed it via
          <code>EMBED_FILES</code>. The <code>guimintlab</code> component parses
          it on-device — no C regeneration step.
        </p>
      </div>

      <div className="section-title">Import IR</div>
      <div className="prop-group">
        <textarea
          className="export-output"
          placeholder="paste project.json here"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button onClick={() => importJson(pasted)}>load</button>
        </div>
      </div>
    </>
  );
}

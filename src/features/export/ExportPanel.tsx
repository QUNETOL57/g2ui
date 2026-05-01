import { useMemo, useState } from "react";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useEditorStore } from "../../store/editorStore";

SyntaxHighlighter.registerLanguage("json", json);

export function ExportPanel() {
  const project = useEditorStore((s) => s.project);
  const exportJson = useEditorStore((s) => s.exportJson);
  const importJson = useEditorStore((s) => s.importJson);

  const [pasted, setPasted] = useState("");

  const output = useMemo(() => exportJson(), [exportJson, project]);

  return (
    <details className="sidebar-disclosure">
      <summary className="section-title">Project JSON</summary>
      <div className="prop-group">
        <h4>Export</h4>
        <div className="code-preview" aria-label="Exported project JSON">
          <SyntaxHighlighter
            language="json"
            style={oneDark}
            customStyle={{
              margin: 0,
              padding: 12,
              background: "transparent",
              fontSize: 11,
              lineHeight: 1.35,
            }}
            wrapLongLines
          >
            {output}
          </SyntaxHighlighter>
        </div>
        <div className="panel-actions">
          <button
            className="icon-button"
            onClick={() => navigator.clipboard?.writeText(output)}
            aria-label="Copy JSON to clipboard"
            title="Copy JSON to clipboard"
            data-tooltip="Copy JSON"
          >
            <ContentCopyOutlinedIcon />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              const blob = new Blob([output], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${project.id}.project.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            aria-label="Download JSON"
            title="Download JSON"
            data-tooltip="Download JSON"
          >
            <FileDownloadOutlinedIcon />
          </button>
        </div>
        <p className="hint">
          Save this file to your ESP-IDF project and embed it via
          <code>EMBED_FILES</code>. The <code>guimintlab</code> component parses
          it on-device — no C regeneration step.
        </p>
      </div>

      <div className="prop-group">
        <h4>Import</h4>
        <textarea
          className="export-output"
          placeholder="paste project.json here"
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
        />
        <div className="panel-actions">
          <button
            className="icon-button"
            onClick={() => importJson(pasted)}
            aria-label="Load JSON"
            title="Load JSON"
            data-tooltip="Load JSON"
          >
            <FileUploadOutlinedIcon />
          </button>
        </div>
      </div>
    </details>
  );
}

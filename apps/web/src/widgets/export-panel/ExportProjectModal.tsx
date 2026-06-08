import { memo, useMemo } from "react";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { useEditorStore } from "@entities/ui-project/model/store";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";

import styles from "./ExportPanel.module.css";

SyntaxHighlighter.registerLanguage("json", json);

interface ExportProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const ExportProjectModal = memo(function ExportProjectModal({
  open,
  onClose,
}: ExportProjectModalProps) {
  const project = useEditorStore((s) => s.project);
  const exportJson = useEditorStore((s) => s.exportJson);
  const output = useMemo(() => (open ? exportJson() : ""), [exportJson, open, project]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      className={styles.exportDialog}
      closeOnBackdrop={false}
    >
      <IconButton
        className={styles.modalClose}
        aria-label="Close export dialog"
        title="Close"
        onClick={onClose}
      >
        <CloseRoundedIcon />
      </IconButton>

      <div className={styles.modalPanel}>
        <div className={styles.modalTitle}>
          <div className={styles.kicker}>Export</div>
          <p>Copy or download the project JSON for embedding in your ESP-IDF firmware.</p>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.group}>
            <div className={styles.codePreview} aria-label="Exported project JSON">
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
            <div className={styles.actions}>
              <IconButton
                onClick={() => navigator.clipboard?.writeText(output)}
                aria-label="Copy JSON to clipboard"
                title="Copy JSON to clipboard"
                tooltip="Copy JSON"
              >
                <ContentCopyOutlinedIcon />
              </IconButton>
              <IconButton
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
                tooltip="Download JSON"
              >
                <FileDownloadOutlinedIcon />
              </IconButton>
            </div>
            <p className={styles.hint}>
              Save this file to your ESP-IDF project and embed it via
              <code>EMBED_FILES</code>. The <code>guimintlab</code> component parses it on-device — no C
              regeneration step.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
});

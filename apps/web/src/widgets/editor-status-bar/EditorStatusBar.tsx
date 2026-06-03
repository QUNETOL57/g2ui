import { memo, useState } from "react";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";

import { ExportProjectModal } from "@widgets/export-panel/ExportProjectModal";
import { ImportProjectModal } from "@widgets/export-panel/ImportProjectModal";

import {
  autosaveStatusPresentation,
  type AutosaveStatus,
} from "./lib/autosave-status";
import styles from "./EditorStatusBar.module.css";

interface EditorStatusBarProps {
  autosaveStatus?: AutosaveStatus;
  autosaveError?: string | null;
}

export const EditorStatusBar = memo(function EditorStatusBar({
  autosaveStatus = "local",
  autosaveError = null,
}: EditorStatusBarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const { label, Icon } = autosaveStatusPresentation(autosaveStatus, autosaveError);

  return (
    <>
      <footer className={styles.statusBar}>
        <div
          className={styles.statusItem}
          data-status={autosaveStatus}
          title={label}
          aria-live="polite"
        >
          <Icon fontSize="small" aria-hidden />
          <span>{label}</span>
        </div>
        <div className={styles.statusActions}>
          <button
            type="button"
            className={styles.statusButton}
            onClick={() => setExportOpen(true)}
          >
            <FileDownloadOutlinedIcon fontSize="small" aria-hidden />
            Export
          </button>
          <button
            type="button"
            className={styles.statusButton}
            onClick={() => setImportOpen(true)}
          >
            <FileUploadOutlinedIcon fontSize="small" aria-hidden />
            Import
          </button>
        </div>
      </footer>

      <ExportProjectModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportProjectModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
});

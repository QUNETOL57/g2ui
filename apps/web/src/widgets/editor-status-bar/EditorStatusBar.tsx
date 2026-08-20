import { memo, useState, type MouseEvent } from "react";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import PaletteOutlinedIcon from "@mui/icons-material/PaletteOutlined";

import { ChangeHistorySheet } from "@widgets/change-history/ChangeHistorySheet";
import { ExportProjectModal } from "@widgets/export-panel/ExportProjectModal";
import { ImportProjectModal } from "@widgets/export-panel/ImportProjectModal";
import { PaletteModal } from "@widgets/palette-panel/PaletteModal";

import {
  autosaveStatusPresentation,
  type AutosaveStatus,
} from "./lib/autosave-status";
import styles from "./EditorStatusBar.module.css";

interface EditorStatusBarProps {
  autosaveStatus?: AutosaveStatus;
  autosaveError?: string | null;
  userEmail?: string | null;
  canvasId?: string;
  canLoadRemote?: boolean;
}

export const EditorStatusBar = memo(function EditorStatusBar({
  autosaveStatus = "local",
  autosaveError = null,
  userEmail = null,
  canvasId,
  canLoadRemote = false,
}: EditorStatusBarProps) {
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { label, Icon } = autosaveStatusPresentation(autosaveStatus, autosaveError);

  const preventMouseFocus = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.button === 0) event.preventDefault();
  };

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
          {canvasId ? (
            <button
              type="button"
              className={styles.statusButton}
              aria-label="Change history"
              title="Change history"
              onMouseDown={preventMouseFocus}
              onClick={() => setHistoryOpen(true)}
            >
              <HistoryOutlinedIcon fontSize="small" aria-hidden />
              History
            </button>
          ) : null}
          <button
            type="button"
            className={styles.statusButton}
            onMouseDown={preventMouseFocus}
            onClick={() => setPaletteOpen(true)}
          >
            <PaletteOutlinedIcon fontSize="small" aria-hidden />
            Palette
          </button>
          <button
            type="button"
            className={styles.statusButton}
            onMouseDown={preventMouseFocus}
            onClick={() => setExportOpen(true)}
          >
            <FileDownloadOutlinedIcon fontSize="small" aria-hidden />
            Export
          </button>
          <button
            type="button"
            className={styles.statusButton}
            onMouseDown={preventMouseFocus}
            onClick={() => setImportOpen(true)}
          >
            <FileUploadOutlinedIcon fontSize="small" aria-hidden />
            Import
          </button>
          <div className={styles.statusUser} title={userEmail ?? "Guest"}>
            <PersonOutlineOutlinedIcon fontSize="small" aria-hidden />
            <span>{userEmail ?? "Guest"}</span>
          </div>
        </div>
      </footer>

      <PaletteModal open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ExportProjectModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportProjectModal open={importOpen} onClose={() => setImportOpen(false)} />
      {canvasId ? (
        <ChangeHistorySheet
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          projectId={canvasId}
          canvasId={canvasId}
          canLoadRemote={canLoadRemote}
        />
      ) : null}
    </>
  );
});

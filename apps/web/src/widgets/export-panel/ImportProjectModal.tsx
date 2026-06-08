import { memo, useState } from "react";
import FileUploadOutlinedIcon from "@mui/icons-material/FileUploadOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { useEditorStore } from "@entities/ui-project/model/store";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";

import styles from "./ExportPanel.module.css";

interface ImportProjectModalProps {
  open: boolean;
  onClose: () => void;
}

export const ImportProjectModal = memo(function ImportProjectModal({
  open,
  onClose,
}: ImportProjectModalProps) {
  const importJson = useEditorStore((s) => s.importJson);
  const [pasted, setPasted] = useState("");

  const handleClose = () => {
    setPasted("");
    onClose();
  };

  const handleLoad = () => {
    importJson(pasted);
    handleClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      size="md"
      className={styles.importDialog}
      closeOnBackdrop={false}
    >
      <IconButton
        className={styles.modalClose}
        aria-label="Close import dialog"
        title="Close"
        onClick={handleClose}
      >
        <CloseRoundedIcon />
      </IconButton>

      <div className={styles.modalPanel}>
        <div className={styles.modalTitle}>
          <div className={styles.kicker}>Import</div>
          <p>Paste a project JSON file to replace the current editor state.</p>
        </div>

        <div className={styles.modalContent}>
          <div className={styles.group}>
            <textarea
              className={styles.importInput}
              placeholder="paste project.json here"
              value={pasted}
              onChange={(event) => setPasted(event.target.value)}
            />
            <div className={styles.actions}>
              <IconButton
                onClick={handleLoad}
                aria-label="Load JSON"
                title="Load JSON"
                tooltip="Load JSON"
              >
                <FileUploadOutlinedIcon />
              </IconButton>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
});

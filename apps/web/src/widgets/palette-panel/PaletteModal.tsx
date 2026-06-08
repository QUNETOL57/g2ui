import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

import type { PaletteEntry } from "@entities/ui-project";
import { createPaletteEntry, normalizeHex, normalizePalette } from "@entities/ui-project/lib/palette";
import { useEditorStore } from "@entities/ui-project/model/store";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";

import styles from "./PalettePanel.module.css";

interface PaletteModalProps {
  open: boolean;
  onClose: () => void;
}

export const PaletteModal = memo(function PaletteModal({ open, onClose }: PaletteModalProps) {
  const palette = useEditorStore((s) => s.project.palette ?? []);
  const setPalette = useEditorStore((s) => s.setPalette);
  const [draft, setDraft] = useState<PaletteEntry[]>(palette);

  useEffect(() => {
    if (open) setDraft(palette);
  }, [open, palette]);

  const commit = useCallback(
    (next: PaletteEntry[]) => {
      const result = normalizePalette(next);
      if (!result.ok) return;
      setDraft(result.entries);
      setPalette(result.entries);
    },
    [setPalette],
  );

  const sortedPreview = useMemo(
    () => [...draft].sort((a, b) => a.token.localeCompare(b.token)),
    [draft],
  );

  const updateDraft = (index: number, patch: Partial<PaletteEntry>) => {
    setDraft((current) => current.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)));
  };

  const commitEntry = (index: number, patch?: Partial<PaletteEntry>) => {
    const next = draft.map((entry, i) =>
      i === index ? { ...entry, ...patch, token: (patch?.token ?? entry.token).trim() } : entry,
    );
    const entry = next[index];
    const hex = normalizeHex(patch?.hex ?? entry.hex);
    if (!hex) return;
    next[index] = { ...entry, hex };
    commit(next);
  };

  const removeEntry = (index: number) => {
    commit(draft.filter((_, i) => i !== index));
  };

  const addEntry = () => {
    commit([...draft, createPaletteEntry(draft)]);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      className={styles.paletteDialog}
      closeOnBackdrop={false}
    >
      <IconButton
        className={styles.modalClose}
        aria-label="Close palette dialog"
        title="Close"
        onClick={onClose}
      >
        <CloseRoundedIcon />
      </IconButton>

      <div className={styles.modalPanel}>
        <div className={styles.modalTitle}>
          <div className={styles.kicker}>Project palette</div>
          <p>Manage named color tokens used across widgets, screens and exports.</p>
        </div>

        <div className={styles.modalContent}>
          {draft.length === 0 ? (
            <div className={styles.emptyState}>No palette tokens yet. Add your first color.</div>
          ) : (
            <>
              <div className={styles.entryHeader}>
                <span>Color</span>
                <span>Token</span>
                <span>Hex</span>
                <span aria-hidden />
              </div>
              <div className={styles.entryList}>
                {draft.map((entry, index) => (
                  <div key={`${entry.token}-${index}`} className={styles.entryRow}>
                    <input
                      type="color"
                      className={styles.swatchInput}
                      value={normalizeHex(entry.hex) ?? "#FFFFFF"}
                      aria-label={`Color swatch for ${entry.token}`}
                      onChange={(event) => {
                        const hex = normalizeHex(event.target.value);
                        if (!hex) return;
                        const next = draft.map((item, i) => (i === index ? { ...item, hex } : item));
                        commit(next);
                      }}
                    />
                    <input
                      type="text"
                      className={styles.tokenInput}
                      value={entry.token}
                      aria-label={`Token name for ${entry.token}`}
                      onChange={(event) => updateDraft(index, { token: event.target.value })}
                      onBlur={(event) => commitEntry(index, { token: event.currentTarget.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                    <input
                      type="text"
                      className={styles.hexInput}
                      value={entry.hex}
                      aria-label={`Hex value for ${entry.token}`}
                      onChange={(event) => updateDraft(index, { hex: event.target.value })}
                      onBlur={(event) => commitEntry(index, { hex: event.currentTarget.value })}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") event.currentTarget.blur();
                      }}
                    />
                    <IconButton
                      aria-label={`Delete ${entry.token}`}
                      title={`Delete ${entry.token}`}
                      onClick={() => removeEntry(index)}
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.addButton} onClick={addEntry}>
              <AddOutlinedIcon fontSize="small" aria-hidden />
              Add color
            </button>
            <p className={styles.hint}>
              {sortedPreview.length} token{sortedPreview.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
});

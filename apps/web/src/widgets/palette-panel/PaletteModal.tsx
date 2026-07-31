import { memo, useCallback, useEffect, useMemo, useState } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";

import type { ColorRef, PaletteEntry } from "@entities/ui-project";
import { createPaletteEntry, normalizeHex, normalizePalette } from "@entities/ui-project/lib/palette";
import { useEditorStore } from "@entities/ui-project/model/store";
import { Button } from "@shared/ui/Button";
import { HexColorPicker } from "@shared/ui/HexColorPicker";
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
  const [pendingDelete, setPendingDelete] = useState<{
    index: number;
    token: string;
    hex: string;
  } | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(palette);
      setPendingDelete(null);
    }
  }, [open, palette]);

  const commit = useCallback(
    (next: PaletteEntry[], remaps?: Array<{ from: string; to: ColorRef }>) => {
      const result = normalizePalette(next);
      if (!result.ok) return false;
      setDraft(result.entries);
      setPalette(result.entries, remaps?.length ? { remaps } : undefined);
      return true;
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
    const previousToken = palette[index]?.token ?? draft[index]?.token;
    const next = draft.map((entry, i) =>
      i === index ? { ...entry, ...patch, token: (patch?.token ?? entry.token).trim() } : entry,
    );
    const entry = next[index];
    const hex = normalizeHex(patch?.hex ?? entry.hex);
    if (!hex) return;
    next[index] = { ...entry, hex };

    const remaps: Array<{ from: string; to: ColorRef }> = [];
    if (previousToken && entry.token !== previousToken) {
      remaps.push({ from: previousToken, to: { kind: "token", token: entry.token } });
    }
    commit(next, remaps);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { index, token, hex } = pendingDelete;
    const resolvedHex = normalizeHex(hex) ?? normalizeHex(draft[index]?.hex) ?? "#FFFFFF";
    const next = draft.filter((_, i) => i !== index);
    if (commit(next, [{ from: token, to: { kind: "hex", value: resolvedHex } }])) {
      setPendingDelete(null);
    }
  };

  const dismissOrClose = () => {
    if (pendingDelete) {
      setPendingDelete(null);
      return;
    }
    onClose();
  };

  const addEntry = () => {
    commit([...draft, createPaletteEntry(draft)]);
  };

  return (
    <Modal
      open={open}
      onClose={dismissOrClose}
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
          {pendingDelete ? (
            <div className={styles.deleteConfirm} role="alertdialog" aria-labelledby="delete-token-title">
              <h2 id="delete-token-title">Delete token?</h2>
              <p>
                Remove <strong>{pendingDelete.token}</strong> from the palette. Widgets and screens
                that used this token keep color {pendingDelete.hex} as a plain hex value.
              </p>
              <div className={styles.deleteActions}>
                <Button type="button" size="sm" onClick={() => setPendingDelete(null)}>
                  Cancel
                </Button>
                <Button type="button" size="sm" variant="danger" onClick={confirmDelete}>
                  Delete
                </Button>
              </div>
            </div>
          ) : draft.length === 0 ? (
            <div className={styles.emptyState}>No palette tokens yet. Add your first color.</div>
          ) : (
            <>
              <div className={styles.entryHeader}>
                <span aria-hidden />
                <span>Name</span>
                <span>Hex</span>
                <span aria-hidden />
              </div>
              <div className={styles.entryList}>
                {draft.map((entry, index) => (
                  <div key={index} className={styles.entryRow}>
                    <HexColorPicker
                      className={styles.swatchPicker}
                      align="start"
                      value={normalizeHex(entry.hex) ?? "#FFFFFF"}
                      ariaLabel={`Color swatch for ${entry.token}`}
                      onChange={(hex) => {
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
                      className={styles.iconButtonDanger}
                      aria-label={`Delete ${entry.token}`}
                      title={`Delete ${entry.token}`}
                      onClick={() =>
                        setPendingDelete({
                          index,
                          token: entry.token,
                          hex: normalizeHex(entry.hex) ?? entry.hex,
                        })
                      }
                    >
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </div>
                ))}
              </div>
            </>
          )}

          {!pendingDelete ? (
            <div className={styles.actions}>
              <button type="button" className={styles.addButton} onClick={addEntry}>
                <AddOutlinedIcon fontSize="small" aria-hidden />
                Add color
              </button>
              <p className={styles.hint}>
                {sortedPreview.length} token{sortedPreview.length === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
});

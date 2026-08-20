import { memo, useCallback, useEffect, useMemo, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import {
  cloneProject,
  getChangeHistoryStore,
  mergeChangeLogEntries,
  validateProject,
  type ChangeHistoryStore,
  type ChangeLogEntry,
  type UiProject,
} from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import {
  getCanvasRevision,
  listCanvasRevisions,
  revisionListItemToEntry,
} from "@shared/api/canvasRevisions";
import { ApiError } from "@shared/api/client";
import { Button } from "@shared/ui/Button";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";
import { ProjectPreview } from "@widgets/project-preview/ProjectPreview";

import { formatEntryTime, groupEntriesByDate } from "./lib/groupEntriesByDate";
import styles from "./ChangeHistorySheet.module.css";

interface ChangeHistorySheetProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  canvasId: string;
  canLoadRemote?: boolean;
  store?: ChangeHistoryStore;
}

export const ChangeHistorySheet = memo(function ChangeHistorySheet({
  open,
  onClose,
  projectId,
  canvasId,
  canLoadRemote = false,
  store,
}: ChangeHistorySheetProps) {
  const historyStore = store ?? getChangeHistoryStore();
  const setProject = useEditorStore((state) => state.setProject);
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isRemoteLoading, setIsRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );
  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);

  const loadEntries = useCallback(async () => {
    const localEntries = await historyStore.list(projectId);
    let remoteEntries: ChangeLogEntry[] = [];
    if (canLoadRemote) {
      setIsRemoteLoading(true);
      try {
        const items = await listCanvasRevisions(canvasId);
        remoteEntries = items.map((item) => revisionListItemToEntry(item, projectId));
        setRemoteError(null);
      } catch (error) {
        const message = error instanceof ApiError ? error.message : "Failed to load cloud history";
        console.warn("[change-history]", "list failed", { canvasId });
        setRemoteError(message);
      } finally {
        setIsRemoteLoading(false);
      }
    }
    const merged = mergeChangeLogEntries(localEntries, remoteEntries);
    setEntries(merged);
    setSelectedId((current) => {
      if (current && merged.some((entry) => entry.id === current)) return current;
      return merged[0]?.id ?? null;
    });
  }, [canLoadRemote, canvasId, historyStore, projectId]);

  useEffect(() => {
    if (!open) {
      setIsConfirming(false);
      setPreviewError(null);
      return;
    }
    void loadEntries();
  }, [loadEntries, open]);

  useEffect(() => {
    if (!open || !selected || selected.project || selected.source !== "remote") return;
    let cancelled = false;
    void getCanvasRevision(canvasId, selected.id)
      .then((record) => {
        if (cancelled) return;
        const validation = validateProject(record.content);
        if (!validation.ok) {
          console.warn("[change-history]", "restore rejected", {
            id: selected.id,
            issues: validation.issues,
          });
          setPreviewError("This version is not a valid project.");
          return;
        }
        setPreviewError(null);
        setEntries((current) =>
          current.map((entry) =>
            entry.id === selected.id
              ? { ...entry, project: cloneProject(record.content as UiProject) }
              : entry,
          ),
        );
      })
      .catch(() => {
        if (cancelled) return;
        console.warn("[change-history]", "get failed", { id: selected.id });
        setPreviewError("Could not load this version.");
      });
    return () => {
      cancelled = true;
    };
  }, [canvasId, open, selected]);

  const handleRestore = () => {
    if (!selected?.project) return;
    const validation = validateProject(selected.project);
    if (!validation.ok) {
      console.warn("[change-history]", "restore rejected", {
        id: selected.id,
        issues: validation.issues,
      });
      setPreviewError("This version is not a valid project.");
      return;
    }
    setProject(cloneProject(selected.project));
    setIsConfirming(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      placement="bottom"
      className={styles.sheet}
      closeOnBackdrop
    >
      <header className={styles.header}>
        <div>
          <div className={styles.kicker}>Local History</div>
          <h2 className={styles.title}>Change history</h2>
        </div>
        <IconButton aria-label="Close change history" title="Close" onClick={onClose}>
          <CloseRoundedIcon />
        </IconButton>
      </header>

      <div className={styles.body}>
        <aside className={styles.timeline} aria-label="Change history timeline">
          {groups.length === 0 ? (
            <p className={styles.empty}>
              No local history yet. Changes will appear here after you edit the project.
            </p>
          ) : (
            groups.map((group) => (
              <section key={group.label} className={styles.group}>
                <h3 className={styles.groupLabel}>{group.label}</h3>
                <ul className={styles.entryList}>
                  {group.entries.map((entry) => (
                    <li key={entry.id}>
                      <button
                        type="button"
                        className={styles.entryButton}
                        data-selected={entry.id === selectedId ? "true" : "false"}
                        onClick={() => {
                          setSelectedId(entry.id);
                          setIsConfirming(false);
                          setPreviewError(null);
                        }}
                      >
                        <span>{formatEntryTime(entry.createdAt)}</span>
                        <span className={styles.badge} data-source={entry.source}>
                          {entry.source === "remote" ? "cloud" : "local"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          {isRemoteLoading ? <p className={styles.status}>Loading cloud versions…</p> : null}
          {remoteError ? <p className={styles.statusError}>{remoteError}</p> : null}
        </aside>

        <section className={styles.previewPane}>
          {selected?.project ? (
            <>
              <ProjectPreview project={selected.project} size="sidebar" showSizeLabels={false} />
              {previewError ? <p className={styles.statusError}>{previewError}</p> : null}
              {isConfirming ? (
                <div className={styles.confirm}>
                  <p>Restore this version? The current editor state stays in undo history.</p>
                  <div className={styles.confirmActions}>
                    <Button type="button" size="sm" onClick={() => setIsConfirming(false)}>
                      Cancel
                    </Button>
                    <Button type="button" size="sm" variant="primary" onClick={handleRestore}>
                      Restore
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  disabled={!selected.project}
                  onClick={() => setIsConfirming(true)}
                >
                  Restore this version
                </Button>
              )}
            </>
          ) : (
            <p className={styles.empty}>
              {selected ? "Loading preview…" : "Select a version to preview it."}
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
});

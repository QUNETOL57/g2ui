import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import {
  cloneProject,
  getChangeHistoryStore,
  mergeChangeLogEntries,
  recordLocalProjectChange,
  type ChangeHistoryStore,
  type ChangeLogEntry,
} from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { normalizeHistoryProject } from "@shared/api/canvases";
import {
  getCanvasRevision,
  listCanvasRevisions,
  revisionListItemToEntry,
} from "@shared/api/canvasRevisions";
import { ApiError } from "@shared/api/client";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/Button";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";
import { ProjectPreview } from "@widgets/project-preview/ProjectPreview";
import { ScreenThumbnail } from "@widgets/screens-panel/ScreenThumbnail";

import { formatEntryTime, groupEntriesByDate } from "./lib/groupEntriesByDate";
import styles from "./ChangeHistorySheet.module.css";

const MIN_TIMELINE_WIDTH = 200;
const DEFAULT_TIMELINE_WIDTH = 248;
const MIN_SCREENS_WIDTH = 148;
const DEFAULT_SCREENS_WIDTH = 176;
const MIN_PREVIEW_WIDTH = 240;
const SPLITTER_WIDTH = 1;

type HistoryPane = "timeline" | "screens";

function clamp(value: number, min: number, max: number): number {
  if (max <= min) return min;
  return Math.min(max, Math.max(min, value));
}

function HistorySplitter({
  label,
  testId,
  isActive,
  onMouseDown,
}: {
  label: string;
  testId: string;
  isActive: boolean;
  onMouseDown: (event: ReactMouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      className={cn(styles.resizeHandle, isActive && styles.resizeHandleActive)}
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      data-testid={testId}
      onMouseDown={onMouseDown}
    />
  );
}

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
  const [previewScreenId, setPreviewScreenId] = useState<string | null>(null);
  const [timelineWidth, setTimelineWidth] = useState(DEFAULT_TIMELINE_WIDTH);
  const [screensWidth, setScreensWidth] = useState(DEFAULT_SCREENS_WIDTH);
  const [resizing, setResizing] = useState<HistoryPane | null>(null);
  const [previewFit, setPreviewFit] = useState<{ width: number; height: number } | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const timelineWidthRef = useRef(timelineWidth);
  const screensWidthRef = useRef(screensWidth);
  timelineWidthRef.current = timelineWidth;
  screensWidthRef.current = screensWidth;

  const selected = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );
  const groups = useMemo(() => groupEntriesByDate(entries), [entries]);
  const previewProject = selected?.project ?? null;
  const activePreviewScreenId =
    previewScreenId && previewProject?.screens.some((screen) => screen.id === previewScreenId)
      ? previewScreenId
      : (previewProject?.initialScreenId &&
          previewProject.screens.some((screen) => screen.id === previewProject.initialScreenId)
          ? previewProject.initialScreenId
          : previewProject?.screens[0]?.id ?? null);

  useEffect(() => {
    if (!open) {
      setPreviewScreenId(null);
      return;
    }
    if (!previewProject) return;
    setPreviewScreenId((current) => {
      if (current && previewProject.screens.some((screen) => screen.id === current)) return current;
      return previewProject.initialScreenId &&
        previewProject.screens.some((screen) => screen.id === previewProject.initialScreenId)
        ? previewProject.initialScreenId
        : (previewProject.screens[0]?.id ?? null);
    });
  }, [open, previewProject]);

  const loadEntries = useCallback(async () => {
    let localEntries = await historyStore.list(projectId);
    if (localEntries.length === 0) {
      await recordLocalProjectChange(projectId, useEditorStore.getState().project, historyStore);
      localEntries = await historyStore.list(projectId);
    }
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
        const project = normalizeHistoryProject(record.content, canvasId);
        if (!project) {
          console.warn("[change-history]", "restore rejected", { id: selected.id });
          setPreviewError("This version is not a valid project.");
          return;
        }
        setPreviewError(null);
        setEntries((current) =>
          current.map((entry) =>
            entry.id === selected.id ? { ...entry, project: cloneProject(project) } : entry,
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

  const startResize = useCallback((pane: HistoryPane) => {
    return (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setResizing(pane);
    };
  }, []);

  useEffect(() => {
    if (!resizing) return;

    const handleMove = (event: MouseEvent) => {
      const container = contentRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const hasScreens = Boolean(previewProject);
      const splitters = hasScreens ? SPLITTER_WIDTH * 2 : SPLITTER_WIDTH;
      const reserved = MIN_PREVIEW_WIDTH + splitters;
      const currentTimeline = timelineWidthRef.current;
      const currentScreens = screensWidthRef.current;

      if (resizing === "timeline") {
        const max = rect.width - reserved - (hasScreens ? currentScreens : 0);
        setTimelineWidth(clamp(event.clientX - rect.left, MIN_TIMELINE_WIDTH, max));
        return;
      }

      const start = currentTimeline + SPLITTER_WIDTH;
      const max = rect.width - currentTimeline - reserved;
      setScreensWidth(clamp(event.clientX - rect.left - start, MIN_SCREENS_WIDTH, max));
    };

    const handleUp = () => setResizing(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [previewProject, resizing]);

  useEffect(() => {
    const el = previewStageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width < 40 || box.height < 40) {
        setPreviewFit(null);
        return;
      }
      setPreviewFit({
        width: Math.max(1, Math.floor(box.width - 24)),
        height: Math.max(1, Math.floor(box.height - 24)),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [previewProject]);

  const handleRestore = () => {
    if (!selected?.project) return;
    const project = normalizeHistoryProject(selected.project, canvasId);
    if (!project) {
      console.warn("[change-history]", "restore rejected", { id: selected.id });
      setPreviewError("This version is not a valid project.");
      return;
    }
    setProject(cloneProject(project));
    setIsConfirming(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      className={styles.historyDialog}
      closeOnBackdrop
    >
      <IconButton
        className={styles.modalClose}
        aria-label="Close change history"
        title="Close"
        onClick={onClose}
      >
        <CloseRoundedIcon />
      </IconButton>

      <div className={styles.modalPanel}>
        <div className={styles.modalTitle}>
          <div className={styles.kicker}>Change history</div>
          <p>Preview a previous version and restore it into the editor.</p>
        </div>

        <div
          className={styles.modalContent}
          ref={contentRef}
          data-testid="history-modal-content"
          data-resizing={resizing ? "true" : undefined}
        >
          <div
            className={styles.timelineColumn}
            style={{ flex: `0 0 ${timelineWidth}px` }}
            data-testid="history-timeline-column"
          >
            <h3 className={styles.paneLabel}>History</h3>
            <aside className={styles.timeline} aria-label="Change history timeline">
              {groups.length === 0 ? (
                <p className={styles.empty}>
                  No local history yet. Changes will appear here after you edit the project.
                </p>
              ) : (
                groups.map((group) => (
                  <section key={group.label} className={styles.group}>
                    <p className={styles.groupLabel}>{group.label}</p>
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
          </div>

          <HistorySplitter
            label="Resize history timeline"
            testId="history-timeline-resize-handle"
            isActive={resizing === "timeline"}
            onMouseDown={startResize("timeline")}
          />

          {previewProject ? (
            <>
              <div
                className={styles.screenColumn}
                style={{ flex: `0 0 ${screensWidth}px` }}
                data-testid="history-screens-column"
              >
                <h3 className={styles.paneLabel}>Screens</h3>
                <aside className={styles.screenList} aria-label="Screens">
                  {previewProject.screens.map((screen) => {
                    const isActive = screen.id === activePreviewScreenId;
                    return (
                      <button
                        key={screen.id}
                        type="button"
                        className={styles.screenButton}
                        data-selected={isActive ? "true" : "false"}
                        data-testid="history-screen-card"
                        aria-current={isActive ? "true" : undefined}
                        aria-label={screen.name?.trim() || screen.id}
                        onClick={() => setPreviewScreenId(screen.id)}
                      >
                        <span className={styles.screenThumb} aria-hidden>
                          <ScreenThumbnail project={previewProject} screenId={screen.id} />
                        </span>
                        <span className={styles.screenMeta}>
                          <span className={styles.screenName}>{screen.name?.trim() || screen.id}</span>
                          <span className={styles.screenId}>{screen.id}</span>
                        </span>
                      </button>
                    );
                  })}
                </aside>
              </div>

              <HistorySplitter
                label="Resize screens list"
                testId="history-screens-resize-handle"
                isActive={resizing === "screens"}
                onMouseDown={startResize("screens")}
              />

              <div className={styles.previewColumn}>
                <h3 className={styles.paneLabel}>Preview</h3>
                <div
                  ref={previewStageRef}
                  className={styles.previewStage}
                  data-testid="history-preview-stage"
                  data-screen-id={activePreviewScreenId ?? undefined}
                  aria-label="Preview"
                >
                  {activePreviewScreenId ? (
                    <ProjectPreview
                      project={previewProject}
                      screenId={activePreviewScreenId}
                      size="sidebar"
                      showSizeLabels={false}
                      maxWidth={previewFit?.width}
                      maxHeight={previewFit?.height}
                    />
                  ) : (
                    <p className={styles.empty}>This version has no screens.</p>
                  )}
                </div>
                {previewError ? <p className={styles.statusError}>{previewError}</p> : null}
                <div className={styles.restoreBar}>
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
                      className={styles.restoreButton}
                      disabled={!previewProject}
                      onClick={() => setIsConfirming(true)}
                    >
                      Restore this version
                    </Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className={styles.previewColumn}>
              {previewError ? <p className={styles.statusError}>{previewError}</p> : null}
              <p className={styles.empty}>
                {selected ? "Loading preview…" : "Select a version to preview it."}
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
});

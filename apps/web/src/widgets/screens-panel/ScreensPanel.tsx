import { useRef, useState } from "react";
import type { DragEvent } from "react";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import ControlPointDuplicateOutlinedIcon from "@mui/icons-material/ControlPointDuplicateOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";

import { useEditorStore } from "@entities/ui-project/model/store";
import { cn } from "@shared/lib/cn";
import { IconButton } from "@shared/ui/IconButton";
import { SectionTitle } from "@shared/ui/SectionTitle";

import { ScreenPreview } from "./ScreenPreview";
import styles from "./ScreensPanel.module.css";

type DropPosition = "before" | "after";

interface ScreensPanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ScreensPanel({ collapsed = false, onToggleCollapse }: ScreensPanelProps) {
  const project = useEditorStore((s) => s.project);
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const setActiveScreen = useEditorStore((s) => s.setActiveScreen);
  const addScreen = useEditorStore((s) => s.addScreen);
  const duplicateScreen = useEditorStore((s) => s.duplicateScreen);
  const removeScreen = useEditorStore((s) => s.removeScreen);
  const moveScreen = useEditorStore((s) => s.moveScreen);

  const [draggedScreenId, setDraggedScreenId] = useState<string | null>(null);
  const draggedScreenIdRef = useRef<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ screenId: string; position: DropPosition } | null>(
    null,
  );
  const dropTargetRef = useRef<{ screenId: string; position: DropPosition } | null>(null);

  const canDelete = project.screens.length > 1;

  const handleDrop = (sourceId: string, targetId: string, position: DropPosition) => {
    setDraggedScreenId(null);
    draggedScreenIdRef.current = null;
    setDropTarget(null);
    dropTargetRef.current = null;
    if (!sourceId || sourceId === targetId) return;

    const targetIndex = project.screens.findIndex((s) => s.id === targetId);
    if (targetIndex < 0) return;
    const toIndex = position === "before" ? targetIndex : targetIndex + 1;
    const sourceIndex = project.screens.findIndex((s) => s.id === sourceId);
    const adjustedIndex = sourceIndex < toIndex ? toIndex - 1 : toIndex;
    moveScreen(sourceId, adjustedIndex);
  };

  const collapseAction = onToggleCollapse ? (
    <IconButton
      className={styles.collapseButton}
      onClick={onToggleCollapse}
      aria-label={collapsed ? "Expand screens panel" : "Collapse screens panel"}
      title={collapsed ? "Expand screens" : "Collapse screens"}
      data-testid="screens-panel-collapse"
    >
      {collapsed ? <ExpandLessOutlinedIcon fontSize="inherit" /> : <ExpandMoreOutlinedIcon fontSize="inherit" />}
    </IconButton>
  ) : null;

  return (
    <div className={styles.panel} data-testid="screens-panel">
      <SectionTitle actions={collapseAction}>Screens</SectionTitle>
      {!collapsed ? (
        <div className={styles.list} data-testid="screens-panel-list">
          {project.screens.length === 0 ? (
            <div className={styles.empty}>No screens</div>
          ) : null}
          {project.screens.map((screen) => {
              const isActive = screen.id === activeScreenId;
              const dragClass =
                dropTarget?.screenId === screen.id
                  ? dropTarget.position === "before"
                    ? styles.cardDragOverBefore
                    : styles.cardDragOverAfter
                  : undefined;
              return (
                <article
                  key={screen.id}
                  className={cn(
                    styles.card,
                    isActive && styles.cardActive,
                    draggedScreenId === screen.id && styles.cardDragging,
                    dragClass,
                  )}
                  data-testid="screen-card"
                  data-screen-id={screen.id}
                  aria-current={isActive ? "true" : undefined}
                  draggable
                  onClick={() => setActiveScreen(screen.id)}
                  onDragStart={(event: DragEvent<HTMLElement>) => {
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", screen.id);
                    draggedScreenIdRef.current = screen.id;
                    setDraggedScreenId(screen.id);
                  }}
                  onDragEnd={() => {
                    setDraggedScreenId(null);
                    draggedScreenIdRef.current = null;
                    setDropTarget(null);
                    dropTargetRef.current = null;
                  }}
                  onDragOver={(event: DragEvent<HTMLElement>) => {
                    const activeDragId = draggedScreenIdRef.current;
                    if (!activeDragId || activeDragId === screen.id) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    const rect = event.currentTarget.getBoundingClientRect();
                    const position: DropPosition =
                      event.clientY - rect.top < rect.height / 2 ? "before" : "after";
                    const nextTarget = { screenId: screen.id, position };
                    dropTargetRef.current = nextTarget;
                    setDropTarget(nextTarget);
                  }}
                  onDrop={(event: DragEvent<HTMLElement>) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const sourceId = event.dataTransfer.getData("text/plain");
                    if (!sourceId || sourceId === screen.id) return;
                    const cached = dropTargetRef.current;
                    const position: DropPosition =
                      cached?.screenId === screen.id
                        ? cached.position
                        : event.clientY - event.currentTarget.getBoundingClientRect().top <
                            event.currentTarget.getBoundingClientRect().height / 2
                          ? "before"
                          : "after";
                    handleDrop(sourceId, screen.id, position);
                  }}
                >
                  <div className={styles.cardPreview} data-testid="screen-card-preview">
                    <ScreenPreview project={project} screenId={screen.id} />
                  </div>
                  <div className={styles.cardTitles}>
                    <span className={styles.cardName}>{screen.name ?? screen.id}</span>
                    <span className={styles.cardId}>{screen.id}</span>
                  </div>
                  <div className={styles.cardActions}>
                    <IconButton
                      className={styles.cardActionButton}
                      aria-label={`Duplicate ${screen.name ?? screen.id}`}
                      title={`Duplicate ${screen.name ?? screen.id}`}
                      tooltip="Duplicate"
                      data-testid="screen-card-duplicate"
                      onClick={(event) => {
                        event.stopPropagation();
                        duplicateScreen(screen.id);
                      }}
                    >
                      <ControlPointDuplicateOutlinedIcon fontSize="inherit" />
                    </IconButton>
                    <IconButton
                      className={cn(styles.cardActionButton, styles.iconButtonDanger)}
                      aria-label={`Delete ${screen.name ?? screen.id}`}
                      title={`Delete ${screen.name ?? screen.id}`}
                      tooltip="Delete"
                      data-testid="screen-card-delete"
                      disabled={!canDelete}
                      onClick={(event) => {
                        event.stopPropagation();
                        removeScreen(screen.id);
                      }}
                    >
                      <DeleteOutlineOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </div>
                </article>
              );
            })}
          <div className={styles.addScreenFooter}>
            <button
              type="button"
              className={styles.addScreenButton}
              onClick={() => addScreen()}
              aria-label="Add screen"
              data-testid="screens-panel-add"
            >
              <AddOutlinedIcon fontSize="small" aria-hidden />
              <span>Add screen</span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

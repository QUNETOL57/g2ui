import { useEffect, useId, useState } from "react";

import type { WidgetNode } from "@entities/ui-project";
import { isValidId } from "@entities/ui-project/ids";
import { isValidClass, normalizeClass } from "@entities/ui-project/lib/cssClass";
import { collectIds } from "@entities/ui-project/model/tree-ops";
import { useEditorStore } from "@entities/ui-project/model/store";
import { cn } from "@shared/lib/cn";
import { LockToggleButton } from "@shared/ui/LockToggleButton";
import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";
import { WidgetTypeIcon } from "@widgets/canvas-workspace/toolbarIcons";

import styles from "../PropertiesPanel.module.css";

function idErrorMessage(candidate: string, currentId: string, usedIds: Set<string>): string | null {
  const trimmed = candidate.trim();
  if (!trimmed) return "Id is required";
  if (!isValidId(trimmed)) {
    return "Must be lowercase, start with a letter, [a-z0-9_], max 64 chars";
  }
  if (trimmed !== currentId && usedIds.has(trimmed)) {
    return "Id is already used in this project";
  }
  return null;
}

export function SelectedGroup({
  node,
  updateNode,
  renameNode,
}: {
  node: WidgetNode;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
  renameNode: (oldId: string, newId: string) => boolean;
}) {
  const project = useEditorStore((s) => s.project);
  const nameInputId = useId();
  const classInputId = useId();
  const idInputId = useId();
  const isLocked = node.locked === true;
  const summaryLabel = node.name?.trim() || node.id;

  const [idDraft, setIdDraft] = useState(node.id);
  const [idFocused, setIdFocused] = useState(false);
  const [classDraft, setClassDraft] = useState(node.class ?? "");
  const [classFocused, setClassFocused] = useState(false);

  useEffect(() => {
    if (!idFocused) setIdDraft(node.id);
  }, [node.id, idFocused]);

  useEffect(() => {
    if (!classFocused) setClassDraft(node.class ?? "");
  }, [node.class, classFocused]);

  const usedIds = collectIds(project);
  const liveIdError = idFocused ? idErrorMessage(idDraft, node.id, usedIds) : null;
  const classNormalizedPreview = normalizeClass(classDraft);
  const liveClassError =
    classFocused && classDraft.trim() !== "" && !isValidClass(classDraft)
      ? "Each class token must be a CSS-like identifier"
      : null;

  const commitId = () => {
    setIdFocused(false);
    const trimmed = idDraft.trim();
    if (trimmed === node.id) {
      setIdDraft(node.id);
      return;
    }
    const error = idErrorMessage(idDraft, node.id, usedIds);
    if (error || !renameNode(node.id, trimmed)) {
      setIdDraft(node.id);
      return;
    }
  };

  const commitClass = () => {
    setClassFocused(false);
    if (!isValidClass(classDraft)) {
      setClassDraft(node.class ?? "");
      return;
    }
    const next = classNormalizedPreview;
    if ((node.class ?? undefined) === next) {
      setClassDraft(next ?? "");
      return;
    }
    updateNode(node.id, { class: next });
    setClassDraft(next ?? "");
  };

  return (
    <div className={cn(styles.group, styles.summary)}>
      <span
        className={styles.typeIcon}
        role="img"
        aria-label={`${node.type} node`}
        title={node.type}
      >
        <WidgetTypeIcon type={node.type} size={16} />
      </span>
      <span className={styles.summaryTitle} title={summaryLabel}>
        {summaryLabel}
      </span>
      <div className={styles.summaryActions}>
        {node.type !== "screen" ? (
          <>
            <VisibilityToggleButton
              visible={node.visible !== false}
              label={summaryLabel}
              onToggle={() => updateNode(node.id, { visible: node.visible === false })}
            />
            <LockToggleButton
              locked={isLocked}
              label={summaryLabel}
              onToggle={() => updateNode(node.id, { locked: node.locked !== true })}
            />
          </>
        ) : (
          <span className={styles.summaryActionsSpacer} aria-hidden="true" />
        )}
      </div>

      <div className={cn(styles.row, styles.summaryFieldRow)}>
        <label htmlFor={idInputId}>id</label>
        <input
          id={idInputId}
          type="text"
          className={cn(styles.inputText, styles.idInput, liveIdError && styles.inputInvalid)}
          value={idDraft}
          aria-invalid={liveIdError ? true : undefined}
          disabled={isLocked}
          spellCheck={false}
          onFocus={() => setIdFocused(true)}
          onChange={(e) => setIdDraft(e.target.value)}
          onBlur={commitId}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setIdDraft(node.id);
              e.currentTarget.blur();
            }
          }}
        />
      </div>

      {liveIdError ? (
        <p className={styles.summaryFieldError} role="alert">
          {liveIdError}
        </p>
      ) : null}

      <div className={cn(styles.row, styles.summaryFieldRow)}>
        <label htmlFor={nameInputId}>name</label>
        <input
          id={nameInputId}
          type="text"
          className={styles.inputText}
          value={node.name ?? ""}
          placeholder={node.id}
          disabled={isLocked}
          onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        />
      </div>

      <div className={cn(styles.row, styles.summaryFieldRow)}>
        <label htmlFor={classInputId}>class</label>
        <input
          id={classInputId}
          type="text"
          className={cn(styles.inputText, liveClassError && styles.inputInvalid)}
          value={classDraft}
          placeholder="btn primary"
          aria-invalid={liveClassError ? true : undefined}
          disabled={isLocked}
          spellCheck={false}
          onFocus={() => setClassFocused(true)}
          onChange={(e) => setClassDraft(e.target.value)}
          onBlur={commitClass}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setClassDraft(node.class ?? "");
              e.currentTarget.blur();
            }
          }}
        />
      </div>

      {liveClassError ? (
        <p className={styles.summaryFieldError} role="alert">
          {liveClassError}
        </p>
      ) : null}
    </div>
  );
}

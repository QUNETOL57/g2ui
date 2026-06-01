import { useEffect, useRef, useState } from "react";

import type { ButtonProps, WidgetNode } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";
import { TypographyCard } from "../ui/TypographyCard";

const TEXT_COMMIT_DELAY_MS = 400;

export function ButtonGroup({
  node,
  palette,
  onChange,
  onStyleChange,
  onBeginHistoryBatch = () => undefined,
  onCommitHistoryBatch = () => undefined,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (patch: Partial<ButtonProps>, options?: { history?: boolean }) => void;
  onStyleChange: (patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
  onBeginHistoryBatch?: () => void;
  onCommitHistoryBatch?: () => void;
}) {
  const p = (node.props ?? {}) as ButtonProps;
  const committedText = p.text ?? "";
  const [draftText, setDraftText] = useState(committedText);
  const editingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const paddingTop = p.paddingTop ?? p.paddingY ?? 0;
  const paddingRight = p.paddingRight ?? p.paddingX ?? 0;
  const paddingBottom = p.paddingBottom ?? p.paddingY ?? 0;
  const paddingLeft = p.paddingLeft ?? p.paddingX ?? 0;

  useEffect(() => {
    if (!editingRef.current) {
      setDraftText(committedText);
    }
  }, [committedText, node.id]);

  const clearCommitTimer = () => {
    if (timerRef.current === null) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const commitText = (text: string) => {
    if (!editingRef.current) return;
    clearCommitTimer();
    onChange({ text }, { history: false });
    onCommitHistoryBatch();
    editingRef.current = false;
  };

  const scheduleTextCommit = (text: string) => {
    clearCommitTimer();
    timerRef.current = window.setTimeout(() => commitText(text), TEXT_COMMIT_DELAY_MS);
  };

  const updateDraftText = (text: string) => {
    if (!editingRef.current) {
      onBeginHistoryBatch();
      editingRef.current = true;
    }
    setDraftText(text);
    scheduleTextCommit(text);
  };

  return (
    <div className={cn(styles.group, styles.textGroup)}>
      <h4>Content</h4>
      <div className={styles.textFieldStack}>
        <label>text</label>
        <input
          aria-label="button text"
          type="text"
          className={styles.inputText}
          value={draftText}
          onChange={(e) => updateDraftText(e.target.value)}
          onBlur={() => commitText(draftText)}
        />
      </div>
      <TypographyCard
        props={p}
        style={node.style}
        palette={palette}
        backgroundDefaultEnabled
        showBackground={false}
        onPropsChange={(patch) => onChange(patch as Partial<ButtonProps>)}
        onStyleChange={onStyleChange}
        paddingControls={{
          horizontalAlign: p.horizontalAlign ?? "center",
          verticalAlign: p.verticalAlign ?? "center",
          top: paddingTop,
          right: paddingRight,
          bottom: paddingBottom,
          left: paddingLeft,
          onChange,
        }}
      />
    </div>
  );
}

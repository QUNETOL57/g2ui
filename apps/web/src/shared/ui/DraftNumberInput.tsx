import { useEffect, useRef, useState } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./DraftNumberInput.module.css";

interface DraftNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  title?: string;
  className?: string;
  variant?: "default" | "bare";
}

export function DraftNumberInput({
  value,
  onChange,
  min,
  max,
  title,
  className,
  variant = "default",
}: DraftNumberInputProps) {
  const [draft, setDraft] = useState(String(value));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(value));
    }
  }, [value]);

  const clamp = (next: number) => Math.min(max ?? next, Math.max(min ?? next, next));

  const parseDraft = (raw: string): number | null => {
    if (raw.trim() === "") return null;

    const next = Number(raw);
    if (!Number.isFinite(next)) return null;

    return clamp(next);
  };

  const emitParsed = (parsed: number) => {
    if (parsed !== value) onChange(parsed);
  };

  const commit = () => {
    const parsed = parseDraft(draft);
    if (parsed === null) {
      setDraft(String(value));
      return;
    }

    setDraft(String(parsed));
    emitParsed(parsed);
  };

  return (
    <input
      type="number"
      value={draft}
      min={min}
      max={max}
      title={title}
      className={cn(variant === "bare" ? styles.bare : styles.input, className)}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onChange={(event) => {
        const nextDraft = event.target.value;
        setDraft(nextDraft);

        const parsed = parseDraft(nextDraft);
        if (parsed !== null) emitParsed(parsed);
      }}
      onBlur={() => {
        focusedRef.current = false;
        commit();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(String(value));
          event.currentTarget.blur();
        }
      }}
    />
  );
}

import { useEffect, useState } from "react";

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

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (draft.trim() === "") {
      setDraft(String(value));
      return;
    }

    const next = Number(draft);
    if (!Number.isFinite(next)) {
      setDraft(String(value));
      return;
    }

    const clamped = Math.min(max ?? next, Math.max(min ?? next, next));
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <input
      type="number"
      value={draft}
      min={min}
      max={max}
      title={title}
      className={cn(variant === "bare" ? styles.bare : styles.input, className)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
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

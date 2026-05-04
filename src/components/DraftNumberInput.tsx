import { useEffect, useState } from "react";

interface DraftNumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  title?: string;
}

export function DraftNumberInput({
  value,
  onChange,
  min,
  max,
  title,
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

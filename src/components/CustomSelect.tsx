import { useEffect, useMemo, useRef, useState } from "react";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div className="custom-select" ref={rootRef}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span className="custom-select-value">
          {selected?.color ? (
            <span
              className="custom-select-swatch"
              style={{ backgroundColor: selected.color }}
              aria-hidden="true"
            />
          ) : null}
          <span>{selected?.label ?? value}</span>
        </span>
        <span className="custom-select-chevron" aria-hidden="true" />
      </button>
      {open ? (
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={`custom-select-option${isSelected ? " selected" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className="custom-select-check" aria-hidden="true">
                  {isSelected ? "✓" : ""}
                </span>
                <span className="custom-select-value">
                  {option.color ? (
                    <span
                      className="custom-select-swatch"
                      style={{ backgroundColor: option.color }}
                      aria-hidden="true"
                    />
                  ) : null}
                  <span>{option.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

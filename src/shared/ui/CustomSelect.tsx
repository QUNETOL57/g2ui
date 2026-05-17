import { useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./CustomSelect.module.css";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  triggerClassName?: string;
}

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  triggerClassName,
}: CustomSelectProps) {
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
    <div className={cn(styles.root, className)} ref={rootRef}>
      <button
        type="button"
        className={cn(styles.trigger, triggerClassName)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
      >
        <span className={styles.triggerValueText}>
          <span className={styles.value}>
            {selected?.color ? (
              <span
                className={styles.swatch}
                style={{ backgroundColor: selected.color }}
                aria-hidden="true"
              />
            ) : null}
            <span>{selected?.label ?? value}</span>
          </span>
        </span>
        <span className={styles.chevron} aria-hidden="true" />
      </button>
      {open ? (
        <div className={styles.menu} role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(styles.option, isSelected && styles.optionSelected)}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span className={styles.check} aria-hidden="true">
                  {isSelected ? "✓" : ""}
                </span>
                <span className={styles.value}>
                  {option.color ? (
                    <span
                      className={styles.swatch}
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

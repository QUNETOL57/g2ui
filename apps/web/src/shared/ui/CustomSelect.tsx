import {
  cloneElement,
  isValidElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@shared/lib/cn";

import styles from "./CustomSelect.module.css";

export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: ReactNode;
}

interface CustomSelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  className?: string;
  size?: "default" | "sm";
  triggerClassName?: string;
  menuClassName?: string;
  optionClassName?: string;
}

const MENU_GAP = 6;
const VIEWPORT_MARGIN = 8;

function renderOptionIcon(icon: ReactNode): ReactNode {
  return isValidElement(icon) ? cloneElement(icon) : icon;
}

export function CustomSelect({
  value,
  options,
  onChange,
  ariaLabel,
  className,
  size = "default",
  triggerClassName,
  menuClassName,
  optionClassName,
}: CustomSelectProps) {
  const isSm = size === "sm";
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | undefined>();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const anchor = triggerRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const menuHeight = menuRef.current?.offsetHeight ?? 0;
      const menuWidth = anchor.width;
      const spaceBelow = window.innerHeight - anchor.bottom - MENU_GAP - VIEWPORT_MARGIN;
      const spaceAbove = anchor.top - MENU_GAP - VIEWPORT_MARGIN;
      const placeBelow = spaceBelow >= menuHeight || spaceBelow >= spaceAbove;
      let top = placeBelow ? anchor.bottom + MENU_GAP : anchor.top - MENU_GAP - menuHeight;
      const maxTop = Math.max(VIEWPORT_MARGIN, window.innerHeight - menuHeight - VIEWPORT_MARGIN);
      top = Math.min(Math.max(top, VIEWPORT_MARGIN), maxTop);
      let left = anchor.left;
      const maxLeft = Math.max(VIEWPORT_MARGIN, window.innerWidth - menuWidth - VIEWPORT_MARGIN);
      left = Math.min(Math.max(left, VIEWPORT_MARGIN), maxLeft);
      setMenuStyle({ top, left, width: menuWidth });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const menu = open ? (
    <div
      ref={menuRef}
      className={cn(styles.menu, isSm && styles.menuSm, menuClassName)}
      role="listbox"
      style={menuStyle}
    >
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            className={cn(
              styles.option,
              isSm && styles.optionSm,
              isSelected && styles.optionSelected,
              optionClassName,
            )}
            onClick={() => {
              onChange(option.value);
              setOpen(false);
            }}
          >
            <span className={styles.check} aria-hidden="true">
              {isSelected ? "✓" : ""}
            </span>
            <span className={styles.value}>
              {option.icon ? (
                <span className={styles.optionIcon} aria-hidden="true">
                  {renderOptionIcon(option.icon)}
                </span>
              ) : null}
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
  ) : null;

  return (
    <div className={cn(styles.root, className)} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(styles.trigger, isSm && styles.triggerSm, triggerClassName)}
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
            {selected?.icon ? (
              <span className={styles.optionIcon} aria-hidden="true">
                {renderOptionIcon(selected.icon)}
              </span>
            ) : null}
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
      {menu ? createPortal(menu, document.body) : null}
    </div>
  );
}

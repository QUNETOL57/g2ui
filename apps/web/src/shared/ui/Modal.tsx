import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Modal.module.css";

export type ModalSize = "sm" | "md" | "lg";
export type ModalPlacement = "center" | "bottom";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  size?: ModalSize;
  placement?: ModalPlacement;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

const sizeClass: Record<ModalSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

export function Modal({
  open,
  onClose,
  size = "md",
  placement = "center",
  children,
  className,
  backdropClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = getFocusableElements(dialog);
    (focusables[0] ?? dialog).focus();

    return () => {
      const previous = previouslyFocusedRef.current;
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (!closeOnEscape || !onClose) return;
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusables = getFocusableElements(dialog);
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialog.contains(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !dialog.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        styles.backdrop,
        placement === "bottom" && styles.backdropBottom,
        backdropClassName,
      )}
      onClick={(event) => {
        if (!closeOnBackdrop || !onClose) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          styles.dialog,
          placement === "center" && sizeClass[size],
          placement === "bottom" && styles.placementBottom,
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

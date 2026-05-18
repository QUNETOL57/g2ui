import { useEffect, type ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Modal.module.css";

export type ModalSize = "sm" | "md";

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  size?: ModalSize;
  children: ReactNode;
  className?: string;
  backdropClassName?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

const sizeClass: Record<ModalSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
};

export function Modal({
  open,
  onClose,
  size = "md",
  children,
  className,
  backdropClassName,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: ModalProps) {
  useEffect(() => {
    if (!open || !closeOnEscape || !onClose) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(styles.backdrop, backdropClassName)}
      onClick={(event) => {
        if (!closeOnBackdrop || !onClose) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={cn(styles.dialog, sizeClass[size], className)}>{children}</div>
    </div>
  );
}

import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./LockToggleButton.module.css";

interface LockToggleButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  locked: boolean;
  label: string;
  onToggle: () => void;
}

export function LockToggleButton({
  locked,
  label,
  onToggle,
  className,
  onMouseDown,
  ...props
}: LockToggleButtonProps) {
  const actionLabel = locked ? `Unlock ${label}` : `Lock ${label}`;

  return (
    <button
      type="button"
      className={cn(styles.button, locked && styles.buttonLocked, className)}
      aria-label={actionLabel}
      title={actionLabel}
      onMouseDown={(event) => {
        event.stopPropagation();
        onMouseDown?.(event);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      {...props}
    >
      {locked ? (
        <LockOutlinedIcon fontSize="inherit" aria-hidden />
      ) : (
        <LockOpenOutlinedIcon fontSize="inherit" aria-hidden />
      )}
    </button>
  );
}

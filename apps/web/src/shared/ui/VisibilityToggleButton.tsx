import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./VisibilityToggleButton.module.css";

interface VisibilityToggleButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "onClick"> {
  visible: boolean;
  label: string;
  onToggle: () => void;
}

export function VisibilityToggleButton({
  visible,
  label,
  onToggle,
  className,
  onMouseDown,
  ...props
}: VisibilityToggleButtonProps) {
  const actionLabel = visible ? `Hide ${label}` : `Show ${label}`;

  return (
    <button
      type="button"
      className={cn(styles.button, !visible && styles.buttonHidden, className)}
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
      {visible ? (
        <VisibilityOutlinedIcon fontSize="inherit" aria-hidden />
      ) : (
        <VisibilityOffOutlinedIcon fontSize="inherit" aria-hidden />
      )}
    </button>
  );
}

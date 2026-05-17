import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./IconButton.module.css";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tooltip?: string;
}

export function IconButton({
  children,
  className,
  title,
  tooltip,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      className={cn(styles.iconButton, tooltip && styles.tooltipHost, className)}
      title={title}
      data-tooltip={tooltip}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

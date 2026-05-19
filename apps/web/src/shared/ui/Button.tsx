import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Button.module.css";

export type ButtonVariant = "default" | "primary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children?: ReactNode;
}

const variantClass: Record<ButtonVariant, string | undefined> = {
  default: undefined,
  primary: styles.variantPrimary,
  danger: styles.variantDanger,
  ghost: styles.variantGhost,
};

const sizeClass: Record<ButtonSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export function Button({
  variant = "default",
  size = "md",
  className,
  type = "button",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(styles.button, sizeClass[size], variantClass[variant], className)}
      {...props}
    >
      {children}
    </button>
  );
}

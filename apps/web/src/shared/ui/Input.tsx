import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Input.module.css";

export type InputSize = "sm" | "md" | "lg";

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  invalid?: boolean;
}

const sizeClass: Record<InputSize, string | undefined> = {
  sm: styles.sizeSm,
  md: undefined,
  lg: styles.sizeLg,
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, size = "md", invalid, type = "text", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(styles.input, sizeClass[size], invalid && styles.invalid, className)}
      {...props}
    />
  );
});

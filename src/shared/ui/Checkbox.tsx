import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Checkbox.module.css";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> {
  children?: ReactNode;
  labelClassName?: string;
}

export function Checkbox({
  className,
  labelClassName,
  children,
  ...props
}: CheckboxProps) {
  return (
    <label className={cn(styles.label, labelClassName)}>
      <input type="checkbox" className={cn(styles.input, className)} {...props} />
      {children}
    </label>
  );
}

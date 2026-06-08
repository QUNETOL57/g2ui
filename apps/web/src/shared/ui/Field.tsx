import type { LabelHTMLAttributes, ReactNode } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Field.module.css";

interface FieldProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, "title"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field({ label, hint, error, children, className, ...props }: FieldProps) {
  return (
    <label className={cn(styles.field, className)} {...props}>
      {label ? <span className={styles.label}>{label}</span> : null}
      {children}
      {error ? <span className={styles.error}>{error}</span> : null}
      {hint && !error ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

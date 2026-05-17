import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./Textarea.module.css";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: "default" | "mono";
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, variant = "default", ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      className={cn(styles.textarea, variant === "mono" && styles.mono, className)}
      {...props}
    />
  );
});

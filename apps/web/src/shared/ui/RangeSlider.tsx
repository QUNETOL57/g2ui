import { forwardRef, type CSSProperties, type InputHTMLAttributes } from "react";

import { cn } from "@shared/lib/cn";

import styles from "./RangeSlider.module.css";

interface RangeSliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  progress?: number;
}

export const RangeSlider = forwardRef<HTMLInputElement, RangeSliderProps>(function RangeSlider(
  { className, progress, style, ...props },
  ref,
) {
  const composedStyle: CSSProperties | undefined =
    typeof progress === "number"
      ? { ...style, ["--range-progress" as never]: `${progress}%` }
      : style;
  return (
    <input
      ref={ref}
      type="range"
      className={cn(styles.range, className)}
      style={composedStyle}
      {...props}
    />
  );
});

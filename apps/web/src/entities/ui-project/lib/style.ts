/** Corners on when explicitly enabled, or legacy radius without an explicit off flag. */
export function isCornersEnabled(
  style?: { drawCorners?: boolean; borderRadius?: number } | null,
): boolean {
  if (!style) return false;
  if (style.drawCorners === true) return true;
  if (style.drawCorners === false) return false;
  return Math.max(0, style.borderRadius ?? 0) > 0;
}

export function effectiveBorderRadius(
  style?: { drawCorners?: boolean; borderRadius?: number } | null,
  fallback = 0,
): number {
  if (!isCornersEnabled(style)) return 0;
  return Math.max(0, style?.borderRadius ?? fallback);
}

import type { WidgetType } from "../types.js";

/** Discrete rotation angles supported for shape widgets (degrees). */
export const ROTATION_90_STEPS = [0, 90, 180, 270] as const;

export type Rotation90 = (typeof ROTATION_90_STEPS)[number];

/** Widget types that support editor rotation in 90° steps. */
export const ROTATABLE_SHAPE_TYPES = [
  "rect",
  "circle",
  "triangle",
  "line",
] as const satisfies readonly WidgetType[];

export type RotatableShapeType = (typeof ROTATABLE_SHAPE_TYPES)[number];

export function isRotatableShapeType(type: WidgetType | string): type is RotatableShapeType {
  return (ROTATABLE_SHAPE_TYPES as readonly string[]).includes(type);
}

/** Normalize any degree value into `[0, 360)`. */
export function normalizeRotation(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

/** Snap a degree value to the nearest 0 / 90 / 180 / 270. */
export function snapRotation90(value: number): Rotation90 {
  const normalized = normalizeRotation(value);
  const stepped = Math.round(normalized / 90) % 4;
  return (stepped * 90) as Rotation90;
}

/**
 * Rotate by `quarterTurns` steps of 90° (positive = clockwise).
 * Defaults missing/invalid current rotation to 0 before stepping.
 */
export function rotateBy90(current: number | undefined | null, quarterTurns = 1): Rotation90 {
  const base = snapRotation90(current ?? 0);
  const steps = Number.isFinite(quarterTurns) ? Math.trunc(quarterTurns) : 0;
  return snapRotation90(base + steps * 90);
}

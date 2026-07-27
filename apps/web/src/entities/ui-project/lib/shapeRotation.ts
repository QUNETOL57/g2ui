import type { Frame, LineProps, TriangleProps, WidgetNode } from "../types.js";

import {
  frameCenter,
  isRotatableShapeType,
  rotatedFrameAabb,
  rotatePoint90,
  snapRotation90,
  type RotationPoint,
} from "./rotation.js";

const TRIANGLE_DIRECTIONS = ["up", "right", "down", "left"] as const;

/**
 * Bake clockwise 90° quarter-turns into the node's frame/geometry and clear CSS rotation.
 * Returns true when the node was mutated.
 */
export function bakeShapeQuarterTurns(node: WidgetNode, quarterTurns: number): boolean {
  if (!isRotatableShapeType(node.type)) return false;
  const steps = ((Math.trunc(quarterTurns) % 4) + 4) % 4;
  if (steps === 0) {
    if (node.rotation) {
      node.rotation = 0;
      return true;
    }
    return false;
  }

  const degrees = steps * 90;

  if (node.type === "line") {
    bakeLineQuarterTurns(node, degrees);
  } else if (node.frame) {
    node.frame = rotatedFrameAabb(node.frame, degrees);
    if (node.type === "triangle") {
      bakeTriangleDirection(node, steps);
    }
  } else {
    return false;
  }

  node.rotation = 0;
  return true;
}

/**
 * Apply a target snapped rotation by baking the delta from the current CSS rotation
 * into geometry, then clearing `node.rotation`.
 */
export function bakeShapeRotationTo(node: WidgetNode, targetRotation: number): boolean {
  if (!isRotatableShapeType(node.type)) return false;
  const current = snapRotation90(node.rotation ?? 0);
  const target = snapRotation90(targetRotation);
  let steps = (target - current) / 90;
  if (steps < 0) steps += 4;
  return bakeShapeQuarterTurns(node, steps);
}

/**
 * Rotate a shape by quarter-turns relative to its current visual orientation
 * (legacy CSS rotation is baked first, then the requested step is applied).
 */
export function rotateShapeByQuarterTurns(node: WidgetNode, quarterTurns: number): boolean {
  if (!isRotatableShapeType(node.type) || node.locked) return false;

  const legacySteps = snapRotation90(node.rotation ?? 0) / 90;
  let changed = false;
  if (legacySteps !== 0) {
    changed = bakeShapeQuarterTurns(node, legacySteps) || changed;
  }

  const steps = Number.isFinite(quarterTurns) ? Math.trunc(quarterTurns) : 0;
  if (steps !== 0) {
    changed = bakeShapeQuarterTurns(node, steps) || changed;
  } else if (node.rotation) {
    node.rotation = 0;
    changed = true;
  }

  return changed;
}

function bakeTriangleDirection(node: WidgetNode, steps: number): void {
  const props = { ...((node.props ?? {}) as TriangleProps) };
  const current = props.direction ?? "up";
  const index = TRIANGLE_DIRECTIONS.indexOf(current);
  const from = index >= 0 ? index : 0;
  props.direction = TRIANGLE_DIRECTIONS[(from + steps) % TRIANGLE_DIRECTIONS.length];
  node.props = props;
}

function lineStrokeWidth(node: WidgetNode): number {
  const props = (node.props ?? {}) as Partial<LineProps>;
  return Math.max(1, node.style?.borderWidth ?? props.strokeWidth ?? 1);
}

function lineEndpointsInFrame(node: WidgetNode, rect: Frame): { start: RotationPoint; end: RotationPoint } {
  const props = (node.props ?? {}) as Partial<LineProps>;
  const strokeWidth = lineStrokeWidth(node);
  const visualHeight = Math.max(rect.height, strokeWidth);
  const fallbackY = Math.floor(visualHeight / 2);
  const pad = Math.floor(strokeWidth / 2);
  const maxY = Math.max(pad, visualHeight - Math.ceil(strokeWidth / 2));
  const visibleY = (value: number | undefined) =>
    Math.min(maxY, Math.max(pad, Math.round(value ?? fallbackY)));
  return {
    start: {
      x: rect.x + Math.round(props.x1 ?? 0),
      y: rect.y + visibleY(props.y1),
    },
    end: {
      x: rect.x + Math.round(props.x2 ?? Math.max(0, rect.width - 1)),
      y: rect.y + visibleY(props.y2),
    },
  };
}

function lineFrameFromEndpoints(
  start: RotationPoint,
  end: RotationPoint,
  strokeWidth: number,
): { frame: Frame; props: Partial<LineProps> } {
  const strokeOffset = Math.floor(strokeWidth / 2);
  const strokeEndOffset = Math.ceil(strokeWidth / 2) - 1;
  const left = Math.min(start.x, end.x) - strokeOffset;
  const top = Math.min(start.y, end.y) - strokeOffset;
  const right = Math.max(start.x, end.x) + strokeEndOffset;
  const bottom = Math.max(start.y, end.y) + strokeEndOffset;
  return {
    frame: {
      x: left,
      y: top,
      width: Math.max(1, right - left + 1),
      height: Math.max(1, bottom - top + 1),
    },
    props: {
      x1: start.x - left,
      y1: start.y - top,
      x2: end.x - left,
      y2: end.y - top,
    },
  };
}

function bakeLineQuarterTurns(node: WidgetNode, degrees: number): void {
  const frame = node.frame ?? { x: 0, y: 0, width: 1, height: 1 };
  const center = frameCenter(frame);
  const endpoints = lineEndpointsInFrame(node, frame);
  const start = rotatePoint90(endpoints.start, center, degrees);
  const end = rotatePoint90(endpoints.end, center, degrees);
  const strokeWidth = lineStrokeWidth(node);
  const baked = lineFrameFromEndpoints(start, end, strokeWidth);
  node.frame = baked.frame;
  node.props = {
    ...((node.props ?? {}) as LineProps),
    ...baked.props,
    strokeWidth,
  };
}

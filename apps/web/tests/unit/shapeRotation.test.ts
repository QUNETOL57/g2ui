import { describe, expect, it } from "vitest";

import { rotatedFrameAabb } from "@entities/ui-project/lib/rotation";
import {
  bakeShapeQuarterTurns,
  bakeShapeRotationTo,
  rotateShapeByQuarterTurns,
} from "@entities/ui-project/lib/shapeRotation";

import { makeCircle, makeLine, makeRect, makeTriangle } from "../fixtures/projects";

describe("bakeShapeQuarterTurns", () => {
  it("swaps rect frame around center for 90° and clears rotation", () => {
    const node = {
      ...makeRect("rc_1"),
      rotation: 90,
      frame: { x: 10, y: 20, width: 40, height: 24 },
    };
    expect(bakeShapeQuarterTurns(node, 1)).toBe(true);
    expect(node.rotation).toBe(0);
    expect(node.frame).toEqual(rotatedFrameAabb({ x: 10, y: 20, width: 40, height: 24 }, 90));
  });

  it("is a no-op for 0 quarter turns when rotation is already clear", () => {
    const node = makeRect("rc_1");
    const frame = { ...node.frame! };
    expect(bakeShapeQuarterTurns(node, 0)).toBe(false);
    expect(node.frame).toEqual(frame);
  });

  it("cycles triangle direction with the frame", () => {
    const node = {
      ...makeTriangle("tri_1"),
      frame: { x: 0, y: 0, width: 36, height: 20 },
      props: { direction: "up" as const },
    };
    bakeShapeQuarterTurns(node, 1);
    expect(node.props).toMatchObject({ direction: "right" });
    expect(node.frame).toEqual({ x: 8, y: -8, width: 20, height: 36 });

    bakeShapeQuarterTurns(node, 1);
    expect(node.props).toMatchObject({ direction: "down" });
  });

  it("rebuilds line endpoints and frame for 90°", () => {
    const node = {
      ...makeLine("ln_1"),
      frame: { x: 0, y: 10, width: 20, height: 1 },
      props: { x1: 0, y1: 0, x2: 19, y2: 0, strokeWidth: 1 },
      style: { borderWidth: 1 },
    };
    bakeShapeQuarterTurns(node, 1);
    expect(node.rotation).toBe(0);
    expect(node.frame?.width).toBeLessThanOrEqual(3);
    expect(node.frame!.height).toBeGreaterThan(node.frame!.width);
    expect((node.props as { x1: number; y1: number; x2: number; y2: number }).y1).not.toBe(
      (node.props as { y2: number }).y2,
    );
  });

  it("swaps ellipse axes for a non-square circle", () => {
    const node = {
      ...makeCircle("cir_1"),
      frame: { x: 0, y: 0, width: 40, height: 20 },
    };
    bakeShapeQuarterTurns(node, 1);
    expect(node.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });
  });
});

describe("bakeShapeRotationTo", () => {
  it("bakes the delta from current CSS rotation to the target", () => {
    const node = {
      ...makeRect("rc_1"),
      rotation: 0,
      frame: { x: 0, y: 0, width: 40, height: 20 },
    };
    bakeShapeRotationTo(node, 90);
    expect(node.rotation).toBe(0);
    expect(node.frame).toEqual({ x: 10, y: -10, width: 20, height: 40 });
  });
});

describe("rotateShapeByQuarterTurns", () => {
  it("normalizes legacy CSS rotation before applying the step", () => {
    const base = { x: 0, y: 0, width: 40, height: 20 };
    const node = { ...makeRect("rc_1"), rotation: 90, frame: { ...base } };
    // Visual is already 90°; +90° should equal baking 180° from identity → same AABB as base.
    rotateShapeByQuarterTurns(node, 1);
    expect(node.rotation).toBe(0);
    expect(node.frame).toEqual(base);
  });

  it("skips locked nodes", () => {
    const node = { ...makeRect("rc_1"), locked: true, frame: { x: 0, y: 0, width: 40, height: 20 } };
    expect(rotateShapeByQuarterTurns(node, 1)).toBe(false);
    expect(node.frame).toEqual({ x: 0, y: 0, width: 40, height: 20 });
  });
});

import { describe, expect, it } from "vitest";

import {
  ROTATABLE_SHAPE_TYPES,
  ROTATION_90_STEPS,
  isRotatableShapeType,
  normalizeRotation,
  rotateBy90,
  snapRotation90,
} from "@entities/ui-project/lib/rotation";

describe("normalizeRotation", () => {
  it("keeps values in [0, 360)", () => {
    expect(normalizeRotation(0)).toBe(0);
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(359)).toBe(359);
  });

  it("wraps values at and above 360", () => {
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(405)).toBe(45);
    expect(normalizeRotation(720)).toBe(0);
  });

  it("wraps negative values into [0, 360)", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(-1)).toBe(359);
    expect(normalizeRotation(-450)).toBe(270);
  });

  it("treats non-finite values as 0", () => {
    expect(normalizeRotation(Number.NaN)).toBe(0);
    expect(normalizeRotation(Number.POSITIVE_INFINITY)).toBe(0);
    expect(normalizeRotation(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe("snapRotation90", () => {
  it.each([
    [0, 0],
    [1, 0],
    [44, 0],
    [45, 90],
    [89, 90],
    [90, 90],
    [134, 90],
    [135, 180],
    [180, 180],
    [225, 270],
    [270, 270],
    [314, 270],
    [315, 0],
    [359, 0],
  ] as const)("snaps %i to %i", (input, expected) => {
    expect(snapRotation90(input)).toBe(expected);
  });

  it("snaps wrapped and negative inputs", () => {
    expect(snapRotation90(405)).toBe(90);
    expect(snapRotation90(-45)).toBe(0);
    expect(snapRotation90(-90)).toBe(270);
  });

  it("only returns discrete 90° steps", () => {
    for (const step of ROTATION_90_STEPS) {
      expect(snapRotation90(step)).toBe(step);
    }
  });
});

describe("rotateBy90", () => {
  it("rotates clockwise by one quarter turn by default", () => {
    expect(rotateBy90(0)).toBe(90);
    expect(rotateBy90(90)).toBe(180);
    expect(rotateBy90(180)).toBe(270);
    expect(rotateBy90(270)).toBe(0);
  });

  it("rotates counter-clockwise with negative quarter turns", () => {
    expect(rotateBy90(0, -1)).toBe(270);
    expect(rotateBy90(90, -1)).toBe(0);
    expect(rotateBy90(180, -2)).toBe(0);
  });

  it("defaults missing rotation to 0 before stepping", () => {
    expect(rotateBy90(undefined)).toBe(90);
    expect(rotateBy90(null, -1)).toBe(270);
  });

  it("snaps legacy free-form angles before stepping", () => {
    expect(rotateBy90(45, 1)).toBe(180);
    expect(rotateBy90(40, -1)).toBe(270);
  });

  it("ignores non-finite quarter turns", () => {
    expect(rotateBy90(90, Number.NaN)).toBe(90);
    expect(rotateBy90(90, Number.POSITIVE_INFINITY)).toBe(90);
  });

  it("truncates fractional quarter turns toward zero", () => {
    expect(rotateBy90(0, 1.9)).toBe(90);
    expect(rotateBy90(0, -1.9)).toBe(270);
  });
});

describe("isRotatableShapeType", () => {
  it("accepts rect, circle, triangle and line", () => {
    expect(ROTATABLE_SHAPE_TYPES).toEqual(["rect", "circle", "triangle", "line"]);
    for (const type of ROTATABLE_SHAPE_TYPES) {
      expect(isRotatableShapeType(type)).toBe(true);
    }
  });

  it("rejects non-shape widgets", () => {
    expect(isRotatableShapeType("button")).toBe(false);
    expect(isRotatableShapeType("label")).toBe(false);
    expect(isRotatableShapeType("freehand")).toBe(false);
    expect(isRotatableShapeType("panel")).toBe(false);
    expect(isRotatableShapeType("screen")).toBe(false);
  });
});

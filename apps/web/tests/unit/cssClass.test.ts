import { describe, expect, it } from "vitest";

import { isValidClass, isValidClassToken, normalizeClass } from "@entities/ui-project/lib/cssClass";

describe("cssClass helpers", () => {
  it("normalizes whitespace and returns undefined for empty", () => {
    expect(normalizeClass("")).toBeUndefined();
    expect(normalizeClass("   ")).toBeUndefined();
    expect(normalizeClass("  btn   primary  ")).toBe("btn primary");
  });

  it("validates class tokens like CSS identifiers", () => {
    expect(isValidClassToken("btn")).toBe(true);
    expect(isValidClassToken("_private")).toBe(true);
    expect(isValidClassToken("-webkit")).toBe(true);
    expect(isValidClassToken("btn-primary")).toBe(true);
    expect(isValidClassToken("1bad")).toBe(false);
    expect(isValidClassToken("has space")).toBe(false);
  });

  it("treats empty class as valid and rejects bad tokens", () => {
    expect(isValidClass(undefined)).toBe(true);
    expect(isValidClass("")).toBe(true);
    expect(isValidClass("btn primary")).toBe(true);
    expect(isValidClass("btn 1bad")).toBe(false);
  });
});

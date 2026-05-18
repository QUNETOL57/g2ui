import { describe, expect, it } from "vitest";

import { assertValidId, isValidId, nextId } from "@entities/ui-project/ids";

describe("isValidId", () => {
  it("accepts simple lowercase identifiers", () => {
    expect(isValidId("btn")).toBe(true);
    expect(isValidId("a")).toBe(true);
    expect(isValidId("screen_main")).toBe(true);
    expect(isValidId("btn_1")).toBe(true);
    expect(isValidId("a1_2_3")).toBe(true);
  });

  it("rejects ids that do not start with a letter", () => {
    expect(isValidId("1btn")).toBe(false);
    expect(isValidId("_btn")).toBe(false);
    expect(isValidId("")).toBe(false);
  });

  it("rejects uppercase, dashes and special chars", () => {
    expect(isValidId("Btn")).toBe(false);
    expect(isValidId("btn-1")).toBe(false);
    expect(isValidId("btn.1")).toBe(false);
    expect(isValidId("btn 1")).toBe(false);
  });

  it("rejects ids longer than 64 chars", () => {
    expect(isValidId("a".repeat(64))).toBe(true);
    expect(isValidId("a".repeat(65))).toBe(false);
  });
});

describe("assertValidId", () => {
  it("does not throw for valid ids", () => {
    expect(() => assertValidId("btn_1")).not.toThrow();
  });

  it("throws for invalid ids with a descriptive message", () => {
    expect(() => assertValidId("Btn")).toThrow(/invalid id/);
    expect(() => assertValidId("1abc")).toThrow(/invalid id/);
  });
});

describe("nextId", () => {
  it("returns the first free counter value", () => {
    expect(nextId("btn", [])).toBe("btn_1");
    expect(nextId("btn", ["btn_1"])).toBe("btn_2");
    expect(nextId("btn", ["btn_1", "btn_2", "btn_4"])).toBe("btn_3");
  });

  it("ignores unrelated prefixes", () => {
    expect(nextId("lbl", ["btn_1", "btn_2"])).toBe("lbl_1");
  });

  it("works with Set input", () => {
    expect(nextId("p", new Set(["p_1", "p_3"]))).toBe("p_2");
  });

  it("throws when prefix produces an invalid id", () => {
    expect(() => nextId("BAD", [])).toThrow(/invalid id/);
    expect(() => nextId("1bad", [])).toThrow(/invalid id/);
  });
});

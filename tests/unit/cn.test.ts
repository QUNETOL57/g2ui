import { describe, expect, it } from "vitest";

import { cn } from "@shared/lib/cn";

describe("cn", () => {
  it("joins truthy strings", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  it("filters out falsy values", () => {
    expect(cn("a", null, undefined, false, "", "b")).toBe("a b");
  });

  it("supports numbers", () => {
    expect(cn("a", 1, 2)).toBe("a 1 2");
  });

  it("returns empty string when nothing is truthy", () => {
    expect(cn(null, undefined, false)).toBe("");
  });
});

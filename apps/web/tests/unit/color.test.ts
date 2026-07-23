import { describe, expect, it } from "vitest";

import {
  resolveColor,
  resolveScreenBackground,
  SCREEN_BACKGROUND_FALLBACK,
} from "@entities/ui-project/lib/color";

describe("resolveColor", () => {
  it("returns fallback when color is undefined", () => {
    expect(resolveColor(undefined, undefined)).toBe("#FFFFFF");
    expect(resolveColor(undefined, undefined, "#000")).toBe("#000");
  });

  it("returns hex value as-is", () => {
    expect(resolveColor({ kind: "hex", value: "#FF0000" }, undefined)).toBe("#FF0000");
  });

  it("resolves token from provided palette", () => {
    const palette = [{ token: "primary", hex: "#123456" }];
    expect(resolveColor({ kind: "token", token: "primary" }, palette)).toBe("#123456");
  });

  it("falls back to built-in palette for known tokens", () => {
    expect(resolveColor({ kind: "token", token: "bg" }, undefined)).toBe("#000000");
    expect(resolveColor({ kind: "token", token: "fg" }, [])).toBe("#FFFFFF");
    expect(resolveColor({ kind: "token", token: "accent" }, undefined)).toBe("#1E90FF");
    expect(resolveColor({ kind: "token", token: "danger" }, undefined)).toBe("#FF3333");
  });

  it("returns fallback for unknown tokens with no palette match", () => {
    expect(resolveColor({ kind: "token", token: "unknown_token" }, [], "#abc")).toBe("#abc");
  });

  it("prefers palette over built-ins when token matches both", () => {
    expect(
      resolveColor({ kind: "token", token: "bg" }, [{ token: "bg", hex: "#222" }]),
    ).toBe("#222");
  });
});

describe("resolveScreenBackground", () => {
  const palette = [{ token: "bg", hex: "#102030" }];

  it("resolves style.background hex", () => {
    expect(
      resolveScreenBackground(
        { style: { background: { kind: "hex", value: "#abcdef" } } },
        palette,
      ),
    ).toBe("#abcdef");
  });

  it("resolves style.background token via palette", () => {
    expect(
      resolveScreenBackground(
        { style: { background: { kind: "token", token: "bg" } } },
        palette,
      ),
    ).toBe("#102030");
  });

  it("falls back to props.background when style.background is missing", () => {
    expect(
      resolveScreenBackground(
        { style: {}, props: { background: { kind: "hex", value: "#112233" } } },
        palette,
      ),
    ).toBe("#112233");
  });

  it("prefers style.background over props.background", () => {
    expect(
      resolveScreenBackground(
        {
          style: { background: { kind: "hex", value: "#aaaaaa" } },
          props: { background: { kind: "hex", value: "#bbbbbb" } },
        },
        palette,
      ),
    ).toBe("#aaaaaa");
  });

  it("returns black when drawBackground is false", () => {
    expect(
      resolveScreenBackground(
        {
          style: {
            drawBackground: false,
            background: { kind: "hex", value: "#abcdef" },
          },
        },
        palette,
      ),
    ).toBe("#000000");
  });

  it("returns black for null or undefined screen", () => {
    expect(resolveScreenBackground(null, palette)).toBe("#000000");
    expect(resolveScreenBackground(undefined, palette)).toBe("#000000");
  });

  it("returns canvas fallback when no background is set", () => {
    expect(resolveScreenBackground({ style: {} }, palette)).toBe(SCREEN_BACKGROUND_FALLBACK);
  });
});

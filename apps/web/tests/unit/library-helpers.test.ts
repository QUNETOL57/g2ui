import { describe, expect, it, vi } from "vitest";

import {
  findPresetIdForSize,
  formatEditedAt,
  orientSize,
  templateLabel,
} from "@pages/library/lib/library-helpers";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";

describe("orientSize", () => {
  it("returns landscape (max, min) when orientation is landscape", () => {
    expect(orientSize(160, 128, "landscape")).toEqual({ width: 160, height: 128 });
    expect(orientSize(128, 160, "landscape")).toEqual({ width: 160, height: 128 });
  });

  it("returns portrait (min, max) when orientation is portrait", () => {
    expect(orientSize(160, 128, "portrait")).toEqual({ width: 128, height: 160 });
    expect(orientSize(128, 160, "portrait")).toEqual({ width: 128, height: 160 });
  });

  it("returns the original when width === height", () => {
    expect(orientSize(128, 128, "landscape")).toEqual({ width: 128, height: 128 });
    expect(orientSize(128, 128, "portrait")).toEqual({ width: 128, height: 128 });
  });
});

describe("findPresetIdForSize", () => {
  it("matches a preset by min/max dimensions", () => {
    const preset = DISPLAY_PRESETS[0];
    expect(findPresetIdForSize(preset.width, preset.height)).toBe(preset.id);
    expect(findPresetIdForSize(preset.height, preset.width)).toBe(preset.id);
  });

  it("falls back to default for unknown sizes", () => {
    expect(findPresetIdForSize(11, 23)).toBe(DEFAULT_PRESET_ID);
  });
});

describe("formatEditedAt", () => {
  it("formats 1 minute ago", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    const oneMinAgo = new Date(now - 60_000);
    expect(formatEditedAt(oneMinAgo)).toBe("1 minute ago");
    vi.useRealTimers();
  });

  it("formats N minutes ago for older dates", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    expect(formatEditedAt(new Date(now - 5 * 60_000))).toBe("5 minutes ago");
    vi.useRealTimers();
  });

  it("clamps very recent edits to 1 minute ago", () => {
    const now = Date.now();
    vi.setSystemTime(now);
    expect(formatEditedAt(new Date(now))).toBe("1 minute ago");
    vi.useRealTimers();
  });
});

describe("templateLabel", () => {
  it("returns human-readable labels", () => {
    expect(templateLabel("hello")).toBe("Hello");
    expect(templateLabel("blank")).toBe("Blank");
  });
});

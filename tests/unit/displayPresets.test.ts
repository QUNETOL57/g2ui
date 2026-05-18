import { describe, expect, it } from "vitest";

import {
  DEFAULT_PRESET_ID,
  DISPLAY_PRESETS,
  presetForSize,
} from "@shared/config/displayPresets";

describe("DISPLAY_PRESETS", () => {
  it("contains the default id", () => {
    expect(DISPLAY_PRESETS.some((p) => p.id === DEFAULT_PRESET_ID)).toBe(true);
  });

  it("every preset has positive dimensions and unique id", () => {
    const ids = new Set<string>();
    for (const preset of DISPLAY_PRESETS) {
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.height).toBeGreaterThan(0);
      expect(preset.label).toBeTruthy();
      expect(ids.has(preset.id)).toBe(false);
      ids.add(preset.id);
    }
  });
});

describe("presetForSize", () => {
  it("returns matching preset", () => {
    const preset = DISPLAY_PRESETS[0];
    expect(presetForSize(preset.width, preset.height)).toEqual(preset);
  });

  it("returns null when no preset matches", () => {
    expect(presetForSize(7, 11)).toBeNull();
  });
});

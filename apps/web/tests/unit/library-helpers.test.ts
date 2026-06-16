import { describe, expect, it, vi } from "vitest";

import {
  copyProjectCard,
  findPresetIdForSize,
  formatEditedAt,
  orientSize,
  templateLabel,
  type ProjectCard,
} from "@pages/library/lib/library-helpers";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";
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

describe("copyProjectCard", () => {
  function makeCard(id: string, name = "Demo"): ProjectCard {
    const project = makeProjectFromTemplate({
      id,
      name,
      width: 160,
      height: 128,
      template: "blank",
    });
    return {
      id,
      name,
      width: 160,
      height: 128,
      template: "blank",
      updatedAt: new Date("2024-01-01"),
      project,
    };
  }

  it("clones project with a new id and copy suffix name", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-12T10:00:00Z"));
    const source = makeCard("p1", "Original");
    const copied = copyProjectCard(source);

    expect(copied.id).toBe(`project-${Date.now()}`);
    expect(copied.name).toBe("Original copy");
    expect(copied.width).toBe(source.width);
    expect(copied.height).toBe(source.height);
    expect(copied.template).toBe(source.template);
    expect(copied.updatedAt).toEqual(new Date("2026-06-12T10:00:00Z"));
    expect(copied.project.id).toBe(copied.id);
    expect(copied.project.name).toBe("Original copy");
    expect(copied.project).not.toBe(source.project);
    expect(copied.project.screens).toEqual(source.project.screens);
    vi.useRealTimers();
  });
});

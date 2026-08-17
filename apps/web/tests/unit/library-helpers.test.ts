import { describe, expect, it, vi } from "vitest";

import {
  copyProjectCard,
  createProjectCardFromSelection,
  findPresetIdForSize,
  formatEditedAt,
  listCustomTemplates,
  markProjectAsTemplate,
  normalizeCanvasViewSettings,
  orientSize,
  sortProjectCards,
  templateLabel,
  type ProjectCard,
} from "@pages/library/lib/library-helpers";
import {
  customTemplateSelection,
  makeProjectFromTemplate,
} from "@entities/ui-project/lib/projectTemplates";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";

import { makeLabel, withChildren } from "../fixtures/projects";

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
    expect(templateLabel("custom")).toBe("Custom");
    expect(templateLabel("custom", "Home")).toBe("Home");
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
      createdAt: new Date("2024-01-01"),
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
    expect(copied.createdAt).toEqual(new Date("2026-06-12T10:00:00Z"));
    expect(copied.updatedAt).toEqual(new Date("2026-06-12T10:00:00Z"));
    expect(copied.project.id).toBe(copied.id);
    expect(copied.project.name).toBe("Original copy");
    expect(copied.project).not.toBe(source.project);
    expect(copied.project.screens).toEqual(source.project.screens);
    vi.useRealTimers();
  });

  it("does not copy isTemplate onto the duplicate", () => {
    const source = makeCard("p1", "Original");
    source.isTemplate = true;
    source.template = "custom";
    source.sourceTemplateId = "tpl_1";
    const copied = copyProjectCard(source);
    expect(copied.isTemplate).toBe(false);
    expect(copied.template).toBe("custom");
    expect(copied.sourceTemplateId).toBe("tpl_1");
  });

  it("copies canvas overflow view settings onto the duplicate", () => {
    const source = makeCard("p1", "Original");
    source.allowCanvasOverflow = true;
    source.showFullWidgets = true;
    const copied = copyProjectCard(source);
    expect(copied.allowCanvasOverflow).toBe(true);
    expect(copied.showFullWidgets).toBe(true);
  });
});

describe("custom template helpers", () => {
  function makeCard(id: string, name = "Demo", extras: Partial<ProjectCard> = {}): ProjectCard {
    const project = makeProjectFromTemplate({
      id,
      name,
      width: 160,
      height: 128,
      template: extras.template ?? "blank",
    });
    return {
      id,
      name,
      width: 160,
      height: 128,
      template: "blank",
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      project,
      ...extras,
    };
  }

  it("lists only cards marked as templates", () => {
    const plain = makeCard("p1", "Plain");
    const marked = makeCard("p2", "Tpl", { isTemplate: true });
    expect(listCustomTemplates([plain, marked])).toEqual([marked]);
  });

  it("toggles isTemplate without changing project JSON", () => {
    const card = makeCard("p1", "Tpl", { isTemplate: true });
    const before = JSON.stringify(card.project);
    const unmarked = markProjectAsTemplate(card, false);
    expect(unmarked.isTemplate).toBe(false);
    expect(JSON.stringify(unmarked.project)).toBe(before);
  });

  it("creates a snapshot copy from a custom template and ignores later source edits", () => {
    const sourceProject = withChildren(
      makeProjectFromTemplate({
        id: "src",
        name: "SourceTpl",
        width: 160,
        height: 128,
        template: "blank",
      }),
      [makeLabel("l_src", "KeepMe")],
    );
    const source = makeCard("src", "SourceTpl", {
      isTemplate: true,
      project: sourceProject,
    });
    const child = createProjectCardFromSelection({
      selection: customTemplateSelection(source.id),
      projects: [source],
      name: "Child",
      width: 160,
      height: 128,
      createdAt: new Date("2026-06-12T10:00:00Z"),
    });

    expect(child.isTemplate).toBe(false);
    expect(child.template).toBe("custom");
    expect(child.sourceTemplateId).toBe("src");
    expect(child.project).not.toBe(source.project);

    const sourceLabel = source.project.screens[0].children?.[0];
    if (sourceLabel?.type === "label") {
      sourceLabel.props = { ...sourceLabel.props, text: "Mutated" };
    }
    markProjectAsTemplate(source, false);

    const childLabel = child.project.screens[0].children?.[0];
    expect(childLabel?.type === "label" ? childLabel.props.text : null).toBe("KeepMe");
    expect(JSON.stringify(child.project.screens)).not.toBe(JSON.stringify(source.project.screens));
  });

  it("falls back to blank when the custom source is missing", () => {
    const child = createProjectCardFromSelection({
      selection: customTemplateSelection("gone"),
      projects: [],
      name: "Orphan",
      width: 160,
      height: 128,
      createdAt: new Date("2026-06-12T10:00:00Z"),
    });
    expect(child.template).toBe("blank");
    expect(child.sourceTemplateId).toBeUndefined();
    expect(child.isTemplate).toBe(false);
    expect(child.project.screens[0].children).toEqual([]);
  });
});

describe("sortProjectCards", () => {
  function makeCard(
    id: string,
    name: string,
    createdAt: string,
    updatedAt: string,
  ): ProjectCard {
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
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      project,
    };
  }

  it("defaults to last edited, newest first", () => {
    const olderEdit = makeCard("a", "A", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");
    const newerEdit = makeCard("b", "B", "2025-01-01T00:00:00Z", "2026-06-01T00:00:00Z");
    expect(sortProjectCards([olderEdit, newerEdit]).map((card) => card.id)).toEqual(["b", "a"]);
  });

  it("sorts by date created when requested", () => {
    const createdFirst = makeCard("a", "A", "2025-01-01T00:00:00Z", "2026-06-01T00:00:00Z");
    const createdLater = makeCard("b", "B", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");
    expect(
      sortProjectCards([createdFirst, createdLater], "createdAt").map((card) => card.id),
    ).toEqual(["b", "a"]);
  });

  it("sorts oldest first when direction is asc", () => {
    const olderEdit = makeCard("a", "A", "2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z");
    const newerEdit = makeCard("b", "B", "2025-01-01T00:00:00Z", "2026-06-01T00:00:00Z");
    expect(sortProjectCards([olderEdit, newerEdit], "updatedAt", "asc").map((card) => card.id)).toEqual(
      ["a", "b"],
    );
  });
});

describe("normalizeCanvasViewSettings", () => {
  it("defaults both flags to false", () => {
    expect(normalizeCanvasViewSettings(undefined)).toEqual({
      allowCanvasOverflow: false,
      showFullWidgets: false,
    });
  });

  it("clears showFullWidgets when overflow is off", () => {
    expect(
      normalizeCanvasViewSettings({ allowCanvasOverflow: false, showFullWidgets: true }),
    ).toEqual({
      allowCanvasOverflow: false,
      showFullWidgets: false,
    });
  });

  it("keeps showFullWidgets only with overflow", () => {
    expect(
      normalizeCanvasViewSettings({ allowCanvasOverflow: true, showFullWidgets: true }),
    ).toEqual({
      allowCanvasOverflow: true,
      showFullWidgets: true,
    });
  });
});

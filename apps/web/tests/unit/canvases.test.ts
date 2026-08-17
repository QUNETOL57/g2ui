import { describe, expect, it } from "vitest";

import {
  canvasToProjectCard,
  normalizeTemplate,
  projectCardToPayload,
  type CanvasRecord,
} from "@shared/api/canvases";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";
import type { ProjectCard } from "@pages/library/lib/library-helpers";

function makeCard(): ProjectCard {
  const project = makeProjectFromTemplate({
    id: "src",
    name: "Dashboard",
    width: 160,
    height: 128,
    template: "blank",
  });
  return {
    id: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    name: "Dashboard",
    width: 160,
    height: 128,
    template: "custom",
    isTemplate: true,
    sourceTemplateId: "src_1",
    createdAt: new Date("2026-06-12T10:00:00Z"),
    updatedAt: new Date("2026-06-12T10:00:00Z"),
    allowCanvasOverflow: true,
    showFullWidgets: true,
    project,
  };
}

function recordFromCard(card: ProjectCard): CanvasRecord {
  const payload = projectCardToPayload(card);
  return {
    id: card.id,
    owner_id: "owner-1",
    title: payload.title,
    content: JSON.parse(JSON.stringify(payload.content)),
    settings: JSON.parse(JSON.stringify(payload.settings)),
    schema_version: 1,
    created_at: "2026-06-12T10:00:00.000Z",
    updated_at: "2026-06-12T10:00:00.000Z",
  };
}

describe("normalizeTemplate", () => {
  it("keeps built-in and custom template ids", () => {
    expect(normalizeTemplate("hello")).toBe("hello");
    expect(normalizeTemplate("blank")).toBe("blank");
    expect(normalizeTemplate("custom")).toBe("custom");
  });

  it("preserves custom origin when the template value is unknown", () => {
    expect(normalizeTemplate("legacy-id", "src_1")).toBe("custom");
    expect(normalizeTemplate("legacy-id")).toBe("blank");
  });
});

describe("canvas settings mapping", () => {
  it("round-trips isTemplate, sourceTemplateId and custom template", () => {
    const card = makeCard();
    const restored = canvasToProjectCard(recordFromCard(card));

    expect(restored).not.toBeNull();
    expect(restored?.template).toBe("custom");
    expect(restored?.isTemplate).toBe(true);
    expect(restored?.sourceTemplateId).toBe("src_1");
    expect(restored?.name).toBe("Dashboard");
    expect(restored?.createdAt).toEqual(new Date("2026-06-12T10:00:00.000Z"));
    expect(restored?.updatedAt).toEqual(new Date("2026-06-12T10:00:00.000Z"));
  });

  it("round-trips canvas overflow view settings", () => {
    const card = makeCard();
    const restored = canvasToProjectCard(recordFromCard(card));
    expect(restored?.allowCanvasOverflow).toBe(true);
    expect(restored?.showFullWidgets).toBe(true);
  });

  it("drops showFullWidgets when overflow is off", () => {
    const card = makeCard();
    card.allowCanvasOverflow = false;
    card.showFullWidgets = true;
    const restored = canvasToProjectCard(recordFromCard(card));
    expect(restored?.allowCanvasOverflow).toBe(false);
    expect(restored?.showFullWidgets).toBe(false);
  });

  it("does not drop custom origin when template is missing but sourceTemplateId is set", () => {
    const card = makeCard();
    const record = recordFromCard(card);
    delete record.settings.template;
    const restored = canvasToProjectCard(record);
    expect(restored?.template).toBe("custom");
    expect(restored?.sourceTemplateId).toBe("src_1");
  });
});

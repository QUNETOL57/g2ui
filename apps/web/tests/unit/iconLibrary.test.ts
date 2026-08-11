import { describe, expect, it } from "vitest";

import { getIconDefinition, ICON_GROUPS, ICON_LIBRARY } from "@entities/icon/iconLibrary";
import { PIXELARTICONS_LIBRARY } from "@entities/icon/pixelarticonsLibraryData";
import {
  getResolvedIconDefinition,
  normalizeIconFrame,
} from "@entities/icon/iconSizing";

describe("pixelarticons library", () => {
  it("includes the full free Base set under pa_ ids", () => {
    expect(PIXELARTICONS_LIBRARY.length).toBe(877);
    expect(ICON_LIBRARY.length).toBeGreaterThanOrEqual(877);
    const pa = ICON_LIBRARY.filter((icon) => icon.id.startsWith("pa_"));
    expect(pa).toHaveLength(877);
  });

  it("splits pixelarticons into regular and sharp browser groups", () => {
    const regular = ICON_GROUPS.find(([name]) => name === "Pixelarticons");
    const sharp = ICON_GROUPS.find(([name]) => name === "Pixelarticons Sharp");
    expect(regular?.[1]).toHaveLength(564);
    expect(sharp?.[1]).toHaveLength(313);
    expect(regular?.[1].every((icon) => !icon.id.endsWith("_sharp"))).toBe(true);
    expect(sharp?.[1].every((icon) => icon.id.endsWith("_sharp"))).toBe(true);
  });

  it("resolves sample pixelarticons entries as 16×16 bitmaps", () => {
    for (const id of [
      "pa_thermometer",
      "pa_fire",
      "pa_scale",
      "pa_arrow_up",
      "pa_chevron_right",
      "pa_album_sharp",
    ]) {
      const icon = getIconDefinition(id);
      expect(icon, id).toBeDefined();
      expect(icon?.width).toBe(16);
      expect(icon?.height).toBe(16);
      expect(icon?.rows).toHaveLength(16);
      expect(icon?.rows.some((row) => row !== 0)).toBe(true);
    }
  });

  it("snaps frames for a 16×16 pixelarticon", () => {
    const frame = normalizeIconFrame("pa_thermometer", {
      x: 0,
      y: 0,
      width: 50,
      height: 55,
    });
    expect(frame.width % 16).toBe(0);
    expect(frame.height % 16).toBe(0);
  });
});

describe("builtin icons remain available", () => {
  it("still resolves legacy ids", () => {
    expect(getResolvedIconDefinition("weather_temperature").id).toBe("weather_temperature");
    expect(getIconDefinition("arrow_up")?.id).toBe("arrow_up");
    expect(getIconDefinition("chevron_right")?.id).toBe("chevron_right");
  });

  it("includes a 16×16 QR code icon with finder patterns", () => {
    const icon = getIconDefinition("qr_code");
    expect(icon).toMatchObject({ id: "qr_code", group: "QR", width: 16, height: 16 });
    expect(icon?.rows).toHaveLength(16);
    // Three classic finder corners are filled outer rings.
    expect(icon?.rows[0] & 0xfe00).toBe(0xfe00); // top-left finder top
    expect(icon?.rows[0] & 0x007f).toBe(0x007f); // top-right finder top
    expect(icon?.rows[15] & 0xfe00).toBe(0xfe00); // bottom-left finder bottom
    const files = ICON_GROUPS.find(([name]) => name === "Files & Data");
    expect(files?.[1].some((entry) => entry.id === "qr_code")).toBe(true);
  });

  it("includes filled nav triangles in Navigation", () => {
    const expected = {
      nav_triangle_right: { width: 5, height: 10, rows: [0x0010, 0x0018, 0x001c, 0x001e, 0x001f, 0x001f, 0x001e, 0x001c, 0x0018, 0x0010] },
      nav_triangle_left: { width: 5, height: 10, rows: [0x0001, 0x0003, 0x0007, 0x000f, 0x001f, 0x001f, 0x000f, 0x0007, 0x0003, 0x0001] },
      nav_triangle_up: { width: 10, height: 5, rows: [0x0030, 0x0078, 0x00fc, 0x01fe, 0x03ff] },
      nav_triangle_down: { width: 10, height: 5, rows: [0x03ff, 0x01fe, 0x00fc, 0x0078, 0x0030] },
    } as const;

    for (const [id, shape] of Object.entries(expected)) {
      const icon = getIconDefinition(id);
      expect(icon, id).toMatchObject({ id, group: "Navigation", ...shape });
      expect(icon?.rows).toHaveLength(shape.height);
    }

    const navigation = ICON_GROUPS.find(([name]) => name === "Navigation");
    for (const id of Object.keys(expected)) {
      expect(navigation?.[1].some((icon) => icon.id === id)).toBe(true);
    }
  });

  it("includes detailed 16×16 scale icons in Objects & Misc", () => {
    const ids = [
      "scale_floor",
      "scale_kitchen",
      "scale_gauge",
      "scale_weight",
      "scale_weight_fill",
      "scale_balance",
      "scale_balance_left",
      "scale_balance_right",
    ] as const;

    for (const id of ids) {
      const icon = getIconDefinition(id);
      expect(icon, id).toMatchObject({ id, group: "Scales", width: 16, height: 16 });
      expect(icon?.rows).toHaveLength(16);
      expect(icon?.rows.some((row) => row !== 0)).toBe(true);
    }

    const objects = ICON_GROUPS.find(([name]) => name === "Objects & Misc");
    for (const id of ids) {
      expect(objects?.[1].some((icon) => icon.id === id)).toBe(true);
    }

    // Square weight has no letter pixels in the body interior (hollow).
    const weight = getIconDefinition("scale_weight")!;
    expect(weight.rows.slice(6, 13).every((row) => row === 0x8001)).toBe(true);

    // Balance tilt variants are horizontal mirrors of each other.
    const left = getIconDefinition("scale_balance_left")!;
    const right = getIconDefinition("scale_balance_right")!;
    const mirrorRow = (row: number) => {
      let out = 0;
      for (let x = 0; x < 16; x += 1) {
        if (row & (1 << (15 - x))) out |= 1 << x;
      }
      return out;
    };
    expect(right.rows).toEqual(left.rows.map(mirrorRow));
  });
});

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
});

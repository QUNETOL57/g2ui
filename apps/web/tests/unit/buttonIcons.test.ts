import { describe, expect, it } from "vitest";

import {
  buttonIconsWritePatch,
  createDefaultButtonIconSlot,
  DEFAULT_BUTTON_ICON_ID,
  resolveButtonIcons,
} from "@entities/ui-project/lib/buttonIcons";

describe("resolveButtonIcons", () => {
  it("returns icons array when present", () => {
    expect(
      resolveButtonIcons({
        icons: [{ iconId: "earth", position: "right" }],
        iconId: "chart",
      }),
    ).toEqual([{ iconId: "earth", position: "right" }]);
  });

  it("prefers icons even when empty over legacy iconId", () => {
    expect(resolveButtonIcons({ icons: [], iconId: "earth" })).toEqual([]);
  });

  it("returns empty when neither icons nor legacy iconId are set", () => {
    expect(resolveButtonIcons({})).toEqual([]);
  });

  it("maps legacy iconGap into padding toward the text for every position", () => {
    expect(
      resolveButtonIcons({ iconId: "earth", iconPosition: "left", iconGap: 4 }),
    ).toEqual([{ iconId: "earth", position: "left", paddingRight: 4 }]);

    expect(
      resolveButtonIcons({ iconId: "earth", iconPosition: "right", iconGap: 3 }),
    ).toEqual([{ iconId: "earth", position: "right", paddingLeft: 3 }]);

    expect(
      resolveButtonIcons({ iconId: "earth", iconPosition: "top", iconGap: 5 }),
    ).toEqual([{ iconId: "earth", position: "top", paddingBottom: 5 }]);

    expect(
      resolveButtonIcons({ iconId: "earth", iconPosition: "bottom", iconGap: 1 }),
    ).toEqual([{ iconId: "earth", position: "bottom", paddingTop: 1 }]);
  });

  it("defaults legacy position to left and gap to 2", () => {
    expect(resolveButtonIcons({ iconId: "chart" })).toEqual([
      { iconId: "chart", position: "left", paddingRight: 2 },
    ]);
  });

  it("clamps negative legacy iconGap to 0", () => {
    expect(
      resolveButtonIcons({ iconId: "earth", iconPosition: "left", iconGap: -8 }),
    ).toEqual([{ iconId: "earth", position: "left", paddingRight: 0 }]);
  });

  it("preserves color and padding fields already on icons[]", () => {
    expect(
      resolveButtonIcons({
        icons: [
          {
            iconId: "earth",
            position: "left",
            color: { kind: "hex", value: "#00FF00" },
            paddingTop: 1,
            paddingRight: 2,
            paddingBottom: 3,
            paddingLeft: 4,
          },
        ],
      }),
    ).toEqual([
      {
        iconId: "earth",
        position: "left",
        color: { kind: "hex", value: "#00FF00" },
        paddingTop: 1,
        paddingRight: 2,
        paddingBottom: 3,
        paddingLeft: 4,
      },
    ]);
  });
});

describe("createDefaultButtonIconSlot", () => {
  it("defaults to earth on the left with padding toward text", () => {
    expect(createDefaultButtonIconSlot()).toEqual({
      iconId: DEFAULT_BUTTON_ICON_ID,
      position: "left",
      paddingRight: 2,
    });
  });

  it("sets padding toward text for each position", () => {
    expect(createDefaultButtonIconSlot("right")).toEqual({
      iconId: "earth",
      position: "right",
      paddingLeft: 2,
    });
    expect(createDefaultButtonIconSlot("top")).toEqual({
      iconId: "earth",
      position: "top",
      paddingBottom: 2,
    });
    expect(createDefaultButtonIconSlot("bottom")).toEqual({
      iconId: "earth",
      position: "bottom",
      paddingTop: 2,
    });
  });
});

describe("buttonIconsWritePatch", () => {
  it("writes icons and clears legacy single-icon fields", () => {
    expect(buttonIconsWritePatch([{ iconId: "earth", position: "left" }])).toEqual({
      icons: [{ iconId: "earth", position: "left" }],
      iconId: undefined,
      iconPosition: undefined,
      iconGap: undefined,
    });
  });

  it("can write an empty icons array", () => {
    expect(buttonIconsWritePatch([])).toEqual({
      icons: [],
      iconId: undefined,
      iconPosition: undefined,
      iconGap: undefined,
    });
  });
});

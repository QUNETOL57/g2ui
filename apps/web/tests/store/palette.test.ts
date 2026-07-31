import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";

import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("store: setPalette", () => {
  it("updates palette and records history", () => {
    const before = get().project.palette;
    const next = [
      { token: "bg", hex: "#101010" },
      { token: "fg", hex: "#EEEEEE" },
      { token: "accent", hex: "#FF5500" },
    ];
    get().setPalette(next);
    const state = get();
    expect(state.project.palette).toEqual(next);
    expect(state.historyPast).toHaveLength(1);
    expect(state.historyPast[0].project.palette).toEqual(before);
    expect(state.lastError).toBeNull();
  });

  it("normalizes hex values on commit", () => {
    get().setPalette([
      { token: "bg", hex: "ff00aa" },
      { token: "fg", hex: "#ffffff" },
    ]);
    expect(get().project.palette).toEqual([
      { token: "bg", hex: "#FF00AA" },
      { token: "fg", hex: "#FFFFFF" },
    ]);
  });

  it("rejects invalid palette and sets lastError without mutating project", () => {
    const before = get().project.palette;
    get().setPalette([
      { token: "bg", hex: "#000000" },
      { token: "bg", hex: "#111111" },
    ]);
    const state = get();
    expect(state.project.palette).toEqual(before);
    expect(state.lastError).toMatch(/Duplicate token/i);
    expect(state.historyPast).toHaveLength(0);
  });

  it("skips history when palette is unchanged", () => {
    const palette = get().project.palette ?? [];
    get().setPalette(palette);
    expect(get().historyPast).toHaveLength(0);
  });

  it("renames token refs across the project when remaps are provided", () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "bg" } });
    get().addWidget("screen_main", "label");
    const labelId = get().project.screens[0].children?.[0]?.id;
    expect(labelId).toBeTruthy();
    get().updateStyle(labelId!, { textColor: { kind: "token", token: "bg" } });

    get().setPalette(
      [
        { token: "surface", hex: "#000000" },
        { token: "fg", hex: "#FFFFFF" },
        { token: "accent", hex: "#1E90FF" },
      ],
      { remaps: [{ from: "bg", to: { kind: "token", token: "surface" } }] },
    );

    const project = get().project;
    expect(project.palette?.[0]?.token).toBe("surface");
    expect(project.screens[0].style?.background).toEqual({ kind: "token", token: "surface" });
    expect(project.screens[0].children?.[0]?.style?.textColor).toEqual({
      kind: "token",
      token: "surface",
    });
  });

  it("replaces deleted token refs with the token hex value", () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "accent" } });
    get().setPalette(
      [
        { token: "bg", hex: "#000000" },
        { token: "fg", hex: "#FFFFFF" },
      ],
      { remaps: [{ from: "accent", to: { kind: "hex", value: "#1E90FF" } }] },
    );
    expect(get().project.screens[0].style?.background).toEqual({
      kind: "hex",
      value: "#1E90FF",
    });
  });

  it("remaps nested panel descendants and pressedBackground", () => {
    get().addWidget("screen_main", "panel");
    const panelId = get().project.screens[0].children?.[0]?.id!;
    const labelId = get().addWidget(panelId, "label")!;
    const buttonId = get().addWidget(panelId, "button")!;
    get().updateStyle(labelId, {
      textColor: { kind: "token", token: "accent" },
      borderColor: { kind: "token", token: "accent" },
    });
    get().updateProps(buttonId, { pressedBackground: { kind: "token", token: "accent" } });
    get().updateProps("screen_main", { background: { kind: "token", token: "accent" } });

    get().setPalette(
      [
        { token: "bg", hex: "#000000" },
        { token: "fg", hex: "#FFFFFF" },
      ],
      { remaps: [{ from: "accent", to: { kind: "hex", value: "#334455" } }] },
    );

    const project = get().project;
    const frozen = { kind: "hex", value: "#334455" };
    expect(project.screens[0].props).toMatchObject({ background: frozen });
    expect(findNode(project, labelId)?.style?.textColor).toEqual(frozen);
    expect(findNode(project, labelId)?.style?.borderColor).toEqual(frozen);
    expect(findNode(project, buttonId)?.props).toMatchObject({ pressedBackground: frozen });
  });

  it("renames marker style token refs", () => {
    get().updateMarkerStyle({ color: { kind: "token", token: "bg" } });
    get().setPalette(
      [
        { token: "surface", hex: "#000000" },
        { token: "fg", hex: "#FFFFFF" },
        { token: "accent", hex: "#1E90FF" },
      ],
      { remaps: [{ from: "bg", to: { kind: "token", token: "surface" } }] },
    );
    expect(get().markerStyle.color).toEqual({ kind: "token", token: "surface" });
  });

  it("records history when remaps change references without changing palette JSON", () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "bg" } });
    const palette = [
      { token: "bg", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
      { token: "accent", hex: "#1E90FF" },
    ];
    get().setPalette(palette);
    expect(get().historyPast).toHaveLength(1);

    get().setPalette(palette, {
      remaps: [{ from: "bg", to: { kind: "hex", value: "#000000" } }],
    });
    expect(get().historyPast).toHaveLength(2);
    expect(get().project.screens[0].style?.background).toEqual({
      kind: "hex",
      value: "#000000",
    });
  });

  it("undo restores palette token references after a delete remap", () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "accent" } });
    get().setPalette(
      [
        { token: "bg", hex: "#000000" },
        { token: "fg", hex: "#FFFFFF" },
      ],
      { remaps: [{ from: "accent", to: { kind: "hex", value: "#1E90FF" } }] },
    );
    expect(get().project.screens[0].style?.background).toEqual({
      kind: "hex",
      value: "#1E90FF",
    });

    get().undo();
    expect(get().project.palette?.some((entry) => entry.token === "accent")).toBe(true);
    expect(get().project.screens[0].style?.background).toEqual({
      kind: "token",
      token: "accent",
    });
  });
});

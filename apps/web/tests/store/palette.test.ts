import { beforeEach, describe, expect, it } from "vitest";

import { useEditorStore } from "@entities/ui-project/model/store";

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
});

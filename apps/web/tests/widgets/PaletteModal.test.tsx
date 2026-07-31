import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { blankProject } from "@entities/ui-project/samples/hello";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import type { UiProject } from "@entities/ui-project";
import { PaletteModal } from "@widgets/palette-panel/PaletteModal";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";

import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

function findChildStyle(project: UiProject, id: string) {
  return findNode(project, id)?.style;
}

function findChildProps(project: UiProject, id: string) {
  return findNode(project, id)?.props;
}

async function openPaletteModal() {
  render(<EditorStatusBar />);
  await userEvent.click(screen.getByRole("button", { name: /^Palette$/ }));
}

beforeEach(() => {
  resetEditorStore();
});

describe("PaletteModal", () => {
  it("opens from the status bar", async () => {
    await openPaletteModal();
    expect(screen.getByText(/Manage named color tokens/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Token name for bg/i)).toBeInTheDocument();
  });

  it("closes via the close button", async () => {
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Close palette dialog/i }));
    expect(screen.queryByText(/Manage named color tokens/i)).not.toBeInTheDocument();
  });

  it("shows empty state when palette has no tokens", () => {
    const project = blankProject();
    project.palette = [];
    resetEditorStore(project);
    render(<PaletteModal open onClose={() => undefined} />);
    expect(screen.getByText(/No palette tokens yet/i)).toBeInTheDocument();
  });

  it("adds a palette token", async () => {
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Add color/i }));
    expect(get().project.palette?.some((entry) => entry.token === "color_1")).toBe(true);
  });

  it("updates hex on blur", async () => {
    await openPaletteModal();
    const hexInput = screen.getByLabelText(/Hex value for bg/i);
    await userEvent.clear(hexInput);
    await userEvent.type(hexInput, "#112233");
    fireEvent.blur(hexInput);
    expect(get().project.palette?.find((entry) => entry.token === "bg")?.hex).toBe("#112233");
  });

  it("keeps focus while renaming a token", async () => {
    await openPaletteModal();
    const tokenInput = screen.getByLabelText(/Token name for bg/i);
    tokenInput.focus();
    await userEvent.type(tokenInput, "_surface");
    expect(tokenInput).toHaveFocus();
    expect(tokenInput).toHaveValue("bg_surface");
  });

  it("syncs draft when store palette changes", () => {
    get().setPalette([
      { token: "surface", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
    ]);
    render(<PaletteModal open onClose={() => undefined} />);
    expect(screen.getByLabelText(/Token name for surface/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hex value for surface/i)).toHaveValue("#000000");
  });

  it("updates color from the swatch picker", async () => {
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Color swatch for bg picker/i }));
    const hexInput = screen.getByLabelText(/Color swatch for bg$/i);
    await userEvent.clear(hexInput);
    await userEvent.paste("#aabbcc");
    expect(get().project.palette?.find((entry) => entry.token === "bg")?.hex).toBe("#AABBCC");
  });

  it("asks for confirmation before deleting a palette entry", async () => {
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Delete accent/i }));
    expect(screen.getByRole("heading", { name: /Delete token\?/i })).toBeInTheDocument();
    expect(get().project.palette?.some((entry) => entry.token === "accent")).toBe(true);

    await userEvent.click(screen.getByRole("button", { name: /^Cancel$/i }));
    expect(screen.queryByRole("heading", { name: /Delete token\?/i })).not.toBeInTheDocument();
    expect(get().project.palette?.some((entry) => entry.token === "accent")).toBe(true);
  });

  it("deletes a palette entry after confirmation and freezes usages as hex", async () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "accent" } });
    const accentHex = get().project.palette?.find((entry) => entry.token === "accent")?.hex;
    expect(accentHex).toBeTruthy();
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Delete accent/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Delete$/i }));
    expect(get().project.palette?.some((entry) => entry.token === "accent")).toBe(false);
    expect(get().project.palette).toHaveLength(2);
    expect(get().project.screens[0].style?.background).toEqual({
      kind: "hex",
      value: accentHex,
    });
  });

  it("remaps widget token refs when a palette token is renamed", async () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "bg" } });
    await openPaletteModal();
    const tokenInput = screen.getByLabelText(/Token name for bg/i);
    await userEvent.clear(tokenInput);
    await userEvent.type(tokenInput, "surface");
    fireEvent.blur(tokenInput);
    expect(get().project.palette?.some((entry) => entry.token === "surface")).toBe(true);
    expect(get().project.palette?.some((entry) => entry.token === "bg")).toBe(false);
    expect(get().project.screens[0].style?.background).toEqual({
      kind: "token",
      token: "surface",
    });
  });

  it("does not commit invalid hex edits", async () => {
    const before = get().project.palette;
    await openPaletteModal();
    const hexInput = screen.getByLabelText(/Hex value for fg/i);
    await userEvent.clear(hexInput);
    await userEvent.type(hexInput, "not-a-color");
    fireEvent.blur(hexInput);
    expect(get().project.palette).toEqual(before);
  });

  it("shows Name and Hex column headers without Color", async () => {
    await openPaletteModal();
    expect(screen.getByText(/^Name$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Hex$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Color$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Token$/i)).not.toBeInTheDocument();
  });

  it("cancels pending delete on Escape and keeps the token", async () => {
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Delete accent/i }));
    expect(screen.getByRole("heading", { name: /Delete token\?/i })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("heading", { name: /Delete token\?/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Token name for accent/i)).toBeInTheDocument();
    expect(get().project.palette?.some((entry) => entry.token === "accent")).toBe(true);
  });

  it("explains that delete keeps the current hex as a plain value", async () => {
    get().setPalette([
      { token: "bg", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
      { token: "accent", hex: "#AABBCC" },
    ]);
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Delete accent/i }));
    expect(screen.getByText(/keep color #AABBCC as a plain hex value/i)).toBeInTheDocument();
  });

  it("freezes nested widget and button token usages as the deleted token hex", async () => {
    get().setPalette([
      { token: "bg", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
      { token: "accent", hex: "#334455" },
    ]);
    get().updateStyle("screen_main", {
      background: { kind: "token", token: "accent" },
      borderColor: { kind: "token", token: "accent" },
    });
    get().updateProps("screen_main", { background: { kind: "token", token: "accent" } });
    const labelId = get().addWidget("screen_main", "label")!;
    get().updateStyle(labelId, {
      textColor: { kind: "token", token: "accent" },
      background: { kind: "token", token: "fg" },
    });
    const buttonId = get().addWidget("screen_main", "button")!;
    get().updateStyle(buttonId, { background: { kind: "token", token: "accent" } });
    get().updateProps(buttonId, { pressedBackground: { kind: "token", token: "accent" } });

    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Delete accent/i }));
    await userEvent.click(screen.getByRole("button", { name: /^Delete$/i }));

    const project = get().project;
    const frozen = { kind: "hex", value: "#334455" };
    expect(project.screens[0].style?.background).toEqual(frozen);
    expect(project.screens[0].style?.borderColor).toEqual(frozen);
    expect(project.screens[0].props).toMatchObject({ background: frozen });
    expect(findChildStyle(project, labelId)?.textColor).toEqual(frozen);
    expect(findChildStyle(project, labelId)?.background).toEqual({ kind: "token", token: "fg" });
    expect(findChildStyle(project, buttonId)?.background).toEqual(frozen);
    expect(findChildProps(project, buttonId)).toMatchObject({ pressedBackground: frozen });
  });

  it("remaps nested widget token refs when renaming a palette token", async () => {
    const labelId = get().addWidget("screen_main", "label")!;
    get().updateStyle(labelId, {
      textColor: { kind: "token", token: "bg" },
      borderColor: { kind: "token", token: "bg" },
    });
    get().updateProps("screen_main", { background: { kind: "token", token: "bg" } });

    await openPaletteModal();
    const tokenInput = screen.getByLabelText(/Token name for bg/i);
    await userEvent.clear(tokenInput);
    await userEvent.type(tokenInput, "surface");
    fireEvent.blur(tokenInput);

    expect(get().project.screens[0].props).toMatchObject({
      background: { kind: "token", token: "surface" },
    });
    expect(findChildStyle(get().project, labelId)?.textColor).toEqual({
      kind: "token",
      token: "surface",
    });
    expect(findChildStyle(get().project, labelId)?.borderColor).toEqual({
      kind: "token",
      token: "surface",
    });
  });

  it("does not rename a token to a duplicate name", async () => {
    get().updateStyle("screen_main", { background: { kind: "token", token: "bg" } });
    await openPaletteModal();
    const tokenInput = screen.getByLabelText(/Token name for bg/i);
    await userEvent.clear(tokenInput);
    await userEvent.type(tokenInput, "fg");
    fireEvent.blur(tokenInput);
    expect(get().project.palette?.some((entry) => entry.token === "bg")).toBe(true);
    expect(get().project.screens[0].style?.background).toEqual({ kind: "token", token: "bg" });
  });

  it("does not use a native color input for swatches", async () => {
    await openPaletteModal();
    expect(document.querySelector('input[type="color"]')).toBeNull();
    expect(screen.getByRole("button", { name: /Color swatch for bg picker/i })).toBeInTheDocument();
  });

  it("shows token count in the hint", async () => {
    await openPaletteModal();
    expect(screen.getByText(/^3 tokens$/i)).toBeInTheDocument();
  });
});

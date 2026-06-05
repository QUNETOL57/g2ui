import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { blankProject } from "@entities/ui-project/samples/hello";
import { useEditorStore } from "@entities/ui-project/model/store";
import { PaletteModal } from "@widgets/palette-panel/PaletteModal";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";

import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

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

  it("syncs draft when store palette changes", () => {
    get().setPalette([
      { token: "surface", hex: "#000000" },
      { token: "fg", hex: "#FFFFFF" },
    ]);
    render(<PaletteModal open onClose={() => undefined} />);
    expect(screen.getByLabelText(/Token name for surface/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Hex value for surface/i)).toHaveValue("#000000");
  });

  it("updates color from the swatch input", async () => {
    await openPaletteModal();
    const swatch = screen.getByLabelText(/Color swatch for bg/i);
    fireEvent.change(swatch, { target: { value: "#aabbcc" } });
    expect(get().project.palette?.find((entry) => entry.token === "bg")?.hex).toBe("#AABBCC");
  });

  it("deletes a palette entry", async () => {
    await openPaletteModal();
    await userEvent.click(screen.getByRole("button", { name: /Delete accent/i }));
    expect(get().project.palette?.some((entry) => entry.token === "accent")).toBe(false);
    expect(get().project.palette).toHaveLength(2);
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

  it("shows token count in the hint", async () => {
    await openPaletteModal();
    expect(screen.getByText(/^3 tokens$/i)).toBeInTheDocument();
  });
});

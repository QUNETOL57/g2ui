import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { EditorMenu } from "@widgets/editor-menu/EditorMenu";

import { resetEditorStore } from "../fixtures/store";

beforeEach(() => {
  resetEditorStore();
});

describe("EditorMenu", () => {
  it("opens Project menu with project actions", async () => {
    const back = vi.fn();
    render(<EditorMenu onBackToLibrary={back} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    expect(screen.getByRole("menuitem", { name: "Back to library" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Export…" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Import…" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit palette…" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: "Back to library" }));
    expect(back).toHaveBeenCalled();
  });

  it("disables undo when history is empty", async () => {
    render(<EditorMenu onBackToLibrary={() => undefined} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByRole("menuitem", { name: /Undo/ })).toBeDisabled();
  });

  it("opens View menu with checked display settings", async () => {
    render(
      <EditorMenu
        onBackToLibrary={() => undefined}
        viewSettings={{
          showGrid: true,
          showRulers: false,
          showGuides: true,
          onToggleGrid: vi.fn(),
          onToggleRulers: vi.fn(),
          onToggleGuides: vi.fn(),
        }}
      />,
    );

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Rulers" })).toHaveAttribute("aria-checked", "false");
    expect(screen.getByRole("menuitemcheckbox", { name: "Guides" })).toHaveAttribute("aria-checked", "true");
  });

  it("toggles display settings from View menu", async () => {
    const onToggleGrid = vi.fn();
    const onToggleRulers = vi.fn();
    const onToggleGuides = vi.fn();
    render(
      <EditorMenu
        onBackToLibrary={() => undefined}
        viewSettings={{
          showGrid: true,
          showRulers: true,
          showGuides: true,
          onToggleGrid,
          onToggleRulers,
          onToggleGuides,
        }}
      />,
    );

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Grid" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Rulers" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Guides" }));

    expect(onToggleGrid).toHaveBeenCalledTimes(1);
    expect(onToggleRulers).toHaveBeenCalledTimes(1);
    expect(onToggleGuides).toHaveBeenCalledTimes(1);
  });

  it("shows a side preview when hovering View settings", async () => {
    render(
      <EditorMenu
        onBackToLibrary={() => undefined}
        viewSettings={{
          showGrid: true,
          showRulers: true,
          showGuides: true,
          onToggleGrid: vi.fn(),
          onToggleRulers: vi.fn(),
          onToggleGuides: vi.fn(),
        }}
      />,
    );

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    await userEvent.hover(screen.getByRole("menuitemcheckbox", { name: "Guides" }));

    expect(screen.getByTestId("view-setting-preview")).toHaveTextContent("Guides");
    expect(screen.getByText(/alignment guide lines/i)).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
  });

  it("renders grid preview with the canvas grid pattern", async () => {
    render(
      <EditorMenu
        onBackToLibrary={() => undefined}
        viewSettings={{
          showGrid: true,
          showRulers: true,
          showGuides: true,
          onToggleGrid: vi.fn(),
          onToggleRulers: vi.fn(),
          onToggleGuides: vi.fn(),
        }}
      />,
    );

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    await userEvent.hover(screen.getByRole("menuitemcheckbox", { name: "Grid" }));

    const preview = screen.getByTestId("view-setting-preview");
    expect(preview.querySelector('[class*="previewGrid"]')).toBeTruthy();
    expect(preview).toHaveTextContent("Grid");
  });

  it("renders rulers preview with a canvas-like grid area", async () => {
    render(
      <EditorMenu
        onBackToLibrary={() => undefined}
        viewSettings={{
          showGrid: true,
          showRulers: true,
          showGuides: true,
          onToggleGrid: vi.fn(),
          onToggleRulers: vi.fn(),
          onToggleGuides: vi.fn(),
        }}
      />,
    );

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    await userEvent.hover(screen.getByRole("menuitemcheckbox", { name: "Rulers" }));

    const preview = screen.getByTestId("view-setting-preview");
    expect(preview.querySelector('[class*="previewRulerGrid"]')).toBeTruthy();
    expect(preview.querySelector('[class*="previewRulerTop"]')).toBeTruthy();
    expect(preview.querySelector('[class*="previewRulerLeft"]')).toBeTruthy();
  });

  it("runs undo from Edit menu when history exists", async () => {
    const id = useEditorStore.getState().addWidget("screen_main", "label")!;
    expect(useEditorStore.getState().historyPast.length).toBeGreaterThan(0);

    render(<EditorMenu onBackToLibrary={() => undefined} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Undo/ }));

    expect(useEditorStore.getState().project.screens[0].children).toEqual([]);
    expect(id).toBeTruthy();
  });

  it("opens export modal from Project menu", async () => {
    render(<EditorMenu onBackToLibrary={() => undefined} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Export…" }));

    expect(screen.getByText(/Copy or download the project JSON/i)).toBeInTheDocument();
  });

  it("opens import modal from Project menu", async () => {
    render(<EditorMenu onBackToLibrary={() => undefined} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Import…" }));

    expect(screen.getByText(/Paste a project JSON file/i)).toBeInTheDocument();
  });

  it("runs redo from Edit menu when future history exists", async () => {
    const id = useEditorStore.getState().addWidget("screen_main", "label")!;
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().historyFuture.length).toBeGreaterThan(0);

    render(<EditorMenu onBackToLibrary={() => undefined} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Redo/ }));

    expect(useEditorStore.getState().project.screens[0].children?.[0]?.id).toBe(id);
  });

  it("copies and pastes from the Edit menu", async () => {
    const id = useEditorStore.getState().addWidget("screen_main", "label")!;
    useEditorStore.getState().selectNode(id);

    render(<EditorMenu onBackToLibrary={() => undefined} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toBeEnabled();
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toBeEnabled();

    await userEvent.click(screen.getByRole("menuitem", { name: /Copy/ }));
    expect(useEditorStore.getState().hasClipboard).toBe(true);

    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Paste/ }));
    expect(useEditorStore.getState().project.screens[0].children).toHaveLength(2);
  });

  it("disables copy and duplicate when only the screen is selected", async () => {
    useEditorStore.getState().selectNode("screen_main");
    render(<EditorMenu onBackToLibrary={() => undefined} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    expect(screen.getByRole("menuitem", { name: /Copy/ })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: /Duplicate/ })).toBeDisabled();
    expect(screen.getByRole("menuitem", { name: /Paste/ })).toBeDisabled();
  });

  it("duplicates from the Edit menu", async () => {
    const id = useEditorStore.getState().addWidget("screen_main", "label")!;
    useEditorStore.getState().selectNode(id);

    render(<EditorMenu onBackToLibrary={() => undefined} />);
    await userEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    await userEvent.click(screen.getByRole("menuitem", { name: /Duplicate/ }));

    expect(useEditorStore.getState().project.screens[0].children).toHaveLength(2);
    expect(useEditorStore.getState().selectedNodeId).not.toBe(id);
  });

  it("closes an open menu on Escape", async () => {
    render(<EditorMenu onBackToLibrary={() => undefined} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    expect(screen.getByRole("menuitem", { name: "Back to library" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Back to library" })).not.toBeInTheDocument();
  });
});

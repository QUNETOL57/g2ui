import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { EditorPage } from "@pages/editor/EditorPage";

import { makeFixtureProject, makeLabel, withChildren } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("EditorPage", () => {
  it("renders project name and display size in the top bar", () => {
    const project = makeFixtureProject({ name: "MyApp" });
    get().setProject(project);
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("MyApp")).toBeInTheDocument();
    expect(
      screen.getByText(`${project.display.width} × ${project.display.height}`, { exact: false }),
    ).toBeInTheDocument();
  });

  it("calls onBackToLibrary when the brand logo is clicked", async () => {
    const back = vi.fn();
    render(<EditorPage onBackToLibrary={back} />);
    await userEvent.click(screen.getByRole("button", { name: /Back to project library/i }));
    expect(back).toHaveBeenCalled();
  });

  it("renders left panel with widget tree and screens, PropertiesPanel and status bar actions", () => {
    render(<EditorPage onBackToLibrary={() => undefined} autosaveStatus="saved" />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();
    expect(screen.getByText(/Properties/)).toBeInTheDocument();
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import$/ })).toBeInTheDocument();
  });

  it("renders editor menu and shortcuts in the empty properties panel", () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);

    expect(screen.getByRole("menubar", { name: "Editor menu" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Project" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "View" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByText("Enter / Double-click")).toBeInTheDocument();
  });

  it("renders the error banner when lastError is set", () => {
    useEditorStore.setState({ lastError: "Oops" });
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("Oops")).toBeInTheDocument();
  });

  it("toggles the left and right panels with icon buttons", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide widget tree" }));
    expect(screen.queryByText("Widget tree")).not.toBeInTheDocument();
    expect(screen.queryByText("Screens")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show widget tree" }));
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide properties" }));
    expect(screen.queryByText(/Select a widget/)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show properties" }));
    expect(screen.getByText(/Select a widget/)).toBeInTheDocument();
  });

  it("toggles grid, rulers, and guides from the View menu", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "5" } });
    expect(screen.getAllByTestId("canvas-pixel-grid")).toHaveLength(1);
    expect(screen.getByTestId("canvas-pixel-grid")).toBeInTheDocument();
    expect(screen.getByTestId("canvas-rulers")).toBeInTheDocument();
    expect(screen.getAllByTestId("selection-guide")).toHaveLength(8);
    expect(screen.getAllByTestId("selection-frame")).toHaveLength(4);
    expect(screen.getByTestId("resize-handle-nw")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("menuitem", { name: "View" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Rulers" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("menuitemcheckbox", { name: "Guides" })).toHaveAttribute("aria-checked", "true");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Grid" }));
    expect(screen.queryByTestId("canvas-pixel-grid")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Grid" })).toHaveAttribute("aria-checked", "false");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Rulers" }));
    expect(screen.queryByTestId("canvas-rulers")).not.toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Rulers" })).toHaveAttribute("aria-checked", "false");

    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Guides" }));
    expect(screen.queryAllByTestId("selection-guide")).toHaveLength(0);
    expect(screen.getAllByTestId("selection-frame")).toHaveLength(4);
    expect(screen.getByTestId("resize-handle-nw")).toBeInTheDocument();
    expect(screen.getByRole("menuitemcheckbox", { name: "Guides" })).toHaveAttribute("aria-checked", "false");
  });
});

describe("EditorPage keyboard shortcuts", () => {
  it("Delete key removes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    await userEvent.keyboard("{Delete}");
    expect(findNode(get().project, "lbl_1")).toBeNull();
  });

  it("Backspace key removes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    await userEvent.keyboard("{Backspace}");
    expect(findNode(get().project, "lbl_1")).toBeNull();
  });

  it("does not delete when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Backspace}");
    expect(findNode(get().project, "lbl_1")).not.toBeNull();
  });

  it("Ctrl+Z triggers undo", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const id = get().addWidget("screen_main", "label")!;
    expect(findNode(get().project, id)).toBeTruthy();
    await userEvent.keyboard("{Control>}z{/Control}");
    expect(findNode(get().project, id)).toBeNull();
  });

  it("Ctrl+Shift+Z triggers redo", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const id = get().addWidget("screen_main", "label")!;
    get().undo();
    expect(findNode(get().project, id)).toBeNull();
    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");
    expect(findNode(get().project, id)).toBeTruthy();
  });

  it("Ctrl+Y triggers redo", async () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    const id = get().addWidget("screen_main", "label")!;
    get().undo();
    expect(findNode(get().project, id)).toBeNull();
    await userEvent.keyboard("{Control>}y{/Control}");
    expect(findNode(get().project, id)).toBeTruthy();
  });

  it("Ctrl+C / Ctrl+V copies and pastes the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hi")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}c{/Control}");
    expect(get().hasClipboard).toBe(true);

    await userEvent.keyboard("{Control>}v{/Control}");
    expect(get().project.screens[0].children).toHaveLength(2);
    expect(get().selectedNodeId).not.toBe("lbl_1");
    expect(findNode(get().project, get().selectedNodeId!)?.type).toBe("label");
  });

  it("Ctrl+D duplicates the selected node", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}d{/Control}");
    expect(get().project.screens[0].children).toHaveLength(2);
    expect(get().selectedNodeId).not.toBe("lbl_1");
  });

  it("does not paste when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    get().copySelectedNodes();
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Control>}v{/Control}");
    expect(get().project.screens[0].children).toHaveLength(1);
  });

  it("does not copy or duplicate when focus is in a text input", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    const input = screen.getAllByRole("textbox")[0] as HTMLInputElement;
    input.focus();
    await userEvent.keyboard("{Control>}c{/Control}");
    expect(get().hasClipboard).toBe(false);

    await userEvent.keyboard("{Control>}d{/Control}");
    expect(get().project.screens[0].children).toHaveLength(1);
  });

  it("does nothing for Ctrl+C when only the screen is selected", async () => {
    get().setProject(makeFixtureProject());
    get().selectNode("screen_main");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}c{/Control}");
    expect(get().hasClipboard).toBe(false);
  });

  it("does nothing for Ctrl+V when clipboard is empty", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    get().selectNode("lbl_1");
    render(<EditorPage onBackToLibrary={() => undefined} />);

    await userEvent.keyboard("{Control>}v{/Control}");
    expect(get().project.screens[0].children).toHaveLength(1);
  });
});

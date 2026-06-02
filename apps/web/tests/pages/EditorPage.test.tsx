import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  it("renders project name and schema in the top bar", () => {
    const project = makeFixtureProject({ name: "MyApp" });
    get().setProject(project);
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("MyApp")).toBeInTheDocument();
    expect(screen.getByText(/· schema/)).toBeInTheDocument();
  });

  it("calls onBackToLibrary when the back button is clicked", async () => {
    const back = vi.fn();
    render(<EditorPage onBackToLibrary={back} />);
    await userEvent.click(screen.getByRole("button", { name: /Back to project library/i }));
    expect(back).toHaveBeenCalled();
  });

  it("renders TreePanel, PropertiesPanel and Export trigger", () => {
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText(/Properties/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/ })).toBeInTheDocument();
  });

  it("renders the error banner when lastError is set", () => {
    useEditorStore.setState({ lastError: "Oops" });
    render(<EditorPage onBackToLibrary={() => undefined} />);
    expect(screen.getByText("Oops")).toBeInTheDocument();
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
});

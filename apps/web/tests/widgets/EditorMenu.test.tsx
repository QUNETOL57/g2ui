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

  it("closes an open menu on Escape", async () => {
    render(<EditorMenu onBackToLibrary={() => undefined} />);

    await userEvent.click(screen.getByRole("menuitem", { name: "Project" }));
    expect(screen.getByRole("menuitem", { name: "Back to library" })).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menuitem", { name: "Back to library" })).not.toBeInTheDocument();
  });
});

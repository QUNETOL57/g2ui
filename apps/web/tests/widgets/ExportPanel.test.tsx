import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";

import { openExportModal, openImportModal } from "../fixtures/exportPanel";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("EditorStatusBar: project JSON", () => {
  it("renders save status and separate Export / Import actions", () => {
    render(<EditorStatusBar autosaveStatus="saved" />);
    expect(screen.getByText("Saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Palette$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Export$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Import$/ })).toBeInTheDocument();
  });

  it("opens export-only modal", async () => {
    render(<EditorStatusBar />);
    await openExportModal();
    expect(screen.getByLabelText("Exported project JSON")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("paste project.json here")).not.toBeInTheDocument();
  });

  it("opens import-only modal", async () => {
    render(<EditorStatusBar />);
    await openImportModal();
    expect(screen.getByPlaceholderText("paste project.json here")).toBeInTheDocument();
    expect(screen.queryByLabelText("Exported project JSON")).not.toBeInTheDocument();
  });

  it("Copy JSON button invokes clipboard with current project JSON", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<EditorStatusBar />);
    await openExportModal();
    await userEvent.click(screen.getByRole("button", { name: /Copy JSON to clipboard/i }));
    expect(writeText).toHaveBeenCalled();
    const passed = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(passed);
    expect(parsed.id).toBe(get().project.id);
  });

  it("Load JSON imports valid project from textarea", async () => {
    render(<EditorStatusBar />);
    await openImportModal();
    const next = { ...get().project, id: "imported_id", name: "Imported" };
    const ta = screen.getByPlaceholderText("paste project.json here");
    await userEvent.click(ta);
    await userEvent.paste(JSON.stringify(next));
    await userEvent.click(screen.getByRole("button", { name: "Load JSON" }));
    expect(get().project.id).toBe("imported_id");
  });

  it("Load JSON sets lastError on invalid input", async () => {
    render(<EditorStatusBar />);
    await openImportModal();
    const ta = screen.getByPlaceholderText("paste project.json here");
    await userEvent.click(ta);
    await userEvent.paste("not json");
    await userEvent.click(screen.getByRole("button", { name: "Load JSON" }));
    expect(get().lastError).toBeTruthy();
  });
});

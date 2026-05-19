import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { ExportPanel } from "@widgets/export-panel/ExportPanel";

import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("ExportPanel", () => {
  it("renders export and import sections (open by default after expand)", async () => {
    render(<ExportPanel />);
    await userEvent.click(screen.getByText("Project JSON"));
    expect(screen.getByText("Export")).toBeInTheDocument();
    expect(screen.getByText("Import")).toBeInTheDocument();
  });

  it("Copy JSON button invokes clipboard with current project JSON", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<ExportPanel />);
    await userEvent.click(screen.getByText("Project JSON"));
    await userEvent.click(screen.getByRole("button", { name: /Copy JSON to clipboard/i }));
    expect(writeText).toHaveBeenCalled();
    const passed = writeText.mock.calls[0][0] as string;
    const parsed = JSON.parse(passed);
    expect(parsed.id).toBe(get().project.id);
  });

  it("Load JSON imports valid project from textarea", async () => {
    render(<ExportPanel />);
    await userEvent.click(screen.getByText("Project JSON"));
    const next = { ...get().project, id: "imported_id", name: "Imported" };
    const ta = screen.getByPlaceholderText("paste project.json here");
    await userEvent.click(ta);
    await userEvent.paste(JSON.stringify(next));
    await userEvent.click(screen.getByRole("button", { name: "Load JSON" }));
    expect(get().project.id).toBe("imported_id");
  });

  it("Load JSON sets lastError on invalid input", async () => {
    render(<ExportPanel />);
    await userEvent.click(screen.getByText("Project JSON"));
    const ta = screen.getByPlaceholderText("paste project.json here");
    await userEvent.click(ta);
    await userEvent.paste("not json");
    await userEvent.click(screen.getByRole("button", { name: "Load JSON" }));
    expect(get().lastError).toBeTruthy();
  });
});

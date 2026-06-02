import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ExportPanel } from "@widgets/export-panel/ExportPanel";

import { openExportModal } from "../fixtures/exportPanel";
import { resetEditorStore } from "../fixtures/store";

beforeEach(() => {
  resetEditorStore();
});

describe("ExportPanel: download JSON", () => {
  it("creates a Blob URL and triggers an <a> download", async () => {
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const anchorClicks: HTMLAnchorElement[] = [];
    const originalCreate = document.createElement.bind(document);
    const spyCreate = vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
      const el = originalCreate(tag) as HTMLAnchorElement;
      if (tag === "a") {
        el.click = vi.fn(() => {
          anchorClicks.push(el);
        });
      }
      return el;
    });

    render(<ExportPanel />);
    await openExportModal();
    await userEvent.click(screen.getByRole("button", { name: /Download JSON/i }));

    expect(createSpy).toHaveBeenCalled();
    expect(anchorClicks.length).toBe(1);
    expect(anchorClicks[0].href).toContain("blob:test");
    expect(anchorClicks[0].download).toMatch(/\.project\.json$/);
    expect(revokeSpy).toHaveBeenCalledWith("blob:test");

    spyCreate.mockRestore();
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});

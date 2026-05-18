import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CreateProjectPanel } from "@pages/library/CreateProjectPanel";
import { makeProjectFromTemplate } from "@entities/ui-project/lib/projectTemplates";
import { DEFAULT_PRESET_ID, DISPLAY_PRESETS } from "@shared/config/displayPresets";

function renderCreate(overrides: Partial<Parameters<typeof CreateProjectPanel>[0]> = {}) {
  const preset = DISPLAY_PRESETS[0];
  const handlers = {
    onPresetChange: vi.fn(),
    onOrientationChange: vi.fn(),
    onTemplateChange: vi.fn(),
    onProjectNameChange: vi.fn(),
    onSubmit: vi.fn(),
  };
  const props = {
    mode: "create" as const,
    selectedPresetId: DEFAULT_PRESET_ID,
    orientation: "landscape" as const,
    template: "blank" as const,
    projectName: "Untitled",
    createSize: { width: preset.width, height: preset.height },
    draftProject: makeProjectFromTemplate({ id: "draft", name: "Untitled", width: preset.width, height: preset.height, template: "blank" }),
    ...handlers,
    ...overrides,
  };
  render(<CreateProjectPanel {...props} />);
  return handlers;
}

describe("CreateProjectPanel: create mode", () => {
  it("shows New project kicker and submit text", () => {
    renderCreate({ mode: "create" });
    expect(screen.getByText("New project")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create project" })).toBeInTheDocument();
  });

  it("emits project name change on input", async () => {
    const h = renderCreate({ projectName: "" });
    const input = screen.getByPlaceholderText("Untitled");
    await userEvent.type(input, "H");
    expect(h.onProjectNameChange).toHaveBeenCalled();
    const last = h.onProjectNameChange.mock.calls.at(-1)?.[0] as string;
    expect(last).toBe("H");
  });

  it("emits orientation change when clicking portrait", async () => {
    const h = renderCreate();
    await userEvent.click(screen.getByRole("button", { name: "Portrait" }));
    expect(h.onOrientationChange).toHaveBeenCalledWith("portrait");
  });

  it("emits preset change via display select", async () => {
    const h = renderCreate();
    await userEvent.click(screen.getByRole("button", { name: "display size" }));
    const option = screen.getAllByRole("option")[1];
    await userEvent.click(option);
    expect(h.onPresetChange).toHaveBeenCalled();
  });

  it("emits template change via template select", async () => {
    const h = renderCreate();
    await userEvent.click(screen.getByRole("button", { name: "template" }));
    await userEvent.click(screen.getByRole("option", { name: /Hello/ }));
    expect(h.onTemplateChange).toHaveBeenCalledWith("hello");
  });

  it("submit calls onSubmit", async () => {
    const h = renderCreate();
    await userEvent.click(screen.getByRole("button", { name: "Create project" }));
    expect(h.onSubmit).toHaveBeenCalled();
  });
});

describe("CreateProjectPanel: edit mode", () => {
  it("shows Edit kicker and Save submit text", () => {
    renderCreate({ mode: "edit" });
    expect(screen.getByText("Edit project")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});

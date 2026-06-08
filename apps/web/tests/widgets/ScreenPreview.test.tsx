import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { PREVIEW_DEBOUNCE_MS, ScreenPreview } from "@widgets/screens-panel/ScreenPreview";

import { makeFixtureProject, makeLabel, withChildren } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
  vi.useRealTimers();
});

describe("ScreenPreview", () => {
  it("renders preview for the given screen id", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hello")]);
    get().setProject(project);
    render(<ScreenPreview project={project} screenId="screen_main" />);
    expect(screen.getByLabelText("Hello")).toBeInTheDocument();
  });

  it("debounces project updates before re-rendering preview content", async () => {
    vi.useFakeTimers();
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Before")]);
    get().setProject(project);
    const { rerender } = render(<ScreenPreview project={project} screenId="screen_main" />);
    expect(screen.getByLabelText("Before")).toBeInTheDocument();

    const updated = withChildren(makeFixtureProject(), [makeLabel("lbl_1", "After")]);
    get().setProject(updated);
    rerender(<ScreenPreview project={updated} screenId="screen_main" />);

    expect(screen.getByLabelText("Before")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(PREVIEW_DEBOUNCE_MS);
    });
    expect(screen.getByLabelText("After")).toBeInTheDocument();
    vi.useRealTimers();
  });
});

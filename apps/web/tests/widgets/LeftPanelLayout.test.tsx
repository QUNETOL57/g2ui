import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { LeftPanelLayout } from "@widgets/left-panel/LeftPanelLayout";

import { makeFixtureProject, makeSecondScreen, withScreens } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

beforeEach(() => {
  resetEditorStore();
});

describe("LeftPanelLayout", () => {
  it("renders widget tree and screens panel together", () => {
    const project = withScreens(makeFixtureProject(), [
      makeFixtureProject().screens[0],
      makeSecondScreen(),
    ]);
    get().setProject(project);
    render(<LeftPanelLayout />);

    expect(screen.getByText("Widget tree")).toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();
    expect(screen.getByTestId("left-panel-layout")).toBeInTheDocument();
    expect(screen.getByTestId("widget-section")).toBeInTheDocument();
    expect(screen.getByTestId("screens-section")).toBeInTheDocument();
  });

  it("shows resize handle when screens panel is expanded", () => {
    render(<LeftPanelLayout />);
    expect(screen.getByTestId("left-panel-resize-handle")).toBeInTheDocument();
  });

  it("collapses screens panel leaving only the header plaque", async () => {
    render(<LeftPanelLayout />);
    expect(screen.getByTestId("screens-panel-list")).toBeInTheDocument();

    await userEvent.click(screen.getByTestId("screens-panel-collapse"));
    expect(screen.queryByTestId("screens-panel-list")).not.toBeInTheDocument();
    expect(screen.getByText("Screens")).toBeInTheDocument();
    expect(screen.queryByTestId("left-panel-resize-handle")).not.toBeInTheDocument();
  });

  it("expands screens panel again after collapse", async () => {
    render(<LeftPanelLayout />);
    await userEvent.click(screen.getByTestId("screens-panel-collapse"));
    await userEvent.click(screen.getByTestId("screens-panel-collapse"));
    expect(screen.getByTestId("screens-panel-list")).toBeInTheDocument();
    expect(screen.getByTestId("left-panel-resize-handle")).toBeInTheDocument();
  });

  it("updates widget section flex on resize drag", () => {
    render(<LeftPanelLayout />);
    const shell = screen.getByTestId("left-panel-layout");
    const widgetSection = screen.getByTestId("widget-section");
    const handle = screen.getByTestId("left-panel-resize-handle");

    Object.defineProperty(shell, "getBoundingClientRect", {
      configurable: true,
      value: () => ({
        top: 0,
        left: 0,
        right: 260,
        bottom: 400,
        width: 260,
        height: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }),
    });

    const initialFlex = widgetSection.style.flex;
    fireEvent.mouseDown(handle);
    fireEvent.mouseMove(window, { clientY: 120 });
    fireEvent.mouseUp(window);

    expect(widgetSection.style.flex).not.toBe(initialFlex);
    expect(widgetSection.style.flex).toMatch(/calc\(30%/);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { TreePanel } from "@widgets/tree-panel/TreePanel";

import {
  makeFixtureProject,
  makeLabel,
  makePanel,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

function findRowByText(text: string) {
  const span = screen.getAllByText(text).find((el) => el.tagName === "SPAN");
  return span?.parentElement as HTMLDivElement;
}

function makeDataTransfer() {
  const data = new Map<string, string>();
  return {
    effectAllowed: "",
    dropEffect: "",
    setData: (key: string, value: string) => data.set(key, value),
    getData: (key: string) => data.get(key) ?? "",
    types: [] as string[],
  };
}

beforeEach(() => {
  resetEditorStore();
});

describe("TreePanel drag handlers", () => {
  it("dragStart selects the dragged node", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    render(<TreePanel />);
    const labelRow = findRowByText("lbl_1");
    expect(labelRow).toBeTruthy();
    expect(labelRow.getAttribute("draggable")).toBe("true");

    fireEvent.dragStart(labelRow, { dataTransfer: makeDataTransfer() });
    expect(get().selectedNodeId).toBe("lbl_1");
  });

  it("screen row is not draggable", () => {
    render(<TreePanel />);
    const screenRow = findRowByText("Main");
    expect(screenRow).toBeTruthy();
    expect(screenRow.getAttribute("draggable")).toBe("false");
  });

  it("dragEnd clears drag state without throwing", () => {
    const project = withChildren(makeFixtureProject(), [
      makePanel("pn_1"),
      makeLabel("lbl_1"),
    ]);
    get().setProject(project);
    render(<TreePanel />);

    const labelRow = findRowByText("lbl_1");
    const dt = makeDataTransfer();
    fireEvent.dragStart(labelRow, { dataTransfer: dt });
    fireEvent.dragEnd(labelRow, { dataTransfer: dt });
    // nothing should throw
    expect(get().project.screens[0].children?.length).toBe(2);
  });
});

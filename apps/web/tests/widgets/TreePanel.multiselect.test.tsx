import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { TreePanel } from "@widgets/tree-panel/TreePanel";

import { makeFixtureProject, makeLabel, withChildren } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

function rowFor(text: string) {
  const span = screen.getAllByText(text).find((el) => el.tagName === "SPAN");
  return span?.parentElement as HTMLDivElement;
}

beforeEach(() => {
  resetEditorStore(
    withChildren(makeFixtureProject(), [
      makeLabel("lab_1"),
      makeLabel("lab_2"),
      makeLabel("lab_3"),
    ]),
  );
});

describe("TreePanel: multi-selection", () => {
  it("Ctrl/Cmd-click toggles nodes into the selection", () => {
    render(<TreePanel />);
    fireEvent.click(rowFor("lab_1"));
    fireEvent.click(rowFor("lab_3"), { ctrlKey: true });
    expect(get().selectedNodeIds).toEqual(["lab_1", "lab_3"]);
  });

  it("Shift-click selects the visible range from the anchor", () => {
    render(<TreePanel />);
    fireEvent.click(rowFor("lab_1"));
    fireEvent.click(rowFor("lab_3"), { shiftKey: true });
    expect(get().selectedNodeIds).toEqual(["lab_1", "lab_2", "lab_3"]);
  });

  it("plain click collapses back to a single selection", () => {
    render(<TreePanel />);
    get().setSelection(["lab_1", "lab_2", "lab_3"]);
    fireEvent.click(rowFor("lab_2"));
    expect(get().selectedNodeIds).toEqual(["lab_2"]);
    expect(get().selectedNodeId).toBe("lab_2");
  });
});

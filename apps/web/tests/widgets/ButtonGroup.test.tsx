import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ButtonGroup } from "@widgets/properties-panel/groups/ButtonGroup";

import { makeButton } from "../fixtures/projects";

describe("ButtonGroup", () => {
  it("renders button text field", () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.getByLabelText("button text")).toHaveValue("Save");
  });

  it("emits text changes after debounce", () => {
    vi.useFakeTimers();
    const handler = vi.fn();
    const commitHistoryBatch = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
        onBeginHistoryBatch={() => undefined}
        onCommitHistoryBatch={commitHistoryBatch}
      />,
    );
    const input = screen.getByLabelText("button text");
    fireEvent.change(input, { target: { value: "S" } });
    expect(input).toHaveValue("S");
    expect(handler).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(400));

    expect(handler).toHaveBeenLastCalledWith({ text: "S" }, { history: false });
    expect(commitHistoryBatch).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});

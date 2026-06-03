import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ButtonGroup } from "@widgets/properties-panel/groups/ButtonGroup";

import { makeButton } from "../fixtures/projects";

describe("ButtonGroup", () => {
  it("renders typography and padding controls", () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByText("Padding")).toBeInTheDocument();
    expect(screen.queryByLabelText("button text")).toBeNull();
  });

  it("emits padding alignment changes", () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Align left" }));
    expect(handler).toHaveBeenLastCalledWith({ horizontalAlign: "left" });
  });

  it("emits vertical alignment changes", () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Align bottom" }));
    expect(handler).toHaveBeenLastCalledWith({ verticalAlign: "bottom" });
  });

  it("emits typography changes", async () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "font size" }));
    await userEvent.click(screen.getAllByRole("option")[0]);
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls.at(-1)?.[0]).toMatchObject({ fontFace: undefined });
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("emits text changes", async () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );
    const input = screen.getByLabelText("button text");
    await userEvent.type(input, "S");
    expect(handler).toHaveBeenLastCalledWith({ text: "S" });
  });
});

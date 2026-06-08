import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FrameGroup } from "@widgets/properties-panel/groups/FrameGroup";

import { makeButton, makeIcon } from "../fixtures/projects";

describe("FrameGroup", () => {
  it("renders the four transform fields", () => {
    const node = makeButton("b_1");
    render(<FrameGroup node={node} draftFrame={null} updateFrame={() => undefined} />);
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
  });

  it("uses draftFrame when provided", () => {
    const node = makeButton("b_1");
    render(
      <FrameGroup
        node={node}
        draftFrame={{ x: 99, y: 100, width: 5, height: 6 }}
        updateFrame={() => undefined}
      />,
    );
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs[0]).toHaveValue(99);
    expect(inputs[1]).toHaveValue(100);
    expect(inputs[2]).toHaveValue(5);
    expect(inputs[3]).toHaveValue(6);
  });

  it("commits a new X value via updateFrame on blur", async () => {
    const node = { ...makeButton("b_1"), frame: { x: 0, y: 0, width: 10, height: 10 } };
    const handler = vi.fn();
    render(<FrameGroup node={node} draftFrame={null} updateFrame={handler} />);
    const inputs = screen.getAllByRole("spinbutton");
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "5");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith("b_1", { x: 5 });
  });

  it("clamps W to icon definition size for icon nodes", async () => {
    const node = makeIcon("ic_1", "earth");
    const handler = vi.fn();
    render(<FrameGroup node={node} draftFrame={null} updateFrame={handler} />);
    const inputs = screen.getAllByRole("spinbutton");
    const widthInput = inputs[2];
    expect(widthInput).toHaveAttribute("min");
  });
});

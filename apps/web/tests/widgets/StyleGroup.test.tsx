import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StyleGroup } from "@widgets/properties-panel/groups/StyleGroup";

import { makeButton, makeIcon, makeLine, makePanel } from "../fixtures/projects";

const palette = [
  { token: "bg", hex: "#000000" },
  { token: "fg", hex: "#FFFFFF" },
];

describe("StyleGroup: icon variant", () => {
  it("shows Icon color block", () => {
    const node = makeIcon("ic_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={() => undefined} />);
    expect(screen.getByText("Icon color")).toBeInTheDocument();
  });
});

describe("StyleGroup: line variant", () => {
  it("shows stroke color + width controls", () => {
    const node = makeLine("ln_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={() => undefined} />);
    expect(screen.getByText("Stroke")).toBeInTheDocument();
    expect(screen.getByText("width")).toBeInTheDocument();
  });

  it("emits stroke width updates", async () => {
    const handler = vi.fn();
    const node = makeLine("ln_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={handler} />);
    const widthInput = screen.getByRole("spinbutton");
    await userEvent.clear(widthInput);
    await userEvent.type(widthInput, "3");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith("ln_1", expect.objectContaining({ borderWidth: 3 }));
  });
});

describe("StyleGroup: button variant", () => {
  it("renders Fill + Border + (no Text for buttons)", () => {
    const node = makeButton("bt_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={() => undefined} />);
    expect(screen.getByText("Fill")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.queryByText("Text")).not.toBeInTheDocument();
  });

  it("toggling Border shows width/color controls", async () => {
    const handler = vi.fn();
    const node = makeButton("bt_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={handler} />);
    const cards = screen.getAllByRole("checkbox");
    const borderCheckbox = cards[1];
    await userEvent.click(borderCheckbox);
    expect(handler).toHaveBeenCalledWith(
      "bt_1",
      expect.objectContaining({ drawBorder: true, borderWidth: 1 }),
    );
  });
});

describe("StyleGroup: panel variant", () => {
  it("renders Fill + Border but no Text", () => {
    const node = makePanel("pn_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={() => undefined} />);
    expect(screen.getByText("Fill")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.queryByText("Text")).not.toBeInTheDocument();
  });

  it("disabling Fill calls updateStyle drawBackground=false", async () => {
    const handler = vi.fn();
    const node = makePanel("pn_1");
    render(<StyleGroup node={node} palette={palette} updateStyle={handler} />);
    const fillCheckbox = screen.getAllByRole("checkbox")[0];
    expect(fillCheckbox).toBeChecked();
    await userEvent.click(fillCheckbox);
    expect(handler).toHaveBeenCalledWith(
      "pn_1",
      expect.objectContaining({ drawBackground: false }),
    );
  });
});

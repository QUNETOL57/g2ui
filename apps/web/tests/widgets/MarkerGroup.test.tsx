import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MarkerGroup } from "@widgets/properties-panel/groups/MarkerGroup";

const palette = [
  { token: "bg", hex: "#000000" },
  { token: "fg", hex: "#FFFFFF" },
];

describe("MarkerGroup", () => {
  it("renders marker stroke controls", () => {
    render(
      <MarkerGroup
        markerStyle={{ color: { kind: "hex", value: "#FFFFFF" }, width: 1 }}
        palette={palette}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByText("Marker")).toBeInTheDocument();
    expect(screen.getByText("Stroke")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(1);
  });

  it("emits width updates", async () => {
    const onChange = vi.fn();
    render(
      <MarkerGroup
        markerStyle={{ color: { kind: "hex", value: "#FFFFFF" }, width: 1 }}
        palette={palette}
        onChange={onChange}
      />,
    );
    const widthInput = screen.getByRole("spinbutton");
    await userEvent.clear(widthInput);
    await userEvent.type(widthInput, "5");
    await userEvent.tab();
    expect(onChange).toHaveBeenCalledWith({ width: 5 });
  });

  it("emits color updates", () => {
    const onChange = vi.fn();
    const { container } = render(
      <MarkerGroup
        markerStyle={{ color: { kind: "hex", value: "#FFFFFF" }, width: 1 }}
        palette={palette}
        onChange={onChange}
      />,
    );
    const colorInput = container.querySelector('input[type="color"]') as HTMLInputElement;
    fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    fireEvent.blur(colorInput);
    expect(onChange).toHaveBeenCalledWith({ color: { kind: "hex", value: "#FF0000" } });
  });
});

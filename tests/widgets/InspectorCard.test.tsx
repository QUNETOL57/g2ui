import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { InspectorCard } from "@widgets/properties-panel/ui/InspectorCard";

describe("InspectorCard", () => {
  it("renders title and children", () => {
    render(
      <InspectorCard title="Stroke">
        <div>body</div>
      </InspectorCard>,
    );
    expect(screen.getByText("Stroke")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("renders optional subtitle", () => {
    render(
      <InspectorCard title="Stroke" subtitle="Helper text">
        <div>body</div>
      </InspectorCard>,
    );
    expect(screen.getByText("Helper text")).toBeInTheDocument();
  });

  it("renders a toggle checkbox when onToggle is provided", async () => {
    const onToggle = vi.fn();
    render(
      <InspectorCard title="Fill" checked onToggle={onToggle}>
        <div>body</div>
      </InspectorCard>,
    );
    const cb = screen.getByRole("checkbox");
    expect(cb).toBeChecked();
    await userEvent.click(cb);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("renders without a checkbox when onToggle is omitted", () => {
    render(
      <InspectorCard title="Plain">
        <div>x</div>
      </InspectorCard>,
    );
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

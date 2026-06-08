import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { VisibilityToggleButton } from "@shared/ui/VisibilityToggleButton";

describe("VisibilityToggleButton", () => {
  it("shows hide action when the node is visible", () => {
    render(
      <VisibilityToggleButton visible label="Widget" onToggle={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Hide Widget" })).toBeInTheDocument();
  });

  it("shows show action when the node is hidden", () => {
    render(
      <VisibilityToggleButton visible={false} label="Widget" onToggle={() => undefined} />,
    );
    expect(screen.getByRole("button", { name: "Show Widget" })).toBeInTheDocument();
  });

  it("calls onToggle when clicked", async () => {
    const onToggle = vi.fn();
    render(
      <VisibilityToggleButton visible label="Widget" onToggle={onToggle} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Hide Widget" }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

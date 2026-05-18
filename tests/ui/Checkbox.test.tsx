import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@shared/ui/Checkbox";

describe("Checkbox", () => {
  it("renders a label wrapping an input[type=checkbox]", () => {
    render(<Checkbox>Accept</Checkbox>);
    const input = screen.getByRole("checkbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "checkbox");
    expect(screen.getByText("Accept")).toBeInTheDocument();
  });

  it("forwards checked state and onChange", async () => {
    const handler = vi.fn();
    render(<Checkbox onChange={handler}>Subscribe</Checkbox>);
    await userEvent.click(screen.getByRole("checkbox"));
    expect(handler).toHaveBeenCalled();
  });

  it("supports controlled checked", () => {
    const { rerender } = render(<Checkbox checked={false} onChange={() => undefined} />);
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    rerender(<Checkbox checked onChange={() => undefined} />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("respects disabled prop", () => {
    render(<Checkbox disabled>x</Checkbox>);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});

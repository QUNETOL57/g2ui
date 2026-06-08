import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "@shared/ui/IconButton";

describe("IconButton", () => {
  it("renders as a button with children", () => {
    render(<IconButton aria-label="open">i</IconButton>);
    const btn = screen.getByRole("button", { name: "open" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("type", "button");
  });

  it("forwards title and aria-label", () => {
    render(<IconButton title="Tip" aria-label="Toolbar action">i</IconButton>);
    const btn = screen.getByRole("button", { name: "Toolbar action" });
    expect(btn).toHaveAttribute("title", "Tip");
  });

  it("renders tooltip via data attribute when prop is set", () => {
    render(<IconButton tooltip="Save now" aria-label="save">i</IconButton>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-tooltip", "Save now");
  });

  it("supports clicks", async () => {
    const handler = vi.fn();
    render(<IconButton onClick={handler} aria-label="x">i</IconButton>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalled();
  });
});

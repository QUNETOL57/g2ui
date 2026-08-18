import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IconButton } from "@shared/ui/IconButton";

describe("IconButton", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("renders tooltip in a portal when prop is set", async () => {
    const user = userEvent.setup();
    render(<IconButton tooltip="Save now" aria-label="save">i</IconButton>);
    const btn = screen.getByRole("button", { name: "save" });
    expect(btn).not.toHaveAttribute("title");
    await user.hover(btn);
    expect(screen.getByRole("tooltip")).toHaveTextContent("Save now");
  });

  it("keeps a portal tooltip inside the viewport near the left edge", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 600 });
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
      this: HTMLElement,
    ) {
      if (this.getAttribute("role") === "tooltip") {
        return {
          x: 0,
          y: 0,
          left: 0,
          top: 0,
          width: 200,
          height: 24,
          right: 200,
          bottom: 24,
          toJSON() {
            return {};
          },
        } as DOMRect;
      }
      return {
        x: 4,
        y: 380,
        left: 4,
        top: 380,
        width: 24,
        height: 24,
        right: 28,
        bottom: 404,
        toJSON() {
          return {};
        },
      } as DOMRect;
    });

    const user = userEvent.setup();
    render(
      <IconButton tooltip="This project is a template" aria-label="Template">
        i
      </IconButton>,
    );
    await user.hover(screen.getByRole("button", { name: "Template" }));

    const tooltip = screen.getByRole("tooltip");
    const left = Number.parseFloat(tooltip.style.left);
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 200).toBeLessThanOrEqual(800 - 8);
  });

  it("supports clicks", async () => {
    const handler = vi.fn();
    render(<IconButton onClick={handler} aria-label="x">i</IconButton>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalled();
  });
});

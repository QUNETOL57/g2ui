import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@shared/ui/Button";

describe("Button", () => {
  it("renders children", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });

  it("defaults to type=button", () => {
    render(<Button>x</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "button");
  });

  it("forwards type, name and disabled props", () => {
    render(<Button type="submit" name="save" disabled>x</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("type", "submit");
    expect(btn).toHaveAttribute("name", "save");
    expect(btn).toBeDisabled();
  });

  it("calls onClick when clicked", async () => {
    const handler = vi.fn();
    render(<Button onClick={handler}>Press</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick when disabled", async () => {
    const handler = vi.fn();
    render(<Button onClick={handler} disabled>Press</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("applies size and variant class names", () => {
    const { rerender } = render(<Button>x</Button>);
    const initialClass = screen.getByRole("button").className;
    expect(initialClass).toMatch(/sizeMd/);

    rerender(<Button size="sm" variant="primary">x</Button>);
    const className = screen.getByRole("button").className;
    expect(className).toMatch(/sizeSm/);
    expect(className).toMatch(/variantPrimary/);

    rerender(<Button size="lg" variant="danger">x</Button>);
    expect(screen.getByRole("button").className).toMatch(/variantDanger/);

    rerender(<Button variant="ghost">x</Button>);
    expect(screen.getByRole("button").className).toMatch(/variantGhost/);
  });

  it("merges custom className", () => {
    render(<Button className="custom-cls">x</Button>);
    expect(screen.getByRole("button").className).toMatch(/custom-cls/);
  });
});

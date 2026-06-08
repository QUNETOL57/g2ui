import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Input } from "@shared/ui/Input";

describe("Input", () => {
  it("renders an input with type=text by default", () => {
    render(<Input aria-label="name" />);
    expect(screen.getByLabelText("name")).toHaveAttribute("type", "text");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} aria-label="x" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("supports controlled values", async () => {
    const { rerender } = render(<Input aria-label="x" value="hi" onChange={() => undefined} />);
    expect(screen.getByLabelText("x")).toHaveValue("hi");
    rerender(<Input aria-label="x" value="bye" onChange={() => undefined} />);
    expect(screen.getByLabelText("x")).toHaveValue("bye");
  });

  it("applies size and invalid styles", () => {
    const { rerender } = render(<Input aria-label="x" />);
    const initialCls = screen.getByLabelText("x").className;
    expect(initialCls).not.toMatch(/sizeSm/);

    rerender(<Input aria-label="x" size="sm" />);
    expect(screen.getByLabelText("x").className).toMatch(/sizeSm/);

    rerender(<Input aria-label="x" size="lg" />);
    expect(screen.getByLabelText("x").className).toMatch(/sizeLg/);

    rerender(<Input aria-label="x" invalid />);
    expect(screen.getByLabelText("x").className).toMatch(/invalid/);
  });

  it("user-event types into the input", async () => {
    render(<Input aria-label="name" defaultValue="" />);
    await userEvent.type(screen.getByLabelText("name"), "abc");
    expect(screen.getByLabelText("name")).toHaveValue("abc");
  });
});

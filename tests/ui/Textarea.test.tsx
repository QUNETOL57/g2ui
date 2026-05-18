import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Textarea } from "@shared/ui/Textarea";

describe("Textarea", () => {
  it("renders as textarea", () => {
    render(<Textarea aria-label="body" />);
    expect(screen.getByLabelText("body").tagName).toBe("TEXTAREA");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} aria-label="x" />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("supports the mono variant", () => {
    const { rerender } = render(<Textarea aria-label="x" />);
    const initial = screen.getByLabelText("x").className;
    expect(initial).not.toMatch(/mono/);
    rerender(<Textarea aria-label="x" variant="mono" />);
    expect(screen.getByLabelText("x").className).toMatch(/mono/);
  });

  it("accepts typed input", async () => {
    render(<Textarea aria-label="x" />);
    await userEvent.type(screen.getByLabelText("x"), "abc");
    expect(screen.getByLabelText("x")).toHaveValue("abc");
  });
});

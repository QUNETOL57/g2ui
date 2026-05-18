import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RangeSlider } from "@shared/ui/RangeSlider";

describe("RangeSlider", () => {
  it("renders as input[type=range]", () => {
    render(<RangeSlider min={0} max={10} value={5} onChange={() => undefined} aria-label="zoom" />);
    const input = screen.getByLabelText("zoom") as HTMLInputElement;
    expect(input).toHaveAttribute("type", "range");
    expect(input).toHaveValue("5");
    expect(input.min).toBe("0");
    expect(input.max).toBe("10");
  });

  it("exposes --range-progress when progress is provided", () => {
    render(
      <RangeSlider
        min={0}
        max={10}
        value={5}
        onChange={() => undefined}
        progress={50}
        aria-label="zoom"
      />,
    );
    const input = screen.getByLabelText("zoom") as HTMLInputElement;
    expect(input.style.getPropertyValue("--range-progress")).toBe("50%");
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(<RangeSlider ref={ref} aria-label="z" min={0} max={1} value={0} onChange={() => undefined} />);
    expect(ref.current?.tagName).toBe("INPUT");
  });
});

import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { NumberField } from "@widgets/properties-panel/ui/NumberField";

function Harness({ initial = 0, ...rest }: { initial?: number; label?: string; min?: number; max?: number; onChange?: (n: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <NumberField
      label={rest.label ?? "n"}
      value={value}
      min={rest.min}
      max={rest.max}
      onChange={(v) => {
        rest.onChange?.(v);
        setValue(v);
      }}
    />
  );
}

describe("NumberField", () => {
  it("renders label and current value", () => {
    render(<Harness label="padding" initial={3} />);
    expect(screen.getByText("padding")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toHaveValue(3);
  });

  it("commits on blur and clamps to min/max", async () => {
    const handler = vi.fn();
    render(<Harness label="x" initial={5} min={0} max={9} onChange={handler} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "100");
    await userEvent.tab();
    expect(handler).toHaveBeenLastCalledWith(9);
  });
});

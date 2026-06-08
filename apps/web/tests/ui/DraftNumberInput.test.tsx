import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DraftNumberInput } from "@shared/ui/DraftNumberInput";

function Harness({ initial, min, max, onChange }: { initial: number; min?: number; max?: number; onChange?: (n: number) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <DraftNumberInput
      value={value}
      min={min}
      max={max}
      onChange={(n) => {
        onChange?.(n);
        setValue(n);
      }}
    />
  );
}

describe("DraftNumberInput", () => {
  it("renders the current numeric value", () => {
    render(<DraftNumberInput value={42} onChange={() => undefined} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(42);
  });

  it("commits the typed value on blur", async () => {
    const handler = vi.fn();
    render(<Harness initial={0} onChange={handler} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "10");
    await userEvent.tab();
    expect(handler).toHaveBeenLastCalledWith(10);
  });

  it("commits on Enter", async () => {
    const handler = vi.fn();
    render(<Harness initial={0} onChange={handler} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "5{Enter}");
    expect(handler).toHaveBeenLastCalledWith(5);
  });

  it("clamps committed value to min/max", async () => {
    const handler = vi.fn();
    render(<Harness initial={5} min={0} max={10} onChange={handler} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "999");
    await userEvent.tab();
    expect(handler).toHaveBeenLastCalledWith(10);

    await userEvent.clear(input);
    await userEvent.type(input, "-50");
    await userEvent.tab();
    expect(handler).toHaveBeenLastCalledWith(0);
  });

  it("blurs the field on Escape", async () => {
    render(<Harness initial={7} />);
    const input = screen.getByRole("spinbutton");
    input.focus();
    expect(input).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    expect(input).not.toHaveFocus();
  });

  it("reverts to value when committing empty string", async () => {
    const handler = vi.fn();
    render(<Harness initial={3} onChange={handler} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.tab();
    expect(handler).not.toHaveBeenCalled();
    expect(input).toHaveValue(3);
  });

  it("reverts when typed value is not a finite number", async () => {
    const handler = vi.fn();
    render(<Harness initial={3} onChange={handler} />);
    const input = screen.getByRole("spinbutton");
    await userEvent.clear(input);
    await userEvent.type(input, "----");
    await userEvent.tab();
    expect(handler).not.toHaveBeenCalled();
  });

  it("re-syncs with external value changes", () => {
    const { rerender } = render(<DraftNumberInput value={1} onChange={() => undefined} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(1);
    rerender(<DraftNumberInput value={5} onChange={() => undefined} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(5);
  });
});

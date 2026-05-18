import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ColorRef } from "@entities/ui-project";
import { ColorField } from "@widgets/properties-panel/ui/ColorField";

const palette = [
  { token: "bg", hex: "#000000" },
  { token: "fg", hex: "#FFFFFF" },
];

describe("ColorField", () => {
  it("renders label", () => {
    render(
      <ColorField label="color" value={{ kind: "hex", value: "#FF0000" }} palette={palette} onChange={() => undefined} />,
    );
    expect(screen.getByText("color")).toBeInTheDocument();
  });

  it("shows hex picker by default for hex values", () => {
    const { container } = render(
      <ColorField
        label="bg"
        value={{ kind: "hex", value: "#abcdef" }}
        palette={palette}
        onChange={() => undefined}
      />,
    );
    expect(container.querySelector('input[type="color"]')).toBeTruthy();
  });

  it("switches to token mode and reports onChange with first palette token", async () => {
    const onChange = vi.fn();
    render(
      <ColorField
        label="bg"
        value={{ kind: "hex", value: "#000000" }}
        palette={palette}
        onChange={onChange}
      />,
    );
    const modeTrigger = screen.getByRole("button", { name: "bg mode" });
    await userEvent.click(modeTrigger);
    await userEvent.click(screen.getByRole("option", { name: /palette/i }));
    expect(onChange).toHaveBeenCalledWith({ kind: "token", token: "bg" });
  });

  it("switches back to hex with default value", async () => {
    const onChange = vi.fn();
    render(
      <ColorField
        label="bg"
        value={{ kind: "token", token: "bg" } as ColorRef}
        palette={palette}
        onChange={onChange}
      />,
    );
    const modeTrigger = screen.getByRole("button", { name: "bg mode" });
    await userEvent.click(modeTrigger);
    await userEvent.click(screen.getByRole("option", { name: /hex/i }));
    expect(onChange).toHaveBeenCalledWith({ kind: "hex", value: "#FFFFFF" });
  });

  it("emits token onChange when token select changes", async () => {
    const onChange = vi.fn();
    render(
      <ColorField
        label="bg"
        value={{ kind: "token", token: "bg" } as ColorRef}
        palette={palette}
        onChange={onChange}
      />,
    );
    const tokenTrigger = screen.getByRole("button", { name: "bg token" });
    await userEvent.click(tokenTrigger);
    await userEvent.click(screen.getByRole("option", { name: /fg/i }));
    expect(onChange).toHaveBeenCalledWith({ kind: "token", token: "fg" });
  });
});

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

  it("shows a swatch picker without an inline hex text field", () => {
    render(
      <ColorField
        label="bg"
        value={{ kind: "hex", value: "#ABCDEF" }}
        palette={palette}
        onChange={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: "bg hex picker" })).toBeInTheDocument();
    expect(screen.queryByLabelText("bg hex")).not.toBeInTheDocument();
    expect(document.querySelector('input[type="color"]')).toBeNull();
  });

  it("opens a hex-only color picker panel from the swatch", async () => {
    render(
      <ColorField
        label="bg"
        value={{ kind: "hex", value: "#FF0000" }}
        palette={palette}
        onChange={() => undefined}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "bg hex picker" }));
    expect(screen.getByRole("dialog", { name: "bg hex color picker" })).toBeInTheDocument();
    expect(screen.getByText("HEX")).toBeInTheDocument();
    expect(screen.getByLabelText("bg hex")).toHaveValue("#FF0000");
    expect(screen.queryByText(/rgb/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/hsl/i)).not.toBeInTheDocument();
  });

  it("allows pasting a hex value inside the picker", async () => {
    const onChange = vi.fn();
    render(
      <ColorField
        label="bg"
        value={{ kind: "hex", value: "#FF0000" }}
        palette={palette}
        onChange={onChange}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "bg hex picker" }));
    const hexInput = screen.getByLabelText("bg hex");
    await userEvent.clear(hexInput);
    await userEvent.paste("#5AE5BB");
    expect(onChange).toHaveBeenCalledWith({ kind: "hex", value: "#5AE5BB" });
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

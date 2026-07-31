import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { hexToHsv, hsvToHex } from "@shared/lib/colorModel";
import { HexColorPicker } from "@shared/ui/HexColorPicker";

function mockRect(
  el: Element,
  rect: Pick<DOMRect, "left" | "top" | "width" | "height">,
) {
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    x: rect.left,
    y: rect.top,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    toJSON: () => ({}),
  } as DOMRect);
}

async function openPicker(hex = "#FF0000") {
  const onChange = vi.fn();
  const view = render(
    <HexColorPicker value={hex} onChange={onChange} ariaLabel="fill hex" />,
  );
  await userEvent.click(screen.getByRole("button", { name: "fill hex picker" }));
  const dialog = screen.getByRole("dialog", { name: "fill hex color picker" });
  const sv = dialog.querySelector('[class*="sv"]') as HTMLDivElement;
  const hue = dialog.querySelector('[class*="hue"]') as HTMLDivElement;
  expect(sv).toBeTruthy();
  expect(hue).toBeTruthy();
  return { onChange, view, dialog, sv, hue };
}

beforeEach(() => {
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
});

describe("HexColorPicker", () => {
  it("renders a closed swatch with the current color", () => {
    render(
      <HexColorPicker value="#5AE5BB" onChange={() => undefined} ariaLabel="fill hex" />,
    );
    const swatch = screen.getByRole("button", { name: "fill hex picker" });
    expect(swatch).toHaveAttribute("aria-expanded", "false");
    expect(swatch).toHaveAttribute("title", "#5AE5BB");
    expect(swatch).toHaveStyle({ backgroundColor: "rgb(90, 229, 187)" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens and closes the picker from the swatch", async () => {
    render(
      <HexColorPicker value="#FF0000" onChange={() => undefined} ariaLabel="fill hex" />,
    );
    const swatch = screen.getByRole("button", { name: "fill hex picker" });
    await userEvent.click(swatch);
    expect(screen.getByRole("dialog", { name: "fill hex color picker" })).toBeInTheDocument();
    expect(swatch).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(swatch);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(swatch).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on Escape", async () => {
    await openPicker();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when clicking outside", async () => {
    await openPicker();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("emits a normalized hex when typing in the panel input", async () => {
    const { onChange } = await openPicker("#FFFFFF");
    const input = screen.getByLabelText("fill hex");
    await userEvent.clear(input);
    await userEvent.type(input, "5ae5bb");
    expect(onChange).toHaveBeenCalledWith("#5AE5BB");
    expect(input).toHaveValue("#5AE5BB");
  });

  it("accepts pasted hex values", async () => {
    const { onChange } = await openPicker("#000000");
    const input = screen.getByLabelText("fill hex");
    await userEvent.clear(input);
    await userEvent.paste("#ABCDEF");
    expect(onChange).toHaveBeenCalledWith("#ABCDEF");
  });

  it("reverts invalid hex text on blur", async () => {
    await openPicker("#112233");
    const input = screen.getByLabelText("fill hex");
    await userEvent.clear(input);
    await userEvent.type(input, "not-a-color");
    fireEvent.blur(input);
    expect(input).toHaveValue("#112233");
  });

  it("does not emit when committing the same hex value", async () => {
    const { onChange } = await openPicker("#FF0000");
    onChange.mockClear();
    const input = screen.getByLabelText("fill hex");
    fireEvent.blur(input);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("updates saturation/value from SV pointer position", async () => {
    const { onChange, sv } = await openPicker("#FF0000");
    mockRect(sv, { left: 0, top: 0, width: 100, height: 100 });

    // Bottom-right → s=1, v=0 → black
    fireEvent.pointerDown(sv, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(onChange).toHaveBeenCalledWith("#000000");
  });

  it("updates hue from the hue slider", async () => {
    const { onChange, hue } = await openPicker("#FF0000");
    mockRect(hue, { left: 0, top: 0, width: 360, height: 12 });

    fireEvent.pointerDown(hue, { clientX: 180, clientY: 6, pointerId: 1 });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)?.[0] as string;
    expect(last).toMatch(/^#[0-9A-F]{6}$/);
    expect(last).not.toBe("#FF0000");
  });

  it("keeps hue when dragging the SV cursor toward white", async () => {
    const initial = "#00FFB2";
    const initialHue = hexToHsv(initial)!.h;
    const { onChange, sv, view } = await openPicker(initial);
    mockRect(sv, { left: 0, top: 0, width: 100, height: 100 });

    // Drag toward white (left, top)
    fireEvent.pointerDown(sv, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(sv, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerUp(sv, { clientX: 0, clientY: 0, pointerId: 1 });
    expect(onChange).toHaveBeenCalledWith("#FFFFFF");

    // Parent echoes white; picker must not forget the previous hue
    view.rerender(
      <HexColorPicker value="#FFFFFF" onChange={onChange} ariaLabel="fill hex" />,
    );
    const swatch = screen.getByRole("button", { name: "fill hex picker" });
    if (swatch.getAttribute("aria-expanded") !== "true") {
      await userEvent.click(swatch);
    }
    const dialog = screen.getByRole("dialog", { name: "fill hex color picker" });
    const svAgain = dialog.querySelector('[class*="sv"]') as HTMLDivElement;
    mockRect(svAgain, { left: 0, top: 0, width: 100, height: 100 });

    onChange.mockClear();
    // Full saturation / full value at preserved hue
    fireEvent.pointerDown(svAgain, { clientX: 100, clientY: 0, pointerId: 2 });
    const restored = onChange.mock.calls.at(-1)?.[0] as string;
    expect(restored).toBe(hsvToHex({ h: initialHue, s: 1, v: 1 }));
    expect(restored).not.toBe("#FF0000");
  });

  it("syncs when the controlled value changes from outside", async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <HexColorPicker value="#FF0000" onChange={onChange} ariaLabel="fill hex" />,
    );
    await userEvent.click(screen.getByRole("button", { name: "fill hex picker" }));
    expect(screen.getByLabelText("fill hex")).toHaveValue("#FF0000");

    rerender(<HexColorPicker value="#0000FF" onChange={onChange} ariaLabel="fill hex" />);
    expect(screen.getByLabelText("fill hex")).toHaveValue("#0000FF");
    expect(screen.getByRole("button", { name: "fill hex picker" })).toHaveAttribute(
      "title",
      "#0000FF",
    );
  });

  it("does not expose RGB or HSL mode controls", async () => {
    await openPicker();
    expect(screen.queryByText(/^rgb$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^hsl$/i)).not.toBeInTheDocument();
    expect(screen.getByText("HEX")).toBeInTheDocument();
  });

  it("renders the open panel in a body portal", async () => {
    await openPicker();
    const dialog = screen.getByRole("dialog", { name: "fill hex color picker" });
    expect(dialog.parentElement).toBe(document.body);
  });

  it("stops Escape from reaching bubble listeners while open", async () => {
    const bubble = vi.fn();
    window.addEventListener("keydown", bubble);
    try {
      await openPicker();
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(bubble).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener("keydown", bubble);
    }
  });

  it("positions the panel with align=start near the swatch left edge", async () => {
    render(
      <HexColorPicker
        value="#FF0000"
        onChange={() => undefined}
        ariaLabel="fill hex"
        align="start"
      />,
    );
    const swatch = screen.getByRole("button", { name: "fill hex picker" });
    const root = swatch.parentElement;
    expect(root).toBeTruthy();
    mockRect(root!, { left: 40, top: 80, width: 25, height: 25 });
    await userEvent.click(swatch);
    const dialog = screen.getByRole("dialog", { name: "fill hex color picker" });
    expect(dialog.style.position).toBe("fixed");
    expect(dialog.style.left).toBe("40px");
    expect(dialog.style.top).toBe("111px");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TypographyCard } from "@widgets/properties-panel/ui/TypographyCard";

const palette = [
  { token: "bg", hex: "#000000" },
  { token: "fg", hex: "#FFFFFF" },
];

const defaultProps = {
  text: "Hi",
  fontFamily: "BDF",
  fontSize: 7,
  fontStyle: "regular" as const,
};

describe("TypographyCard: label mode (with align)", () => {
  it("renders the typography group and font controls", () => {
    render(
      <TypographyCard
        props={defaultProps}
        style={{ textColor: { kind: "hex", value: "#FFFFFF" } }}
        palette={palette}
        backgroundDefaultEnabled={false}
        showBackground
        onPropsChange={() => undefined}
        onStyleChange={() => undefined}
        align="left"
        onAlignChange={() => undefined}
      />,
    );
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "font family" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "font size" })).toBeInTheDocument();
  });

  it("changes font size", async () => {
    const handler = vi.fn();
    render(
      <TypographyCard
        props={defaultProps}
        style={{}}
        palette={palette}
        backgroundDefaultEnabled={false}
        showBackground
        onPropsChange={handler}
        onStyleChange={() => undefined}
        align="left"
        onAlignChange={() => undefined}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "font size" }));
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(0);
    await userEvent.click(options[0]);
    expect(handler).toHaveBeenCalled();
    const last = handler.mock.calls.at(-1)?.[0] as { fontSize: number };
    expect(typeof last.fontSize).toBe("number");
  });

  it("emits horizontal align change", async () => {
    const handler = vi.fn();
    render(
      <TypographyCard
        props={defaultProps}
        style={{}}
        palette={palette}
        backgroundDefaultEnabled={false}
        showBackground
        onPropsChange={() => undefined}
        onStyleChange={() => undefined}
        align="left"
        onAlignChange={handler}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Align center" }));
    expect(handler).toHaveBeenCalledWith("center");
    await userEvent.click(screen.getByRole("button", { name: "Align right" }));
    expect(handler).toHaveBeenCalledWith("right");
  });
});

describe("TypographyCard: padding controls (button mode)", () => {
  it("renders padding fields", () => {
    render(
      <TypographyCard
        props={defaultProps}
        style={{}}
        palette={palette}
        backgroundDefaultEnabled
        showBackground={false}
        onPropsChange={() => undefined}
        onStyleChange={() => undefined}
        paddingControls={{
          horizontalAlign: "center",
          verticalAlign: "center",
          top: 1, right: 2, bottom: 3, left: 4,
          onChange: () => undefined,
        }}
      />,
    );
    expect(screen.getByText("top")).toBeInTheDocument();
    expect(screen.getByText("right")).toBeInTheDocument();
    expect(screen.getByText("bottom")).toBeInTheDocument();
    expect(screen.getByText("left")).toBeInTheDocument();
  });

  it("emits padding changes via NumberFields", async () => {
    const handler = vi.fn();
    render(
      <TypographyCard
        props={defaultProps}
        style={{}}
        palette={palette}
        backgroundDefaultEnabled
        showBackground={false}
        onPropsChange={() => undefined}
        onStyleChange={() => undefined}
        paddingControls={{
          horizontalAlign: "center",
          verticalAlign: "center",
          top: 0, right: 0, bottom: 0, left: 0,
          onChange: handler,
        }}
      />,
    );
    const inputs = screen.getAllByRole("spinbutton");
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "6");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith({ paddingTop: 6 });
  });
});

describe("TypographyCard: background toggle", () => {
  it("toggling background emits drawBackground style change", async () => {
    const handler = vi.fn();
    render(
      <TypographyCard
        props={defaultProps}
        style={{}}
        palette={palette}
        backgroundDefaultEnabled={false}
        showBackground
        onPropsChange={() => undefined}
        onStyleChange={handler}
      />,
    );
    const cards = screen.getAllByRole("checkbox");
    await userEvent.click(cards.at(-1)!);
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls.at(-1)?.[0]).toMatchObject({ drawBackground: true });
  });
});

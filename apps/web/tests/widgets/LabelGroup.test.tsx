import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LabelGroup } from "@widgets/properties-panel/groups/LabelGroup";

import { makeLabel } from "../fixtures/projects";

describe("LabelGroup", () => {
  it("renders a text block and emits text changes", () => {
    const handler = vi.fn();
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    const input = screen.getByLabelText("label text");
    expect(input).toHaveValue("Hi");
    expect(screen.getByTestId("typography-card")).toContainElement(input);
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();

    fireEvent.change(input, { target: { value: "Hello" } });
    expect(handler).toHaveBeenLastCalledWith({ text: "Hello" });

    fireEvent.change(input, { target: { value: "Hello\r\nWorld" } });
    expect(handler).toHaveBeenLastCalledWith({ text: "Hello\nWorld" });
  });

  it("collapses and expands the Text section", () => {
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );

    expect(screen.getByLabelText("label text")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("typography-card-collapse"));
    expect(screen.queryByLabelText("label text")).not.toBeInTheDocument();
    expect(screen.queryByText("Typography")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("typography-card-collapse"));
    expect(screen.getByLabelText("label text")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
  });

  it("exposes vertical alignment and emits changes", () => {
    const handler = vi.fn();
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    expect(screen.getByRole("group", { name: "vertical align" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Align top" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Align middle" }));
    expect(handler).toHaveBeenLastCalledWith({ verticalAlign: "center" });
  });

  it("renders text color and background outside the typography card", () => {
    const node = makeLabel("lbl_1", "Hi");
    const { container } = render(
      <LabelGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );

    const typographyCard = screen.getByTestId("typography-card");
    expect(typographyCard).toHaveTextContent("Typography");
    expect(typographyCard).toContainElement(screen.getByLabelText("label text"));
    expect(typographyCard).not.toHaveTextContent("Color");
    expect(typographyCard).not.toHaveTextContent("Background");
    expect(container.querySelector("[data-testid='typography-card'] [class*='typographyColorGrid']")).toBeNull();

    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
  });

  it("collapses and expands the Appearance section", async () => {
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );

    expect(screen.getByText("Color")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("appearance-collapse"));
    expect(screen.queryByText("Color")).not.toBeInTheDocument();
    expect(screen.queryByText("Background")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("appearance-collapse"));
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByText("Background")).toBeInTheDocument();
  });
});

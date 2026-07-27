import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ButtonGroup } from "@widgets/properties-panel/groups/ButtonGroup";

import { makeButton } from "../fixtures/projects";

describe("ButtonGroup", () => {
  it("renders Content with Icon, Text, and Color cards", () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByText("Icon")).toBeInTheDocument();
    const textCard = screen.getByTestId("typography-card");
    expect(textCard).toHaveTextContent("Text");
    expect(textCard).toHaveTextContent("Typography");
    expect(textCard).toHaveTextContent("Padding");
    expect(textCard).not.toHaveTextContent("Color");
    const colorCard = screen.getByTestId("color-card");
    expect(colorCard).toHaveTextContent("Color");
    expect(screen.getByLabelText("Show text")).toBeChecked();
    expect(screen.queryByLabelText("button text")).toBeNull();
  });

  it("can hide button text with the show-text checkbox", async () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    await userEvent.click(screen.getByLabelText("Show text"));
    expect(handler).toHaveBeenLastCalledWith({ text: undefined });
  });

  it("restores previous text when show-text is re-enabled", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = { ...button, props: { ...(button.props ?? {}), text: undefined } };
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    expect(screen.getByLabelText("Show text")).not.toBeChecked();
    expect(screen.getByText(/Enable text to edit typography and padding/)).toBeInTheDocument();
    expect(screen.getByTestId("color-card")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Show text"));
    expect(handler).toHaveBeenLastCalledWith({ text: "Button" });
  });

  it("emits padding alignment changes", () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Align left" }));
    expect(handler).toHaveBeenLastCalledWith({ horizontalAlign: "left" });
  });

  it("emits vertical alignment changes", () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Align bottom" }));
    expect(handler).toHaveBeenLastCalledWith({ verticalAlign: "bottom" });
  });

  it("emits typography changes", async () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "font size" }));
    await userEvent.click(screen.getAllByRole("option")[0]);
    expect(handler).toHaveBeenCalled();
    expect(handler.mock.calls.at(-1)?.[0]).toMatchObject({ fontFace: undefined });
  });

  it("enables a button icon", async () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.click(screen.getByLabelText("Show icon"));
    expect(handler).toHaveBeenLastCalledWith({ iconId: "earth" });
  });

  it("emits icon layout changes", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = { ...button, props: { ...(button.props ?? {}), iconId: "earth" } };
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("Position"), "right");
    expect(handler).toHaveBeenLastCalledWith({ iconPosition: "right" });
  });

  it("clears the icon search without removing the selected icon", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = { ...button, props: { ...(button.props ?? {}), iconId: "earth" } };
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.clear(screen.getByLabelText("iconId"));
    expect(handler).not.toHaveBeenCalledWith({ iconId: "" });
  });
});

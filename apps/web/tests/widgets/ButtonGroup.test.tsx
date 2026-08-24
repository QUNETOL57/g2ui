import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ButtonGroup } from "@widgets/properties-panel/groups/ButtonGroup";

import { makeButton } from "../fixtures/projects";

describe("ButtonGroup", () => {
  it("renders Content with Icons and Text cards", () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.getByText("Content")).toBeInTheDocument();
    expect(screen.getByTestId("icons-card")).toHaveTextContent("Icons");
    expect(screen.getByLabelText("Show icons")).toBeChecked();
    expect(screen.getByRole("button", { name: "Add icon" })).toBeInTheDocument();
    const textCard = screen.getByTestId("typography-card");
    expect(textCard).toHaveTextContent("Text");
    expect(textCard).toHaveTextContent("Typography");
    expect(textCard).toHaveTextContent("Padding");
    expect(textCard).toHaveTextContent("Color");
    expect(textCard).toContainElement(screen.getByLabelText("button text"));
    expect(screen.queryByTestId("color-card")).toBeNull();
    expect(screen.getByLabelText("Show text")).toBeChecked();
    expect(screen.getByLabelText("button text")).toHaveValue("Save");
  });

  it("emits button text changes from the inspector field", () => {
    const handler = vi.fn();
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    fireEvent.change(screen.getByLabelText("button text"), { target: { value: "OK" } });
    expect(handler).toHaveBeenLastCalledWith({ text: "OK" });
  });

  it("collapses and expands the Content section", async () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.getByTestId("icons-card")).toBeInTheDocument();
    await userEvent.click(screen.getByTestId("button-content-collapse"));
    expect(screen.queryByTestId("icons-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("typography-card")).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId("button-content-collapse"));
    expect(screen.getByTestId("icons-card")).toBeInTheDocument();
    expect(screen.getByTestId("typography-card")).toBeInTheDocument();
  });

  it("collapses Icons and Text nested cards independently", async () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );

    await userEvent.click(screen.getByTestId("icons-card-collapse"));
    expect(screen.getByTestId("icons-card")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByLabelText("Add icon")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show icons")).toBeChecked();
    expect(screen.getByTestId("typography-card")).toHaveTextContent("Typography");

    await userEvent.click(screen.getByTestId("typography-card-collapse"));
    expect(screen.getByTestId("typography-card")).toHaveAttribute("data-collapsed", "true");
    expect(screen.queryByText("Typography")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Show text")).toBeChecked();
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

  it("can hide the icons block and clear icons", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left", paddingRight: 2 }],
      },
    };
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    expect(screen.getByTestId("button-icon-card-0")).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText("Show icons"));
    expect(handler).toHaveBeenLastCalledWith({
      icons: [],
      iconId: undefined,
      iconPosition: undefined,
      iconGap: undefined,
    });
    expect(screen.getByText(/Enable icons to add them/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add icon" })).toBeNull();
  });

  it("restores previous icons when show-icons is re-enabled", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const savedIcons = [{ iconId: "earth", position: "left" as const, paddingRight: 2 }];
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: savedIcons,
      },
    };
    const { rerender } = render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    await userEvent.click(screen.getByLabelText("Show icons"));
    rerender(
      <ButtonGroup
        node={{ ...node, props: { ...(node.props ?? {}), icons: [] } }}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );
    await userEvent.click(screen.getByLabelText("Show icons"));
    expect(handler.mock.calls.at(-1)?.[0]).toMatchObject({
      icons: savedIcons,
    });
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
    expect(screen.getByTestId("icons-card")).toBeInTheDocument();
    expect(screen.queryByTestId("color-card")).toBeNull();

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

  it("adds a button icon", async () => {
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

    await userEvent.click(screen.getByRole("button", { name: "Add icon" }));
    expect(handler).toHaveBeenLastCalledWith({
      icons: [{ iconId: "earth", position: "left", paddingRight: 2 }],
      iconId: undefined,
      iconPosition: undefined,
      iconGap: undefined,
    });
  });

  it("emits icon layout and padding changes", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left", paddingRight: 2 }],
      },
    };
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    expect(screen.getByTestId("button-icon-card-0")).toHaveTextContent("Padding");
    expect(screen.getByTestId("button-icon-card-0")).toHaveTextContent("Color");
    await userEvent.selectOptions(screen.getByLabelText("Icon 1 position"), "right");
    expect(handler).toHaveBeenLastCalledWith({
      icons: [{ iconId: "earth", position: "right", paddingRight: 2 }],
      iconId: undefined,
      iconPosition: undefined,
      iconGap: undefined,
    });
  });

  it("clears the icon search without removing the selected icon", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left" }],
      },
    };
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.clear(screen.getByLabelText("iconId"));
    expect(handler).not.toHaveBeenCalledWith(
      expect.objectContaining({
        icons: [expect.objectContaining({ iconId: "" })],
      }),
    );
  });

  it("can add a second icon", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left", paddingRight: 2 }],
      },
    };
    render(
      <ButtonGroup
        node={node}
        palette={[]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Add icon" }));
    expect(handler.mock.calls.at(-1)?.[0]).toMatchObject({
      icons: [
        { iconId: "earth", position: "left", paddingRight: 2 },
        { iconId: "earth", position: "right", paddingLeft: 2 },
      ],
    });
  });

  it("shows a legacy iconId as Icon 1 via resolveButtonIcons", () => {
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: { ...(button.props ?? {}), iconId: "earth", iconPosition: "top", iconGap: 4 },
    };
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );

    expect(screen.getByTestId("button-icon-card-0")).toBeInTheDocument();
    expect(screen.getByLabelText("Icon 1 position")).toHaveValue("top");
  });

  it("removes an icon with the trash button", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [
          { iconId: "earth", position: "left", paddingRight: 2 },
          { iconId: "chart", position: "right", paddingLeft: 2 },
        ],
      },
    };
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    await userEvent.click(screen.getByLabelText("Remove icon 1"));
    expect(handler).toHaveBeenLastCalledWith({
      icons: [{ iconId: "chart", position: "right", paddingLeft: 2 }],
      iconId: undefined,
      iconPosition: undefined,
      iconGap: undefined,
    });
  });

  it("places Padding above Color in the icon card", () => {
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left" }],
      },
    };
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );

    const cardText = screen.getByTestId("button-icon-card-0").textContent ?? "";
    expect(cardText.indexOf("Padding")).toBeGreaterThan(-1);
    expect(cardText.indexOf("Color")).toBeGreaterThan(-1);
    expect(cardText.indexOf("Padding")).toBeLessThan(cardText.indexOf("Color"));
  });

  it("emits icon padding changes", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [
          {
            iconId: "earth",
            position: "left",
            paddingTop: 0,
            paddingRight: 2,
            paddingBottom: 0,
            paddingLeft: 0,
          },
        ],
      },
    };
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    const card = screen.getByTestId("button-icon-card-0");
    const inputs = card.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBeGreaterThanOrEqual(4);
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "6");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        icons: [expect.objectContaining({ paddingTop: 6, iconId: "earth" })],
      }),
    );
  });

  it("emits icon color changes", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    button.style = { ...(button.style ?? {}), textColor: { kind: "hex", value: "#FFFFFF" } };
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left" }],
      },
    };
    render(
      <ButtonGroup
        node={node}
        palette={[
          { token: "fg", hex: "#FFFFFF" },
          { token: "accent", hex: "#1E90FF" },
        ]}
        onChange={handler}
        onStyleChange={() => undefined}
      />,
    );

    const card = screen.getByTestId("button-icon-card-0");
    await userEvent.click(within(card).getByRole("button", { name: "color hex picker" }));
    const hexInput = await screen.findByRole("textbox", { name: "color hex" });
    await userEvent.clear(hexInput);
    await userEvent.type(hexInput, "#00FF00");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        icons: [expect.objectContaining({ color: { kind: "hex", value: "#00FF00" } })],
      }),
    );
  });

  it("selects an icon by typing a known iconId", async () => {
    const handler = vi.fn();
    const button = makeButton("bt_1", "Save");
    const node = {
      ...button,
      props: {
        ...(button.props ?? {}),
        icons: [{ iconId: "earth", position: "left" }],
      },
    };
    render(
      <ButtonGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );

    const search = screen.getByLabelText("iconId");
    await userEvent.clear(search);
    await userEvent.type(search, "chart");
    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        icons: [expect.objectContaining({ iconId: "chart" })],
      }),
    );
  });

  it("keeps Add icon control styled as an add action", () => {
    const node = makeButton("bt_1", "Save");
    render(
      <ButtonGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    const add = screen.getByRole("button", { name: "Add icon" });
    expect(add.className).toMatch(/addItemButton/);
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectedGroup } from "@widgets/properties-panel/groups/SelectedGroup";

import { makeFixtureProject, makeLabel } from "../fixtures/projects";

describe("SelectedGroup", () => {
  it("shows an accessible type icon and node id", () => {
    const node = makeLabel("lbl_1", "Hello");
    render(<SelectedGroup node={node} updateNode={() => undefined} />);
    expect(screen.getByRole("img", { name: "label node" })).toHaveAttribute("title", "label");
    expect(screen.queryByText("label")).not.toBeInTheDocument();
    expect(screen.getByText("lbl_1")).toBeInTheDocument();
  });

  it("renders name field with current value and edits it", async () => {
    const node = makeLabel("lbl_1");
    node.name = "Original";
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} />);
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveValue("Original");
    await userEvent.type(input, "X");
    expect(handler).toHaveBeenCalled();
    const lastArg = handler.mock.calls.at(-1) as [string, { name?: string }];
    expect(lastArg[0]).toBe("lbl_1");
    expect(lastArg[1].name).toContain("X");
  });

  it("emits undefined name when input is cleared", async () => {
    const node = makeLabel("lbl_1");
    node.name = "Original";
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} />);
    const input = screen.getByRole("textbox");
    await userEvent.clear(input);
    expect(handler).toHaveBeenLastCalledWith("lbl_1", { name: undefined });
  });

  it("toggles visibility via icon button", async () => {
    const node = { ...makeLabel("lbl_1"), visible: true };
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide lbl_1" }));
    expect(handler).toHaveBeenCalledWith("lbl_1", { visible: false });
  });

  it("toggles lock via icon button", async () => {
    const node = { ...makeLabel("lbl_1"), locked: false };
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} />);
    await userEvent.click(screen.getByRole("button", { name: "Lock lbl_1" }));
    expect(handler).toHaveBeenCalledWith("lbl_1", { locked: true });
  });

  it("disables name input when the node is locked", () => {
    const node = { ...makeLabel("lbl_1"), locked: true, name: "Locked" };
    render(<SelectedGroup node={node} updateNode={() => undefined} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unlock Locked" })).toBeInTheDocument();
  });

  it("shows visibility and lock icons in the summary title row", () => {
    const node = makeLabel("lbl_1", "Hello");
    render(<SelectedGroup node={node} updateNode={() => undefined} />);
    expect(screen.getByRole("button", { name: "Hide lbl_1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock lbl_1" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Visible on canvas/i)).not.toBeInTheDocument();
  });

  it("hides visibility and lock toggles for screen nodes", () => {
    const screenNode = makeFixtureProject().screens[0];
    render(<SelectedGroup node={screenNode} updateNode={() => undefined} />);
    expect(screen.getByRole("img", { name: "screen node" })).toHaveAttribute("title", "screen");
    expect(screen.queryByText("screen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hide/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lock/i })).not.toBeInTheDocument();
  });
});

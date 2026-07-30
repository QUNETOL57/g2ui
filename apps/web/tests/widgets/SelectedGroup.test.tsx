import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { SelectedGroup } from "@widgets/properties-panel/groups/SelectedGroup";

import { makeFixtureProject, makeLabel, withChildren } from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

beforeEach(() => {
  resetEditorStore(withChildren(makeFixtureProject(), [makeLabel("lbl_1", "Hello")]));
});

describe("SelectedGroup", () => {
  it("shows an accessible type icon and editable widget id", () => {
    const node = makeLabel("lbl_1", "Hello");
    render(
      <SelectedGroup node={node} updateNode={() => undefined} renameNode={() => true} />,
    );
    expect(screen.getByRole("img", { name: "label node" })).toHaveAttribute("title", "label");
    expect(screen.queryByText("label")).not.toBeInTheDocument();
    expect(screen.getByLabelText("id")).toHaveValue("lbl_1");
  });

  it("renders name field with current value and edits it", async () => {
    const node = makeLabel("lbl_1");
    node.name = "Original";
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} renameNode={() => true} />);
    const input = screen.getByLabelText("name") as HTMLInputElement;
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
    render(<SelectedGroup node={node} updateNode={handler} renameNode={() => true} />);
    const input = screen.getByLabelText("name");
    await userEvent.clear(input);
    expect(handler).toHaveBeenLastCalledWith("lbl_1", { name: undefined });
  });

  it("toggles visibility via icon button", async () => {
    const node = { ...makeLabel("lbl_1"), visible: true };
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} renameNode={() => true} />);
    await userEvent.click(screen.getByRole("button", { name: "Hide lbl_1" }));
    expect(handler).toHaveBeenCalledWith("lbl_1", { visible: false });
  });

  it("toggles lock via icon button", async () => {
    const node = { ...makeLabel("lbl_1"), locked: false };
    const handler = vi.fn();
    render(<SelectedGroup node={node} updateNode={handler} renameNode={() => true} />);
    await userEvent.click(screen.getByRole("button", { name: "Lock lbl_1" }));
    expect(handler).toHaveBeenCalledWith("lbl_1", { locked: true });
  });

  it("disables id, name and class inputs when the node is locked", () => {
    const node = { ...makeLabel("lbl_1"), locked: true, name: "Locked" };
    render(
      <SelectedGroup node={node} updateNode={() => undefined} renameNode={() => true} />,
    );
    expect(screen.getByLabelText("id")).toBeDisabled();
    expect(screen.getByLabelText("name")).toBeDisabled();
    expect(screen.getByLabelText("class")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Unlock Locked" })).toBeInTheDocument();
  });

  it("shows visibility and lock icons in the summary title row", () => {
    const node = makeLabel("lbl_1", "Hello");
    render(
      <SelectedGroup node={node} updateNode={() => undefined} renameNode={() => true} />,
    );
    expect(screen.getByRole("button", { name: "Hide lbl_1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lock lbl_1" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Visible on canvas/i)).not.toBeInTheDocument();
  });

  it("hides visibility and lock toggles for screen nodes", () => {
    const screenNode = makeFixtureProject().screens[0];
    render(
      <SelectedGroup node={screenNode} updateNode={() => undefined} renameNode={() => true} />,
    );
    expect(screen.getByRole("img", { name: "screen node" })).toHaveAttribute("title", "screen");
    expect(screen.queryByText("screen")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Hide/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lock/i })).not.toBeInTheDocument();
  });

  it("renames the widget id on blur when valid", async () => {
    const node = makeLabel("lbl_1", "Hello");
    const renameNode = vi.fn(() => true);
    render(
      <SelectedGroup node={node} updateNode={() => undefined} renameNode={renameNode} />,
    );
    const idInput = screen.getByLabelText("id");
    await userEvent.clear(idInput);
    await userEvent.type(idInput, "lbl_header");
    fireEvent.blur(idInput);
    expect(renameNode).toHaveBeenCalledWith("lbl_1", "lbl_header");
  });

  it("reverts id draft when duplicate and does not rename", async () => {
    resetEditorStore(
      withChildren(makeFixtureProject(), [makeLabel("lbl_1"), makeLabel("lbl_2")]),
    );
    const node = makeLabel("lbl_1");
    const renameNode = vi.fn(() => true);
    render(
      <SelectedGroup node={node} updateNode={() => undefined} renameNode={renameNode} />,
    );
    const idInput = screen.getByLabelText("id");
    await userEvent.clear(idInput);
    await userEvent.type(idInput, "lbl_2");
    fireEvent.blur(idInput);
    expect(renameNode).not.toHaveBeenCalled();
    expect(idInput).toHaveValue("lbl_1");
  });

  it("normalizes class on blur", async () => {
    const node = makeLabel("lbl_1");
    const updateNode = vi.fn();
    render(
      <SelectedGroup node={node} updateNode={updateNode} renameNode={() => true} />,
    );
    const classInput = screen.getByLabelText("class");
    await userEvent.type(classInput, "  btn   primary  ");
    fireEvent.blur(classInput);
    expect(updateNode).toHaveBeenCalledWith("lbl_1", { class: "btn primary" });
  });
});

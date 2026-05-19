import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LayoutGroup } from "@widgets/properties-panel/groups/LayoutGroup";

import { makePanel } from "../fixtures/projects";

describe("LayoutGroup", () => {
  it("renders mode select with current value", () => {
    const node = { ...makePanel("pn"), layout: { mode: "row" as const, padding: 2, gap: 3, align: "center" as const } };
    render(<LayoutGroup node={node} updateLayout={() => undefined} />);
    expect(screen.getByRole("button", { name: "layout mode" })).toHaveTextContent("row");
  });

  it("emits layout mode change", async () => {
    const handler = vi.fn();
    const node = makePanel("pn");
    node.layout = { mode: "absolute" };
    render(<LayoutGroup node={node} updateLayout={handler} />);
    await userEvent.click(screen.getByRole("button", { name: "layout mode" }));
    await userEvent.click(screen.getByRole("option", { name: /column/ }));
    expect(handler).toHaveBeenCalledWith("pn", { mode: "column" });
  });

  it("emits padding and gap changes via NumberFields", async () => {
    const handler = vi.fn();
    const node = makePanel("pn");
    node.layout = { mode: "row", padding: 0, gap: 0 };
    render(<LayoutGroup node={node} updateLayout={handler} />);
    const padding = screen.getAllByRole("spinbutton")[0];
    await userEvent.clear(padding);
    await userEvent.type(padding, "8");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith("pn", { padding: 8 });
    const gap = screen.getAllByRole("spinbutton")[1];
    await userEvent.clear(gap);
    await userEvent.type(gap, "4");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith("pn", { gap: 4 });
  });

  it("emits align change", async () => {
    const handler = vi.fn();
    const node = makePanel("pn");
    node.layout = { mode: "row" };
    render(<LayoutGroup node={node} updateLayout={handler} />);
    await userEvent.click(screen.getByRole("button", { name: "layout align" }));
    await userEvent.click(screen.getByRole("option", { name: /stretch/ }));
    expect(handler).toHaveBeenCalledWith("pn", { align: "stretch" });
  });
});

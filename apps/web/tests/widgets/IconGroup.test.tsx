import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconGroup } from "@widgets/properties-panel/groups/IconGroup";

import { makeIcon } from "../fixtures/projects";

describe("IconGroup", () => {
  it("renders search input with current iconId", () => {
    const node = makeIcon("ic_1", "earth");
    render(<IconGroup node={node} onChange={() => undefined} />);
    expect(screen.getByPlaceholderText(/search or enter iconId/i)).toHaveValue("earth");
  });

  it("emits iconId change when typing into search", async () => {
    const handler = vi.fn();
    const node = makeIcon("ic_1", "earth");
    render(<IconGroup node={node} onChange={handler} />);
    const input = screen.getByPlaceholderText(/search or enter iconId/i);
    await userEvent.type(input, "x");
    expect(handler).toHaveBeenCalled();
    const last = handler.mock.calls.at(-1)?.[0] as { iconId: string };
    expect(last.iconId).toContain("x");
  });

  it("shows 'No icons found' message when search has no matches", async () => {
    const node = { ...makeIcon("ic_1", "earth"), props: { iconId: "zzzzzzz_no_such_icon" } };
    render(<IconGroup node={node} onChange={() => undefined} />);
    expect(screen.getByText(/No icons found/i)).toBeInTheDocument();
  });

  it("clicking an icon tile emits iconId change", async () => {
    const node = { ...makeIcon("ic_1", "earth"), props: { iconId: "" } };
    const handler = vi.fn();
    render(<IconGroup node={node} onChange={handler} />);
    const tiles = screen.getAllByRole("button");
    const someTile = tiles.find((b) => b.title && b.title.length > 0 && b.title !== "Save")!;
    await userEvent.click(someTile);
    expect(handler).toHaveBeenCalledWith({ iconId: someTile.title });
  });
});

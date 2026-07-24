import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LabelGroup } from "@widgets/properties-panel/groups/LabelGroup";

import { makeLabel } from "../fixtures/projects";

describe("LabelGroup", () => {
  it("omits text input from the inspector", () => {
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.queryByLabelText("label text")).toBeNull();
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
});

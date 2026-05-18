import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LabelGroup } from "@widgets/properties-panel/groups/LabelGroup";

import { makeLabel } from "../fixtures/projects";

describe("LabelGroup", () => {
  it("renders label text input with current value", () => {
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={() => undefined} onStyleChange={() => undefined} />,
    );
    expect(screen.getByLabelText("label text")).toHaveValue("Hi");
  });

  it("emits text changes via onChange", async () => {
    const handler = vi.fn();
    const node = makeLabel("lbl_1", "Hi");
    render(
      <LabelGroup node={node} palette={[]} onChange={handler} onStyleChange={() => undefined} />,
    );
    const input = screen.getByLabelText("label text");
    await userEvent.type(input, "X");
    expect(handler).toHaveBeenCalled();
    const lastArg = handler.mock.calls.at(-1)?.[0] as { text: string };
    expect(lastArg.text).toContain("X");
  });
});

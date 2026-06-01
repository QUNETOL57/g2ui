import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

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
});

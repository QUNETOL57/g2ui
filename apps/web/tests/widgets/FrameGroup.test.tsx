import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FrameGroup } from "@widgets/properties-panel/groups/FrameGroup";

import {
  makeButton,
  makeCircle,
  makeFixtureProject,
  makeFreehand,
  makeIcon,
  makeLabel,
  makeLine,
  makeRect,
  makeTriangle,
  withChildren,
} from "../fixtures/projects";

describe("FrameGroup", () => {
  const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);

  it("renders the four transform fields", () => {
    const node = makeButton("b_1");
    render(
      <FrameGroup node={node} project={project} draftFrame={null} updateFrame={() => undefined} />,
    );
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("Y")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
    expect(screen.getByText("H")).toBeInTheDocument();
  });

  it("shows a tooltip when hovering a transform field label", async () => {
    const node = makeButton("b_1");
    render(
      <FrameGroup node={node} project={project} draftFrame={null} updateFrame={() => undefined} />,
    );
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await userEvent.hover(screen.getByText("X"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Horizontal position");

    await userEvent.unhover(screen.getByText("X"));
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    await userEvent.hover(screen.getByText("W"));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Width");
  });

  it("uses draftFrame when provided", () => {
    const node = makeButton("b_1");
    render(
      <FrameGroup
        node={node}
        project={project}
        draftFrame={{ x: 99, y: 100, width: 5, height: 6 }}
        updateFrame={() => undefined}
      />,
    );
    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs[0]).toHaveValue(99);
    expect(inputs[1]).toHaveValue(100);
    expect(inputs[2]).toHaveValue(5);
    expect(inputs[3]).toHaveValue(6);
  });

  it("commits a new X value via updateFrame on blur", async () => {
    const node = { ...makeButton("b_1"), frame: { x: 0, y: 0, width: 10, height: 10 } };
    const handler = vi.fn();
    render(<FrameGroup node={node} project={project} draftFrame={null} updateFrame={handler} />);
    const inputs = screen.getAllByRole("spinbutton");
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "5");
    await userEvent.tab();
    expect(handler).toHaveBeenCalledWith("b_1", { x: 5 });
  });

  it("shows rotate buttons for rect, circle, triangle and line", () => {
    for (const node of [
      { ...makeRect("rc_1"), rotation: 45 },
      { ...makeCircle("cir_1"), rotation: 10 },
      { ...makeTriangle("tri_1"), rotation: 200 },
      { ...makeLine("ln_1"), rotation: 270 },
    ]) {
      const shapeProject = withChildren(makeFixtureProject(), [node]);
      const { unmount } = render(
        <FrameGroup
          node={node}
          project={shapeProject}
          draftFrame={null}
          updateFrame={() => undefined}
          updateNode={() => undefined}
        />,
      );
      expect(screen.queryByText("R")).not.toBeInTheDocument();
      const alignToolbar = screen.getByRole("toolbar", { name: "Align in parent" });
      expect(alignToolbar).toContainElement(screen.getByRole("group", { name: "Rotate shape" }));
      unmount();
    }
  });

  it("does not show rotation controls for freehand, button or label", () => {
    for (const node of [makeFreehand("fre_1"), makeButton("b_1"), makeLabel("lbl_1")]) {
      const { unmount } = render(
        <FrameGroup
          node={node}
          project={project}
          draftFrame={null}
          updateFrame={() => undefined}
          updateNode={() => undefined}
        />,
      );
      expect(screen.queryByRole("group", { name: "Rotate shape" })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("rotates clockwise and counter-clockwise by 90° via toolbar buttons", async () => {
    const node = { ...makeRect("rc_1"), rotation: 90 };
    const updateNode = vi.fn();
    render(
      <FrameGroup
        node={node}
        project={withChildren(makeFixtureProject(), [node])}
        draftFrame={null}
        updateFrame={() => undefined}
        updateNode={updateNode}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Rotate 90° clockwise" }));
    expect(updateNode).toHaveBeenCalledWith("rc_1", { rotation: 180 });

    await userEvent.click(screen.getByRole("button", { name: "Rotate 90° counter-clockwise" }));
    expect(updateNode).toHaveBeenLastCalledWith("rc_1", { rotation: 0 });
  });

  it.each([
    ["rect", makeRect("rc_1"), 0, 90],
    ["circle", makeCircle("cir_1"), 90, 180],
    ["triangle", makeTriangle("tri_1"), 180, 270],
    ["line", makeLine("ln_1"), 270, 0],
  ] as const)("rotates %s from %i to %i clockwise", async (_type, base, from, to) => {
    const updateNode = vi.fn();
    const node = { ...base, rotation: from };
    render(
      <FrameGroup
        node={node}
        project={withChildren(makeFixtureProject(), [node])}
        draftFrame={null}
        updateFrame={() => undefined}
        updateNode={updateNode}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Rotate 90° clockwise" }));
    expect(updateNode).toHaveBeenCalledWith(base.id, { rotation: to });
  });

  it("disables rotate controls when the node is locked", () => {
    const node = { ...makeLine("ln_1"), rotation: 0, locked: true };
    render(
      <FrameGroup
        node={node}
        project={project}
        draftFrame={null}
        updateFrame={() => undefined}
        updateNode={() => undefined}
        disabled
      />,
    );
    expect(screen.getByRole("button", { name: "Rotate 90° clockwise" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Rotate 90° counter-clockwise" })).toBeDisabled();
  });

  it("clamps W to icon definition size for icon nodes", async () => {
    const node = makeIcon("ic_1", "earth");
    const handler = vi.fn();
    render(<FrameGroup node={node} project={project} draftFrame={null} updateFrame={handler} />);
    const inputs = screen.getAllByRole("spinbutton");
    const widthInput = inputs[2];
    expect(widthInput).toHaveAttribute("min");
  });

  it("shows parent align icon controls for widgets inside an absolute parent", () => {
    render(
      <FrameGroup
        node={project.screens[0].children![0]}
        project={project}
        draftFrame={null}
        updateFrame={() => undefined}
      />,
    );
    expect(screen.getByRole("toolbar", { name: "Align in parent" })).toBeInTheDocument();
    expect(screen.getByLabelText("Align center in parent")).toBeInTheDocument();
  });

  it("aligns the widget within the screen when an icon button is clicked", async () => {
    const node = {
      ...makeLabel("lbl_1"),
      frame: { x: 0, y: 0, width: 20, height: 7 },
    };
    const handler = vi.fn();
    render(<FrameGroup node={node} project={project} draftFrame={null} updateFrame={handler} />);

    await userEvent.click(screen.getByLabelText("Align center in parent"));
    expect(handler).toHaveBeenCalledWith("lbl_1", { x: 70 });

    await userEvent.click(screen.getByLabelText("Align right in parent"));
    expect(handler).toHaveBeenLastCalledWith("lbl_1", { x: 140 });
  });

  it("updates Y when vertical parent align is clicked", async () => {
    const node = {
      ...makeLabel("lbl_1"),
      frame: { x: 70, y: 0, width: 20, height: 7 },
    };
    const handler = vi.fn();
    render(<FrameGroup node={node} project={project} draftFrame={null} updateFrame={handler} />);

    await userEvent.click(screen.getByLabelText("Align bottom in parent"));
    expect(handler).toHaveBeenCalledWith("lbl_1", { y: 121 });
  });
});

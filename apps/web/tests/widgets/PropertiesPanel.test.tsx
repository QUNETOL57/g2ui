import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";

import {
  makeButton,
  makeCircle,
  makeFixtureProject,
  makeFreehand,
  makeIcon,
  makeLabel,
  makeLine,
  makePanel,
  makeQrCode,
  makeRect,
  makeTriangle,
  withChildren,
} from "../fixtures/projects";
import { resetEditorStore } from "../fixtures/store";

const get = () => useEditorStore.getState();

function selectAndRender(nodeId: string | null) {
  if (nodeId) get().selectNode(nodeId);
  return render(<PropertiesPanel />);
}

beforeEach(() => {
  resetEditorStore();
});

describe("PropertiesPanel: empty state", () => {
  it("shows hint and shortcuts when nothing selected", () => {
    selectAndRender(null);
    expect(screen.getByText(/Select a widget/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Keyboard shortcuts" })).toBeInTheDocument();
    expect(screen.getByText("Undo")).toBeInTheDocument();
    expect(screen.getByText("Zoom canvas")).toBeInTheDocument();
  });

  it("shows marker settings immediately when marker tool is active", async () => {
    get().setActiveTool("marker");
    selectAndRender(null);

    expect(screen.getByText(/Properties · marker/)).toBeInTheDocument();
    expect(screen.getByText("Marker")).toBeInTheDocument();
    expect(screen.getByText("Stroke")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "color hex picker" })).toBeInTheDocument();

    const widthInput = screen.getByRole("spinbutton");
    await userEvent.clear(widthInput);
    await userEvent.type(widthInput, "4");
    await userEvent.tab();
    expect(get().markerStyle.width).toBe(4);

    await userEvent.click(screen.getByRole("button", { name: "color hex picker" }));
    expect(screen.getByRole("dialog", { name: "color hex color picker" })).toBeInTheDocument();
  });

  it("prefers selected widget properties over marker settings", () => {
    const project = withChildren(makeFixtureProject(), [makeTriangle("tri_1")]);
    get().setProject(project);
    get().setActiveTool("marker");
    get().selectNode("tri_1");
    selectAndRender("tri_1");
    expect(screen.getByText(/Properties · triangle/)).toBeInTheDocument();
    expect(screen.queryByText(/Properties · marker/)).not.toBeInTheDocument();
    expect(screen.queryByText("Marker")).not.toBeInTheDocument();
  });
});

describe("PropertiesPanel: multi-selection", () => {
  it("shows a group summary instead of primary widget properties", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_a"), makeLabel("lbl_b")]);
    get().setProject(project);
    get().setSelection(["lbl_a", "lbl_b"], "lbl_b");
    render(<PropertiesPanel />);

    expect(screen.getByText("Выбрано 2 элементов")).toBeInTheDocument();
    expect(screen.queryByText(/Properties · label/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(findNode(get().project, "lbl_a")).toBeNull();
    expect(findNode(get().project, "lbl_b")).toBeNull();
  });
});

describe("PropertiesPanel: per-type groups", () => {
  it("for label shows SelectedGroup + FrameGroup + LabelGroup", () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    selectAndRender("lbl_1");
    expect(screen.getByText(/Properties · label/)).toBeInTheDocument();
    expect(screen.getByText("Transform")).toBeInTheDocument();
    expect(screen.queryByLabelText("label text")).toBeNull();
    expect(screen.getByText("Typography")).toBeInTheDocument();
  });

  it("for button shows text controls without a separate text field", () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    selectAndRender("bt_1");
    expect(screen.getByText(/Properties · button/)).toBeInTheDocument();
    expect(screen.getByText("Text")).toBeInTheDocument();
    expect(screen.getByText("Typography")).toBeInTheDocument();
    expect(screen.getByText("Padding")).toBeInTheDocument();
    expect(screen.getByText("Color")).toBeInTheDocument();
    expect(screen.getByLabelText("Show text")).toBeChecked();
    expect(screen.queryByLabelText("button text")).toBeNull();
  });

  it("for icon shows IconGroup search input", () => {
    const project = withChildren(makeFixtureProject(), [makeIcon("ic_1", "earth")]);
    get().setProject(project);
    selectAndRender("ic_1");
    expect(screen.getByPlaceholderText(/search or enter iconId/i)).toHaveValue("earth");
  });

  it("uses the shared chevron icon for icon-library accordions", () => {
    const project = withChildren(makeFixtureProject(), [makeIcon("ic_1", "earth")]);
    get().setProject(project);
    selectAndRender("ic_1");

    const summary = screen.getByText(/Transport & Places/).closest("summary");
    const chevron = summary?.querySelector("svg");
    expect(chevron).toHaveAttribute("width", "12");
    expect(chevron).toHaveAttribute("height", "12");
    expect(chevron?.querySelector("path")).toHaveAttribute("d", "M6 15l6-6 6 6");
  });

  it("for panel shows LayoutGroup with mode controls", () => {
    const project = withChildren(makeFixtureProject(), [makePanel("pn_1")]);
    get().setProject(project);
    selectAndRender("pn_1");
    expect(screen.getByText("Layout")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "layout mode" })).toBeInTheDocument();
  });

  it("for line shows Appearance / Stroke and rotate controls", () => {
    const project = withChildren(makeFixtureProject(), [makeLine("ln_1")]);
    get().setProject(project);
    selectAndRender("ln_1");
    expect(screen.getByText("Stroke")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Rotate shape" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Align in parent" })).toBeInTheDocument();
  });

  it("for circle shows fill, border and rotation", () => {
    const project = withChildren(makeFixtureProject(), [makeCircle("cir_1")]);
    get().setProject(project);
    selectAndRender("cir_1");
    expect(screen.getByText(/Properties · circle/)).toBeInTheDocument();
    expect(screen.getByText("Fill")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate 90° clockwise" })).toBeInTheDocument();
  });

  it("for triangle shows fill, border and rotation", () => {
    const project = withChildren(makeFixtureProject(), [makeTriangle("tri_1")]);
    get().setProject(project);
    selectAndRender("tri_1");
    expect(screen.getByText(/Properties · triangle/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rotate 90° counter-clockwise" })).toBeInTheDocument();
  });

  it("for rect shows 90° rotate controls", () => {
    const project = withChildren(makeFixtureProject(), [makeRect("rc_1")]);
    get().setProject(project);
    selectAndRender("rc_1");
    expect(screen.getByText(/Properties · rect/)).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Rotate shape" })).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "Align in parent" })).toContainElement(
      screen.getByRole("group", { name: "Rotate shape" }),
    );
  });

  it("for freehand shows stroke controls without rotation", () => {
    const project = withChildren(makeFixtureProject(), [makeFreehand("fre_1")]);
    get().setProject(project);
    selectAndRender("fre_1");
    expect(screen.getByText(/Properties · freehand/)).toBeInTheDocument();
    expect(screen.getByText("Stroke")).toBeInTheDocument();
    expect(screen.queryByText("Fill")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Rotate shape" })).not.toBeInTheDocument();
  });

  it("for qrcode shows payload, encoding and appearance controls", () => {
    const payload = "WIFI:T:WPA;S:WizardPod-AB12;P:x7k9m2pQ;;";
    const project = withChildren(makeFixtureProject(), [makeQrCode("qr_1")]);
    get().setProject(project);
    selectAndRender("qr_1");
    expect(screen.getByText(/Properties · qrcode/)).toBeInTheDocument();
    expect(screen.getByText("QR Code")).toBeInTheDocument();
    expect(screen.getByLabelText("qr text")).toHaveValue(payload);
    expect(screen.queryByText(`${payload.length} chars`)).not.toBeInTheDocument();
    expect(screen.getByText(`${payload.length} chars · current capacity 42 byte chars`)).toBeInTheDocument();
    expect(screen.getByLabelText("qr ecc")).toHaveValue("m");
    expect(screen.getByLabelText("qr version")).toHaveValue("3");
    expect(screen.getByLabelText("qr size")).toHaveValue("m");
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText(/Error correction level/)).toBeInTheDocument();
    expect(screen.getByText("Fill")).toBeInTheDocument();
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Border")).toBeInTheDocument();
    expect(screen.queryByText("Modules")).not.toBeInTheDocument();
    expect(screen.queryByText("Text")).not.toBeInTheDocument();
  });
});

describe("PropertiesPanel: absolute draftFrame conversion", () => {
  it("shows Transform X/Y in parent-local space when store draftFrame is absolute", () => {
    const label = makeLabel("lab_1", "Nested");
    label.frame = { x: 8, y: 12, width: 48, height: 7 };
    const panel = makePanel("pan_1", [label]);
    panel.layout = { mode: "absolute", padding: 0, gap: 0, align: "start", justify: "start" };
    panel.frame = { x: 0, y: 40, width: 160, height: 80 };
    get().setProject(withChildren(makeFixtureProject(), [panel]));
    get().selectNode("lab_1");
    // Absolute canvas draft (parent.y 40 + local 20) — Transform must show local 20, not 60.
    get().setDraftFrame({
      nodeId: "lab_1",
      frame: { x: 8, y: 60, width: 48, height: 7 },
    });

    render(<PropertiesPanel />);

    const inputs = screen.getAllByRole("spinbutton") as HTMLInputElement[];
    expect(inputs[0]).toHaveValue(8);
    expect(inputs[1]).toHaveValue(20);
    expect(inputs[1]).not.toHaveValue(60);
  });
});

describe("PropertiesPanel: writes to store via shared inputs", () => {
  it("rename via SelectedGroup persists to store", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    selectAndRender("lbl_1");
    const nameInput = screen.getByLabelText("name");
    await userEvent.type(nameInput, "renamed");
    const stored = get().project.screens[0].children?.[0];
    expect(stored?.name).toBe("renamed");
  });

  it("X frame update via FrameGroup persists to store", async () => {
    const project = withChildren(makeFixtureProject(), [
      { ...makeButton("bt_1"), frame: { x: 0, y: 0, width: 10, height: 10 } },
    ]);
    get().setProject(project);
    selectAndRender("bt_1");
    const xInput = screen.getAllByRole("spinbutton")[0];
    await userEvent.clear(xInput);
    await userEvent.type(xInput, "20");
    await userEvent.tab();
    expect(get().project.screens[0].children?.[0].frame?.x).toBe(20);
  });

  it("toggling visibility updates store", async () => {
    const project = withChildren(makeFixtureProject(), [makeLabel("lbl_1")]);
    get().setProject(project);
    selectAndRender("lbl_1");
    await userEvent.click(screen.getByRole("button", { name: "Hide lbl_1" }));
    expect(get().project.screens[0].children?.[0].visible).toBe(false);
  });

  it("corner radius update persists to button style", async () => {
    const project = withChildren(makeFixtureProject(), [makeButton("bt_1", "Save")]);
    get().setProject(project);
    selectAndRender("bt_1");

    const cornersToggle = screen.getByText("Corners").closest("label")!;
    await userEvent.click(within(cornersToggle).getByRole("checkbox"));

    const cornersCard = cornersToggle.parentElement!;
    const radiusSlider = within(cornersCard).getByRole("slider", { name: "corner radius" });
    const radiusInput = within(cornersCard).getByLabelText("radius");
    fireEvent.change(radiusSlider, { target: { value: "6" } });

    expect(get().project.screens[0].children?.[0].style?.borderRadius).toBe(6);
    expect(get().project.screens[0].children?.[0].style?.drawCorners).toBe(true);

    await userEvent.clear(radiusInput);
    await userEvent.type(radiusInput, "4");
    expect(get().project.screens[0].children?.[0].style?.borderRadius).toBe(4);
  });

  it("QR text changes auto-pick version and keep JSON matrix-free", async () => {
    const project = withChildren(makeFixtureProject(), [makeQrCode("qr_1")]);
    get().setProject(project);
    selectAndRender("qr_1");

    const textArea = screen.getByLabelText("qr text");
    fireEvent.change(textArea, { target: { value: "A" } });

    const stored = get().project.screens[0].children?.[0];
    expect(stored?.props).toMatchObject({ text: "A", version: 1, ecc: "m", size: "m" });
    expect(stored?.frame).toMatchObject({ width: 84, height: 84 });
    expect(JSON.stringify(stored?.props)).not.toMatch(/modules|matrix|points/);
  });

  it("QR controls disable impossible ECC and version options", () => {
    const project = withChildren(makeFixtureProject(), [makeQrCode("qr_1")]);
    get().setProject(project);
    selectAndRender("qr_1");

    const ecc = screen.getByLabelText("qr ecc") as HTMLSelectElement;
    expect([...ecc.options].find((option) => option.value === "q")?.disabled).toBe(true);
    expect([...ecc.options].find((option) => option.value === "h")?.disabled).toBe(true);

    const version = screen.getByLabelText("qr version") as HTMLSelectElement;
    expect(version.options[0].disabled).toBe(true);
    expect(version.options[1].disabled).toBe(true);
    expect(version.options[2].disabled).toBe(false);
  });

  it("QR selects update ECC, version, size and frame", () => {
    const project = withChildren(makeFixtureProject(), [makeQrCode("qr_1")]);
    get().setProject(project);
    selectAndRender("qr_1");

    fireEvent.change(screen.getByLabelText("qr version"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("qr ecc"), { target: { value: "q" } });
    fireEvent.change(screen.getByLabelText("qr size"), { target: { value: "xs" } });

    const stored = get().project.screens[0].children?.[0];
    expect(stored?.props).toMatchObject({ version: 4, ecc: "q", size: "xs" });
    expect(stored?.frame).toMatchObject({ width: 66, height: 66 });
  });

  it("QR background layer toggle removes fill", async () => {
    const project = withChildren(makeFixtureProject(), [makeQrCode("qr_1")]);
    get().setProject(project);
    selectAndRender("qr_1");

    const backgroundToggle = screen.getByText("Background").closest("label")!;
    await userEvent.click(within(backgroundToggle).getByRole("checkbox"));

    expect(get().project.screens[0].children?.[0].style?.drawBackground).toBe(false);
  });

  it("QR group warns when text cannot fit any version", () => {
    const project = withChildren(makeFixtureProject(), [
      makeQrCode("qr_1", "A".repeat(3000)),
    ]);
    get().setProject(project);
    selectAndRender("qr_1");
    expect(screen.getByText("Text is too large for QR v40 at this ECC.")).toBeInTheDocument();
    expect(screen.getByText("Current version/ECC does not fit this text.")).toBeInTheDocument();
  });
});

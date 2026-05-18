import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CanvasRulers } from "@widgets/canvas-workspace/CanvasRulers";

const horizontalTicks = [
  { value: 0, offset: 0, major: true },
  { value: 4, offset: 16, major: false },
  { value: 8, offset: 32, major: true },
];

const verticalTicks = [
  { value: 0, offset: 0, major: true },
  { value: 4, offset: 16, major: false },
];

describe("CanvasRulers", () => {
  it("renders four ruler tracks (top, bottom, left, right)", () => {
    const { container } = render(
      <CanvasRulers
        horizontalTicks={horizontalTicks}
        verticalTicks={verticalTicks}
        scaledW={32}
        scaledH={16}
        renderZoom={4}
        selectionRect={null}
        showSelectionLabels={false}
      />,
    );
    const rulers = container.querySelectorAll('[class*="ruler"]');
    expect(rulers.length).toBe(4);
  });

  it("renders selection labels with x/y/width/height numbers", () => {
    render(
      <CanvasRulers
        horizontalTicks={horizontalTicks}
        verticalTicks={verticalTicks}
        scaledW={64}
        scaledH={64}
        renderZoom={4}
        selectionRect={{ x: 1, y: 2, width: 5, height: 3 }}
        showSelectionLabels
      />,
    );
    // x and x+w labels appear on top and bottom rulers
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("6").length).toBeGreaterThan(0);
    // y and y+h
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
  });

  it("renders no selection labels when showSelectionLabels=false", () => {
    render(
      <CanvasRulers
        horizontalTicks={horizontalTicks}
        verticalTicks={verticalTicks}
        scaledW={64}
        scaledH={64}
        renderZoom={4}
        selectionRect={{ x: 0, y: 0, width: 10, height: 10 }}
        showSelectionLabels={false}
      />,
    );
    expect(screen.queryByText("10")).toBeNull();
  });
});

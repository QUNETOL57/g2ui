import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BitmapText } from "@entities/font/BitmapText";
import { findFontFace } from "@entities/font/fontLibrary";

describe("BitmapText vertical align", () => {
  const face = findFontFace({ fontFamily: "BDF", fontSize: 7, fontStyle: "regular" });

  it("keeps text at the top by default when the box is taller than the line", () => {
    render(
      <BitmapText
        face={face}
        text="Label"
        color="#fff"
        boxWidth={80}
        boxHeight={face.lineHeight + 10}
      />,
    );

    const runs = screen.getByLabelText("Label").querySelectorAll("span");
    expect(runs.length).toBeGreaterThan(0);
    const tops = [...runs].map((run) => Number.parseInt(run.style.top, 10));
    expect(Math.min(...tops)).toBe(0);
  });

  it("centers text when verticalAlign is center", () => {
    const boxHeight = face.lineHeight + 10;
    render(
      <BitmapText
        face={face}
        text="Label"
        color="#fff"
        verticalAlign="center"
        boxWidth={80}
        boxHeight={boxHeight}
      />,
    );

    const runs = screen.getByLabelText("Label").querySelectorAll("span");
    const tops = [...runs].map((run) => Number.parseInt(run.style.top, 10));
    expect(Math.min(...tops)).toBe(Math.floor((boxHeight - face.lineHeight) / 2));
  });

  it("renders a second line below the first", () => {
    render(
      <BitmapText
        face={face}
        text={"Hi\nThere"}
        color="#fff"
        boxWidth={80}
        boxHeight={face.lineHeight * 2}
      />,
    );

    const runs = screen.getByLabelText((value) => value.includes("There")).querySelectorAll("span");
    const tops = [...runs].map((run) => Number.parseInt(run.style.top, 10));
    expect(Math.min(...tops)).toBe(0);
    expect(Math.max(...tops)).toBeGreaterThanOrEqual(face.lineHeight);
  });
});

import type { BitmapFontFace } from "./fontTypes";
import { findGlyph, glyphPixelOn, measureTextWidth } from "./fontLibrary";

export type BitmapTextAlign = "left" | "center" | "right";

interface BitmapTextProps {
  face: BitmapFontFace;
  text: string;
  color: string;
  align?: BitmapTextAlign;
  boxWidth: number;
  boxHeight: number;
}

interface RectRun {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function BitmapText({
  face,
  text,
  color,
  align = "left",
  boxWidth,
  boxHeight,
}: BitmapTextProps) {
  const textWidth = measureTextWidth(face, text);
  const textHeight = face.lineHeight;
  let originX = 0;
  if (align === "center") {
    originX = Math.floor((boxWidth - textWidth) / 2);
  } else if (align === "right") {
    originX = boxWidth - textWidth;
  }
  const originY = Math.floor((boxHeight - textHeight) / 2);
  const runs = buildTextRuns(face, text, originX, originY);

  return (
    <div
      aria-label={text}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        color,
      }}
    >
      {runs.map((run, index) => (
        <span
          key={index}
          aria-hidden
          style={{
            position: "absolute",
            left: run.x,
            top: run.y,
            width: run.width,
            height: run.height,
            backgroundColor: color,
          }}
        />
      ))}
    </div>
  );
}

function buildTextRuns(face: BitmapFontFace, text: string, originX: number, originY: number): RectRun[] {
  const runs: RectRun[] = [];
  let penX = originX;
  for (const char of text) {
    const codepoint = char.codePointAt(0) ?? 0;
    const glyph = findGlyph(face, codepoint);
    if (!glyph) {
      penX += Math.floor(face.lineHeight / 2);
      continue;
    }

    for (let row = 0; row < glyph.height; row++) {
      let runStart = -1;
      for (let col = 0; col < glyph.width; col++) {
        const on = glyphPixelOn(face, glyph, col, row);
        if (on && runStart < 0) {
          runStart = col;
        } else if (!on && runStart >= 0) {
          runs.push({
            x: penX + glyph.xOffset + runStart,
            y: originY + glyph.yOffset + row,
            width: col - runStart,
            height: 1,
          });
          runStart = -1;
        }
      }
      if (runStart >= 0) {
        runs.push({
          x: penX + glyph.xOffset + runStart,
          y: originY + glyph.yOffset + row,
          width: glyph.width - runStart,
          height: 1,
        });
      }
    }

    penX += glyph.advance;
  }
  return runs;
}

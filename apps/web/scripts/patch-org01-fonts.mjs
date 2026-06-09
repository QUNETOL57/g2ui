import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { FONT_FACES } from "../src/entities/font/generated/fontAssets.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../../..");
const outputPath = join(__dirname, "../src/entities/font/generated/fontAssets.ts");

/** Integer pixel scaling: each source pixel becomes N×N block (7px step per +1). */
const ORG_SCALE_FACTORS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function glyphPixelOn(face, glyph, x, y) {
  if (x < 0 || y < 0 || x >= glyph.width || y >= glyph.height) return false;
  const byteIndex = glyph.bitmapOffset + y * face.bytesPerRow + Math.floor(x / 8);
  return (face.bitmap[byteIndex] & (0x80 >> (x % 8))) !== 0;
}

function cloneFontFace(face, overrides) {
  return {
    ...face,
    bitmap: [...face.bitmap],
    glyphs: face.glyphs.map((glyph) => ({ ...glyph })),
    ranges: face.ranges.map((range) => ({ ...range })),
    ...overrides,
  };
}

function metricsFromGlyphs(glyphs, referenceLineHeight, referenceBaseline) {
  let minTop = Infinity;
  let maxBottom = 0;

  for (const glyph of glyphs) {
    if (glyph.width === 0 && glyph.height === 0) continue;
    minTop = Math.min(minTop, glyph.yOffset);
    maxBottom = Math.max(maxBottom, glyph.yOffset + glyph.height);
  }

  if (!Number.isFinite(minTop)) {
    return { lineHeight: referenceLineHeight, baseline: referenceBaseline };
  }

  const lineHeight = Math.max(1, maxBottom - minTop);
  const baseline = Math.max(
    1,
    Math.min(lineHeight, Math.round(referenceBaseline * (lineHeight / referenceLineHeight))),
  );

  return { lineHeight, baseline };
}

function tightenFontFace(face) {
  const { lineHeight, baseline } = metricsFromGlyphs(face.glyphs, face.lineHeight, face.baseline);
  return { ...face, lineHeight, baseline, size: lineHeight };
}

function scaleFontFaceByIntegerFactor(source, scaleFactor, id) {
  const lineHeight = source.lineHeight * scaleFactor;
  const baseline = source.baseline * scaleFactor;

  if (scaleFactor === 1) {
    return cloneFontFace(source, { id, size: lineHeight, lineHeight, baseline });
  }

  const scaledMetrics = source.glyphs.map((glyph) => ({
    glyph,
    width: glyph.width * scaleFactor,
    height: glyph.height * scaleFactor,
    xOffset: glyph.xOffset * scaleFactor,
    yOffset: glyph.yOffset * scaleFactor,
    advance: Math.max(scaleFactor, glyph.advance * scaleFactor),
  }));

  const bytesPerRow = Math.max(
    1,
    ...scaledMetrics.map(({ width }) => (width === 0 ? 1 : Math.ceil(width / 8))),
  );

  const bitmap = [];
  const glyphs = scaledMetrics.map(({ glyph, width, height, xOffset, yOffset, advance }) => {
    const bitmapOffset = bitmap.length;

    for (let y = 0; y < height; y += 1) {
      for (let byteCol = 0; byteCol < bytesPerRow; byteCol += 1) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit += 1) {
          const x = byteCol * 8 + bit;
          if (x >= width) continue;
          if (glyph.width === 0 || glyph.height === 0) continue;
          const srcX = Math.floor(x / scaleFactor);
          const srcY = Math.floor(y / scaleFactor);
          if (glyphPixelOn(source, glyph, srcX, srcY)) {
            byte |= 0x80 >> bit;
          }
        }
        bitmap.push(byte);
      }
    }

    return {
      codepoint: glyph.codepoint,
      width,
      height,
      xOffset,
      yOffset,
      advance,
      bitmapOffset,
    };
  });

  const { lineHeight: tightLineHeight, baseline: tightBaseline } = metricsFromGlyphs(
    glyphs,
    lineHeight,
    baseline,
  );

  return {
    id,
    family: source.family,
    size: tightLineHeight,
    style: source.style,
    lineHeight: tightLineHeight,
    baseline: tightBaseline,
    bytesPerRow,
    bitmap,
    glyphs,
    ranges: source.ranges.map((range) => ({ ...range })),
  };
}

function orgFaceId(scaleFactor) {
  if (scaleFactor === 1) return "org_01";
  return `org_01_x${scaleFactor}`;
}

function loadOriginalOrg01() {
  const gitAssets = execSync("git show HEAD:apps/web/src/entities/font/generated/fontAssets.ts", {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const match = gitAssets.match(/export const FONT_FACES: BitmapFontFace\[\] = (\[[\s\S]*\]);/);
  if (!match) {
    throw new Error("Could not parse fontAssets.ts from git HEAD");
  }
  const gitFaces = JSON.parse(match[1]);
  const original = gitFaces.find((face) => face.id === "org_01");
  if (!original) {
    throw new Error("org_01 font face not found in git HEAD");
  }
  return original;
}

const source = tightenFontFace(loadOriginalOrg01());

const orgFaces = ORG_SCALE_FACTORS.map((scaleFactor) =>
  scaleFontFaceByIntegerFactor(source, scaleFactor, orgFaceId(scaleFactor)),
);

const updatedFaces = FONT_FACES.filter((face) => face.family !== "Org_01").concat(orgFaces);

const header = `/* Auto-generated by g2ui-core/tools/build_assets.py. Org_01 sizes patched by scripts/patch-org01-fonts.mjs */
import type { BitmapFontFace } from "../fontTypes";

export const FONT_FACES: BitmapFontFace[] = `;

writeFileSync(outputPath, `${header}${JSON.stringify(updatedFaces)};\n`);

console.log(
  `Updated Org_01 faces: ${orgFaces.map((face) => `${face.id} (${face.size}px, x${face.size / source.lineHeight})`).join(", ")}`,
);

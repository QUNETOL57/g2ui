export type TriangleDirection = "up" | "right" | "down" | "left";

export interface TriangleScanline {
  x: number;
  width: number;
}

export interface TrianglePoint {
  x: number;
  y: number;
}

/**
 * Classic pixel-art isosceles triangle.
 *
 * Up/down grow a centered pyramid, so both sides step together instead of
 * alternating left/right. The tip follows the frame parity: one pixel for
 * odd widths and two pixels for even widths. This keeps the shape symmetric
 * while allowing its base to fill the complete frame:
 *
 *   00100     001100
 *   01110     011110
 *   11111     111111
 */
export function buildTriangleScanlines(
  width: number,
  height: number,
  direction: TriangleDirection,
): Array<TriangleScanline | null> {
  if (width <= 0 || height <= 0) return [];

  if (direction === "up" || direction === "down") {
    const tipWidth = width % 2 === 0 ? 2 : 1;
    const maxHalf = (width - tipWidth) / 2;
    return Array.from({ length: height }, (_, y) => {
      const rowFromTip = direction === "up" ? y : height - 1 - y;
      const half = height <= 1
        ? maxHalf
        : Math.round((rowFromTip * maxHalf) / (height - 1));
      const rowWidth = tipWidth + 2 * half;
      return {
        x: (width - rowWidth) / 2,
        width: rowWidth,
      };
    });
  }

  // Left/right use one middle row for odd heights and two for even heights.
  // This is the rotated equivalent of the parity-aware up/down tip.
  const middleRows = height % 2 === 0 ? 2 : 1;
  const middleStart = (height - middleRows) / 2;
  const middleEnd = middleStart + middleRows - 1;
  return Array.from({ length: height }, (_, y) => {
    const distanceFromBase = y <= middleStart ? y : height - 1 - y;
    const distanceToMiddle = y <= middleStart ? middleStart : height - 1 - middleEnd;
    const grow = distanceToMiddle <= 0
      ? width - 1
      : Math.round((distanceFromBase * (width - 1)) / distanceToMiddle);
    const rowWidth = Math.max(1, Math.min(width, 1 + grow));
    return {
      x: direction === "right" ? 0 : width - rowWidth,
      width: rowWidth,
    };
  });
}

/** Vertices matching the filled pyramid (used for border strokes). */
export function triangleVertices(
  width: number,
  height: number,
  direction: TriangleDirection,
): [TrianglePoint, TrianglePoint, TrianglePoint] {
  const maxX = Math.max(0, width - 1);
  const maxY = Math.max(0, height - 1);

  if (direction === "up" || direction === "down") {
    const tipX = Math.floor((width - 1) / 2);
    if (direction === "down") {
      return [
        { x: 0, y: 0 },
        { x: maxX, y: 0 },
        { x: tipX, y: maxY },
      ];
    }
    return [
      { x: tipX, y: 0 },
      { x: maxX, y: maxY },
      { x: 0, y: maxY },
    ];
  }

  const mid = Math.floor(height / 2);
  if (direction === "left") {
    return [
      { x: maxX, y: 0 },
      { x: 0, y: mid },
      { x: maxX, y: maxY },
    ];
  }

  return [
    { x: 0, y: 0 },
    { x: maxX, y: mid },
    { x: 0, y: maxY },
  ];
}

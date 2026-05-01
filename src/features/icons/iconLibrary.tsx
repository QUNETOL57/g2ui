import { memo, type CSSProperties } from "react";
import { ICON_GROUPS, ICON_LIBRARY, type IconDefinition } from "./iconLibraryData";

const ICON_LIBRARY_BY_ID = new Map(ICON_LIBRARY.map((icon) => [icon.id, icon] as const));

export { ICON_GROUPS, ICON_LIBRARY };

export function getIconDefinition(iconId: string | undefined | null): IconDefinition | undefined {
  if (!iconId) return undefined;
  return ICON_LIBRARY_BY_ID.get(iconId);
}

export const IconGlyph = memo(function IconGlyph({
  iconId,
  color = "currentColor",
  title,
  pixelSize,
  style,
}: {
  iconId: string | undefined | null;
  color?: string;
  title?: string;
  pixelSize?: number;
  style?: CSSProperties;
}) {
  const icon = getIconDefinition(iconId);
  if (!icon) return null;
  const sizeStyle: CSSProperties = pixelSize
    ? { width: icon.width * pixelSize, height: icon.height * pixelSize }
    : { width: "100%", height: "100%" };

  const pixels: JSX.Element[] = [];
  for (let y = 0; y < icon.height; y += 1) {
    const row = icon.rows[y] ?? 0;
    for (let x = 0; x < icon.width; x += 1) {
      const mask = 1 << (icon.width - 1 - x);
      if ((row & mask) !== 0) {
        pixels.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={color} />);
      }
    }
  }

  return (
    <svg
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={title ?? icon.id}
      shapeRendering="crispEdges"
      style={{
        display: "block",
        ...sizeStyle,
        overflow: "hidden",
        shapeRendering: "crispEdges",
        ...style,
      }}
    >
      {pixels}
    </svg>
  );
});

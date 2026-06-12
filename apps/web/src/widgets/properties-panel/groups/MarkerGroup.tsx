import type { MarkerStyle } from "@entities/ui-project/model/store";

import styles from "../PropertiesPanel.module.css";
import { ColorField } from "../ui/ColorField";
import { InspectorCard } from "../ui/InspectorCard";
import { NumberField } from "../ui/NumberField";

export function MarkerGroup({
  markerStyle,
  palette,
  onChange,
}: {
  markerStyle: MarkerStyle;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (patch: Partial<MarkerStyle>) => void;
}) {
  return (
    <div className={styles.group}>
      <h4>Marker</h4>
      <InspectorCard title="Stroke">
        <ColorField
          label="color"
          value={markerStyle.color}
          palette={palette}
          onChange={(color) => color && onChange({ color })}
        />
        <NumberField
          label="width"
          value={markerStyle.width}
          min={1}
          onChange={(width) => onChange({ width })}
        />
      </InspectorCard>
    </div>
  );
}

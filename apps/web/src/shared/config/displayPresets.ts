export interface DisplayPreset {
  id: string;
  label: string;
  width: number;
  height: number;
}

/**
 * Common TFT resolutions for small embedded displays. The default selection
 * (`160x128`) is typical for low-cost ST7735 panels and is used as the
 * initial resolution for new projects in Studio.
 */
export const DISPLAY_PRESETS: DisplayPreset[] = [
  { id: "160x128", label: "160 × 128", width: 160, height: 128 },
  { id: "128x128", label: "128 × 128", width: 128, height: 128 },
  { id: "128x64", label: "128 × 64", width: 128, height: 64 },
  { id: "240x135", label: "240 × 135", width: 240, height: 135 },
  { id: "240x240", label: "240 × 240", width: 240, height: 240 },
  { id: "320x170", label: "320 × 170", width: 320, height: 170 },
  { id: "320x240", label: "320 × 240", width: 320, height: 240 },
];

export const DEFAULT_PRESET_ID = "160x128";

export function presetForSize(width: number, height: number): DisplayPreset | null {
  return (
    DISPLAY_PRESETS.find((p) => p.width === width && p.height === height) ?? null
  );
}

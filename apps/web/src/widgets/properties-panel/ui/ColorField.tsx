import { useRef } from "react";

import type { ColorRef } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";
import { CustomSelect } from "@shared/ui/CustomSelect";
import { HexColorPicker } from "@shared/ui/HexColorPicker";
import styles from "../PropertiesPanel.module.css";

export function ColorField({
  label,
  value,
  palette,
  onChange,
}: {
  label: string;
  value: ColorRef | undefined;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (v: ColorRef | undefined) => void;
}) {
  const current = value ?? { kind: "hex", value: "#FFFFFF" };
  const mode = current.kind;
  // Tracks intended mode synchronously so late hex emits cannot overwrite a
  // just-selected palette token before the parent re-renders.
  const modeLockRef = useRef<"hex" | "token">(mode);
  modeLockRef.current = mode;

  const emitHex = (nextValue: string) => {
    if (modeLockRef.current !== "hex") return;
    onChange({ kind: "hex", value: nextValue });
  };

  return (
    <div className={cn(styles.row, styles.colorField)}>
      <label>{label}</label>
      <div className={styles.colorFieldControl}>
        <div className={cn(styles.colorModeRow, mode !== "hex" && styles.colorModeRowFull)}>
          <CustomSelect
            ariaLabel={`${label} mode`}
            size="sm"
            value={mode}
            options={[
              { value: "hex", label: "hex" },
              { value: "token", label: "palette" },
            ]}
            onChange={(next) => {
              const kind = next as "hex" | "token";
              modeLockRef.current = kind;
              if (kind === "hex") return onChange({ kind: "hex", value: "#FFFFFF" });
              return onChange({
                kind: "token",
                token: palette?.[0]?.token ?? "fg",
              });
            }}
          />
          {mode === "hex" ? (
            <HexColorPicker
              ariaLabel={`${label} hex`}
              value={current.kind === "hex" ? current.value : "#FFFFFF"}
              onChange={emitHex}
            />
          ) : null}
        </div>
        {mode === "token" ? (
          <CustomSelect
            ariaLabel={`${label} token`}
            size="sm"
            value={current.kind === "token" ? current.token : ""}
            options={(palette ?? []).map((p) => ({
              value: p.token,
              label: `${p.token} (${p.hex})`,
              color: p.hex,
            }))}
            onChange={(token) => {
              modeLockRef.current = "token";
              onChange({ kind: "token", token });
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

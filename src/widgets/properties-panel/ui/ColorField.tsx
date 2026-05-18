import { useEffect, useRef, useState } from "react";

import type { ColorRef } from "@entities/ui-project";
import { cn } from "@shared/lib/cn";
import { CustomSelect } from "@shared/ui/CustomSelect";

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
  return (
    <div className={cn(styles.row, styles.colorField)}>
      <label>{label}</label>
      <div className={styles.colorFieldControl}>
        <div className={cn(styles.colorModeRow, mode !== "hex" && styles.colorModeRowFull)}>
          <CustomSelect
            ariaLabel={`${label} mode`}
            value={mode}
            options={[
              { value: "hex", label: "hex" },
              { value: "token", label: "palette" },
            ]}
            onChange={(value) => {
              const kind = value as "hex" | "token";
              if (kind === "hex") return onChange({ kind: "hex", value: "#FFFFFF" });
              return onChange({
                kind: "token",
                token: palette?.[0]?.token ?? "fg",
              });
            }}
          />
          {mode === "hex" ? (
            <HexColorInput
              value={current.kind === "hex" ? current.value : "#FFFFFF"}
              onChange={(nextValue) => onChange({ kind: "hex", value: nextValue })}
            />
          ) : null}
        </div>
        {mode === "token" ? (
          <CustomSelect
            ariaLabel={`${label} token`}
            value={current.kind === "token" ? current.token : ""}
            options={(palette ?? []).map((p) => ({
              value: p.token,
              label: `${p.token} (${p.hex})`,
              color: p.hex,
            }))}
            onChange={(value) => onChange({ kind: "token", token: value })}
          />
        ) : null}
      </div>
    </div>
  );
}

function HexColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const latestRef = useRef(value);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDraft(value);
    latestRef.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const commitLatest = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    onChange(latestRef.current);
  };

  const scheduleChange = (nextValue: string) => {
    const normalized = nextValue.toUpperCase();
    setDraft(normalized);
    latestRef.current = normalized;

    if (timeoutRef.current !== null) return;
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      onChange(latestRef.current);
    }, 80);
  };

  return (
    <input
      type="color"
      className={styles.hexInput}
      value={draft}
      onChange={(event) => scheduleChange(event.target.value)}
      onBlur={commitLatest}
    />
  );
}

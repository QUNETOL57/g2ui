import { DraftNumberInput } from "@shared/ui/DraftNumberInput";

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <div className="prop-row">
      <label>{label}</label>
      <DraftNumberInput value={value} min={min} max={max} onChange={onChange} />
    </div>
  );
}

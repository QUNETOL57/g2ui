import type { ReactNode } from "react";

export function InspectorCard({
  title,
  subtitle,
  checked,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  checked?: boolean;
  onToggle?: (checked: boolean) => void;
  children: ReactNode;
}) {
  const titleContent = (
    <span className="inspector-card-title-stack">
      <span className="typography-card-title">{title}</span>
      {subtitle ? <small>{subtitle}</small> : null}
    </span>
  );

  return (
    <div className="inspector-card">
      {onToggle ? (
        <label className="inspector-card-head inspector-card-toggle">
          {titleContent}
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={(event) => onToggle(event.target.checked)}
          />
        </label>
      ) : (
        <div className="inspector-card-head">{titleContent}</div>
      )}
      {children}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import type {
  ButtonProps,
  ColorRef,
  IconProps,
  LabelProps,
  LayoutMode,
  WidgetNode,
} from "../../ui-ir";

import { useEditorStore, findNode } from "../../store/editorStore";
import { ICON_GROUPS, IconGlyph } from "../icons/iconLibrary";
import { getResolvedIconDefinition } from "../icons/iconSizing";

export function PropertiesPanel() {
  const project = useEditorStore((s) => s.project);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const updateNode = useEditorStore((s) => s.updateNode);
  const updateFrame = useEditorStore((s) => s.updateFrame);
  const updateProps = useEditorStore((s) => s.updateProps);
  const updateLayout = useEditorStore((s) => s.updateLayout);
  const updateStyle = useEditorStore((s) => s.updateStyle);

  if (!selectedNodeId) {
    return (
      <>
        <div className="section-title">Properties</div>
        <div style={{ padding: 10, color: "var(--muted)", fontSize: 12 }}>
          Select a widget in the tree or canvas.
        </div>
      </>
    );
  }

  const node = findNode(project, selectedNodeId);
  if (!node) return null;

  return (
    <>
      <div className="section-title">Properties · {node.type}</div>

      <div className="prop-group">
        <h4>Identity</h4>
        <div className="prop-row">
          <label>id</label>
          <input type="text" value={node.id} disabled />
        </div>
        <div className="prop-row">
          <label>name</label>
          <input
            type="text"
            value={node.name ?? ""}
            onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
          />
        </div>
        <div className="prop-row">
          <label>visible</label>
          <input
            type="checkbox"
            checked={node.visible !== false}
            onChange={(e) => updateNode(node.id, { visible: e.target.checked })}
          />
        </div>
      </div>

      {node.type !== "screen" ? (
        <FrameGroup node={node} updateFrame={updateFrame} />
      ) : null}

      {(node.type === "screen" || node.type === "panel") && (
        <LayoutGroup node={node} updateLayout={updateLayout} />
      )}

      <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />

      {node.type === "label" && (
        <LabelGroup
          node={node}
          onChange={(patch) => updateProps(node.id, patch)}
        />
      )}
      {node.type === "button" && (
        <ButtonGroup
          node={node}
          onChange={(patch) => updateProps(node.id, patch)}
        />
      )}
      {node.type === "icon" && (
        <IconGroup node={node} onChange={(patch) => updateProps(node.id, patch)} />
      )}
    </>
  );
}

function FrameGroup({
  node,
  updateFrame,
}: {
  node: WidgetNode;
  updateFrame: (id: string, patch: Partial<NonNullable<WidgetNode["frame"]>>) => void;
}) {
  const f = node.frame ?? { x: 0, y: 0, width: 0, height: 0 };
  const icon = node.type === "icon" ? getResolvedIconDefinition(((node.props ?? {}) as Partial<IconProps>).iconId) : null;
  return (
    <div className="prop-group">
      <h4>Frame</h4>
      <div className="inline-grid-2">
        <NumberField label="x" value={f.x} onChange={(v) => updateFrame(node.id, { x: v })} />
        <NumberField label="y" value={f.y} onChange={(v) => updateFrame(node.id, { y: v })} />
        <NumberField
          label="w"
          value={f.width}
          min={icon?.width}
          onChange={(v) => updateFrame(node.id, { width: v })}
        />
        <NumberField
          label="h"
          value={f.height}
          min={icon?.height}
          onChange={(v) => updateFrame(node.id, { height: v })}
        />
      </div>
    </div>
  );
}

function LayoutGroup({
  node,
  updateLayout,
}: {
  node: WidgetNode;
  updateLayout: (id: string, patch: Partial<NonNullable<WidgetNode["layout"]>>) => void;
}) {
  const l = node.layout ?? { mode: "absolute" as LayoutMode };
  return (
    <div className="prop-group">
      <h4>Layout</h4>
      <div className="prop-row">
        <label>mode</label>
        <select
          value={l.mode}
          onChange={(e) => updateLayout(node.id, { mode: e.target.value as LayoutMode })}
        >
          <option value="absolute">absolute</option>
          <option value="row">row</option>
          <option value="column">column</option>
        </select>
      </div>
      <div className="inline-grid-2">
        <NumberField
          label="padding"
          value={l.padding ?? 0}
          onChange={(v) => updateLayout(node.id, { padding: v })}
        />
        <NumberField
          label="gap"
          value={l.gap ?? 0}
          onChange={(v) => updateLayout(node.id, { gap: v })}
        />
      </div>
      <div className="prop-row">
        <label>align</label>
        <select
          value={l.align ?? "start"}
          onChange={(e) =>
            updateLayout(node.id, {
              align: e.target.value as NonNullable<typeof l.align>,
            })
          }
        >
          {["start", "center", "end", "stretch"].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function StyleGroup({
  node,
  palette,
  updateStyle,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  updateStyle: (id: string, patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
}) {
  const s = node.style ?? {};
  const fillColor = s.background ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
  const borderColor = s.borderColor ?? { kind: "hex", value: "#FFFFFF" } satisfies ColorRef;
  const fillEnabled = s.drawBackground !== false;
  const borderEnabled = Boolean(s.drawBorder);

  if (node.type === "icon") {
    return (
      <div className="prop-group">
        <h4>Style</h4>
        <ColorField
          label="color"
          value={s.textColor}
          palette={palette}
          onChange={(v) => updateStyle(node.id, { textColor: v })}
        />
      </div>
    );
  }

  return (
    <div className="prop-group">
      <h4>Style</h4>
      <div className="prop-row">
        <label>fill</label>
        <input
          type="checkbox"
          checked={fillEnabled}
          onChange={(e) =>
            updateStyle(node.id, {
              drawBackground: e.target.checked,
              background: e.target.checked ? fillColor : s.background,
            })
          }
        />
      </div>
      {fillEnabled ? (
        <ColorField
          label="fill color"
          value={fillColor}
          palette={palette}
          onChange={(v) => updateStyle(node.id, { background: v, drawBackground: true })}
        />
      ) : null}
      <div className="prop-row">
        <label>border</label>
        <input
          type="checkbox"
          checked={borderEnabled}
          onChange={(e) =>
            updateStyle(node.id, {
              drawBorder: e.target.checked,
              borderColor: e.target.checked ? borderColor : s.borderColor,
              borderWidth: e.target.checked ? Math.max(1, s.borderWidth ?? 1) : s.borderWidth,
            })
          }
        />
      </div>
      {borderEnabled ? (
        <>
          <ColorField
            label="border color"
            value={borderColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { borderColor: v, drawBorder: true })}
          />
          <NumberField
            label="border width"
            value={s.borderWidth ?? 1}
            min={1}
            onChange={(v) => updateStyle(node.id, { borderWidth: Math.max(1, v), drawBorder: true })}
          />
        </>
      ) : null}
      <ColorField
        label="text color"
        value={s.textColor}
        palette={palette}
        onChange={(v) => updateStyle(node.id, { textColor: v })}
      />
    </div>
  );
}

function LabelGroup({
  node,
  onChange,
}: {
  node: WidgetNode;
  onChange: (patch: Partial<LabelProps>) => void;
}) {
  const p = (node.props ?? {}) as LabelProps;
  return (
    <div className="prop-group">
      <h4>Label</h4>
      <div className="prop-row">
        <label>text</label>
        <input
          type="text"
          value={p.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <NumberField
        label="scale"
        value={p.scale ?? 1}
        min={1}
        max={4}
        onChange={(v) => onChange({ scale: v })}
      />
      <div className="prop-row">
        <label>align</label>
        <select value={p.align ?? "left"} onChange={(e) => onChange({ align: e.target.value as LabelProps["align"] })}>
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </div>
    </div>
  );
}

function ButtonGroup({
  node,
  onChange,
}: {
  node: WidgetNode;
  onChange: (patch: Partial<ButtonProps>) => void;
}) {
  const p = (node.props ?? {}) as ButtonProps;
  return (
    <div className="prop-group">
      <h4>Button</h4>
      <div className="prop-row">
        <label>text</label>
        <input
          type="text"
          value={p.text ?? ""}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <NumberField
        label="scale"
        value={p.scale ?? 1}
        onChange={(v) => onChange({ scale: v })}
      />
      <NumberField
        label="padX"
        value={p.paddingX ?? 0}
        onChange={(v) => onChange({ paddingX: v })}
      />
      <NumberField
        label="padY"
        value={p.paddingY ?? 0}
        onChange={(v) => onChange({ paddingY: v })}
      />
    </div>
  );
}

function IconGroup({
  node,
  onChange,
}: {
  node: WidgetNode;
  onChange: (patch: Partial<IconProps>) => void;
}) {
  const p = (node.props ?? {}) as IconProps;
  const selectedGroup = useMemo(
    () => ICON_GROUPS.find(([, icons]) => icons.some((icon) => icon.id === p.iconId))?.[0] ?? "Earth",
    [p.iconId],
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => ({
    [selectedGroup]: true,
  }));

  useEffect(() => {
    setOpenGroups((current) => ({
      ...current,
      [selectedGroup]: true,
    }));
  }, [node.id, selectedGroup]);

  return (
    <div className="prop-group">
      <h4>Icon</h4>
      <div className="prop-row">
        <label>iconId</label>
        <input
          type="text"
          value={p.iconId ?? ""}
          onChange={(e) => onChange({ iconId: e.target.value })}
        />
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {ICON_GROUPS.map(([group, icons]) => (
          <details
            key={group}
            open={Boolean(openGroups[group])}
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenGroups((current) =>
                current[group] === isOpen ? current : { ...current, [group]: isOpen },
              );
            }}
          >
            <summary style={{ cursor: "pointer", fontSize: 12 }}>{group}</summary>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: 6,
                marginTop: 6,
              }}
            >
              {icons.map((icon) => {
                const isSelected = p.iconId === icon.id;
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => onChange({ iconId: icon.id })}
                    title={icon.id}
                    style={{
                      display: "grid",
                      gap: 4,
                      padding: 6,
                      borderRadius: 6,
                      border: isSelected ? "1px solid #6ea8fe" : "1px solid var(--border)",
                      background: isSelected ? "rgba(110, 168, 254, 0.12)" : "transparent",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ width: "100%", height: 28 }}>
                      <IconGlyph iconId={icon.id} />
                    </div>
                    <span style={{ fontSize: 10, lineHeight: 1.2, wordBreak: "break-word" }}>
                      {icon.id}
                    </span>
                    <span style={{ fontSize: 10, lineHeight: 1, color: "var(--muted)" }}>
                      {icon.width}x{icon.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function NumberField({
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
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ColorField({
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
    <div className="prop-row" style={{ alignItems: "start" }}>
      <label>{label}</label>
      <div style={{ display: "grid", gap: 4 }}>
        <select
          value={mode}
          onChange={(e) => {
            const kind = e.target.value as "hex" | "token" | "none";
            if (kind === "none") return onChange(undefined);
            if (kind === "hex") return onChange({ kind: "hex", value: "#FFFFFF" });
            return onChange({
              kind: "token",
              token: palette?.[0]?.token ?? "fg",
            });
          }}
        >
          <option value="hex">hex</option>
          <option value="token">token</option>
          <option value="none">unset</option>
        </select>
        {mode === "hex" ? (
          <input
            type="color"
            value={current.kind === "hex" ? current.value : "#FFFFFF"}
            onChange={(e) => onChange({ kind: "hex", value: e.target.value.toUpperCase() })}
          />
        ) : null}
        {mode === "token" ? (
          <select
            value={current.kind === "token" ? current.token : ""}
            onChange={(e) => onChange({ kind: "token", token: e.target.value })}
          >
            {(palette ?? []).map((p) => (
              <option key={p.token} value={p.token}>
                {p.token} ({p.hex})
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

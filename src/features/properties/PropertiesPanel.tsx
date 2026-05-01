import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ButtonProps,
  ColorRef,
  IconProps,
  LabelProps,
  LayoutMode,
  WidgetNode,
} from "../../ui-ir";

import { CustomSelect } from "../../components/CustomSelect";
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
        <div className="empty-state">
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

      <SelectedGroup node={node} updateNode={updateNode} />

      {node.type !== "screen" ? (
        <FrameGroup node={node} updateFrame={updateFrame} />
      ) : null}

      {node.type === "icon" ? (
        <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />
      ) : null}

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

      {(node.type === "screen" || node.type === "panel") && (
        <LayoutGroup node={node} updateLayout={updateLayout} />
      )}

      {node.type !== "icon" ? (
        <StyleGroup node={node} palette={project.palette} updateStyle={updateStyle} />
      ) : null}
    </>
  );
}

function SelectedGroup({
  node,
  updateNode,
}: {
  node: WidgetNode;
  updateNode: (id: string, patch: Partial<WidgetNode>) => void;
}) {
  return (
    <div className="prop-group inspector-summary">
      <div className="inspector-title-row">
        <span className="type-pill">{node.type}</span>
        <span className="inspector-id" title={node.id}>
          {node.id}
        </span>
      </div>
      <div className="prop-row">
        <label>name</label>
        <input
          type="text"
          value={node.name ?? ""}
          placeholder={node.id}
          onChange={(e) => updateNode(node.id, { name: e.target.value || undefined })}
        />
      </div>
      <label className="visibility-toggle">
        <input
          type="checkbox"
          checked={node.visible !== false}
          onChange={(e) => updateNode(node.id, { visible: e.target.checked })}
        />
        Visible on canvas
      </label>
    </div>
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
      <h4>Transform</h4>
      <div className="transform-grid">
        <TransformField label="X" value={f.x} onChange={(v) => updateFrame(node.id, { x: v })} />
        <TransformField label="Y" value={f.y} onChange={(v) => updateFrame(node.id, { y: v })} />
        <TransformField
          label="W"
          value={f.width}
          min={icon?.width}
          onChange={(v) => updateFrame(node.id, { width: v })}
        />
        <TransformField
          label="H"
          value={f.height}
          min={icon?.height}
          onChange={(v) => updateFrame(node.id, { height: v })}
        />
      </div>
    </div>
  );
}

function TransformField({
  label,
  value,
  onChange,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <label className="transform-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
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
        <CustomSelect
          ariaLabel="layout mode"
          value={l.mode}
          options={[
            { value: "absolute", label: "absolute" },
            { value: "row", label: "row" },
            { value: "column", label: "column" },
          ]}
          onChange={(value) => updateLayout(node.id, { mode: value as LayoutMode })}
        />
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
        <CustomSelect
          ariaLabel="layout align"
          value={l.align ?? "start"}
          options={["start", "center", "end", "stretch"].map((value) => ({
            value,
            label: value,
          }))}
          onChange={(value) =>
            updateLayout(node.id, {
              align: value as NonNullable<typeof l.align>,
            })
          }
        />
      </div>
      <p className="field-hint">Controls how children are arranged inside this container.</p>
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
      <div className="prop-group appearance-group">
        <h4>Appearance</h4>
        <div className="appearance-section">
          <ColorField
            label="Icon color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { textColor: v })}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="prop-group appearance-group">
      <h4>Appearance</h4>
      <div className="appearance-section">
        <label className="appearance-toggle">
          <span>
            <strong>Fill</strong>
            <small>Background color</small>
          </span>
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
        </label>
        {fillEnabled ? (
          <ColorField
            label="Color"
            value={fillColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { background: v, drawBackground: true })}
          />
        ) : null}
      </div>
      <div className="appearance-section">
        <label className="appearance-toggle">
          <span>
            <strong>Border</strong>
            <small>Stroke around the element</small>
          </span>
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
        </label>
        {borderEnabled ? (
          <>
            <ColorField
              label="Color"
              value={borderColor}
              palette={palette}
              onChange={(v) => updateStyle(node.id, { borderColor: v, drawBorder: true })}
            />
            <NumberField
              label="Width"
              value={s.borderWidth ?? 1}
              min={1}
              onChange={(v) => updateStyle(node.id, { borderWidth: Math.max(1, v), drawBorder: true })}
            />
          </>
        ) : null}
      </div>
      {node.type !== "screen" && node.type !== "panel" ? (
        <div className="appearance-section">
          <div className="appearance-static-head">
            <span>
              <strong>Text</strong>
              <small>Foreground color</small>
            </span>
          </div>
          <ColorField
            label="Color"
            value={s.textColor}
            palette={palette}
            onChange={(v) => updateStyle(node.id, { textColor: v })}
          />
        </div>
      ) : null}
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
      <h4>Content</h4>
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
        <CustomSelect
          ariaLabel="label align"
          value={p.align ?? "left"}
          options={[
            { value: "left", label: "left" },
            { value: "center", label: "center" },
            { value: "right", label: "right" },
          ]}
          onChange={(value) => onChange({ align: value as LabelProps["align"] })}
        />
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
      <h4>Content</h4>
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
  const iconSearch = p.iconId ?? "";
  const normalizedIconSearch = iconSearch.trim().toLowerCase();
  const selectedGroup = useMemo(
    () => ICON_GROUPS.find(([, icons]) => icons.some((icon) => icon.id === p.iconId))?.[0] ?? "Transport & Places",
    [p.iconId],
  );
  const filteredIconGroups = useMemo(
    () =>
      normalizedIconSearch
        ? ICON_GROUPS.map(
            ([group, icons]) =>
              [
                group,
                icons.filter((icon) => icon.id.toLowerCase().includes(normalizedIconSearch)),
              ] as const,
          ).filter(([, icons]) => icons.length > 0)
        : ICON_GROUPS,
    [normalizedIconSearch],
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
      <h4>Icon Library</h4>
      <div className="prop-row">
        <label>iconId</label>
        <input
          type="search"
          placeholder="search or enter iconId"
          value={iconSearch}
          onChange={(e) => onChange({ iconId: e.target.value })}
        />
      </div>
      <div className="icon-browser">
        {filteredIconGroups.length > 0 ? filteredIconGroups.map(([group, icons]) => (
          <details
            key={group}
            className="icon-accordion"
            open={Boolean(openGroups[group]) || Boolean(normalizedIconSearch)}
            onToggle={(event) => {
              const isOpen = event.currentTarget.open;
              setOpenGroups((current) =>
                current[group] === isOpen ? current : { ...current, [group]: isOpen },
              );
            }}
          >
            <summary>{group}</summary>
            <div className="icon-grid">
              {icons.map((icon) => {
                const isSelected = p.iconId === icon.id;
                return (
                  <button
                    key={icon.id}
                    type="button"
                    onClick={() => onChange({ iconId: icon.id })}
                    title={icon.id}
                    className={`icon-tile${isSelected ? " selected" : ""}`}
                  >
                    <div className="icon-tile-preview">
                      <IconGlyph iconId={icon.id} />
                    </div>
                    <span className="icon-tile-name">
                      {icon.id}
                    </span>
                    <span className="icon-tile-size">
                      {icon.width}x{icon.height}
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        )) : (
          <p className="field-hint">No icons found for "{iconSearch}".</p>
        )}
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
    <div className="prop-row color-field">
      <label>{label}</label>
      <div className="color-field-control">
        <div className={`color-mode-row${mode === "hex" ? "" : " full-width"}`}>
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
      value={draft}
      onChange={(event) => scheduleChange(event.target.value)}
      onBlur={commitLatest}
    />
  );
}

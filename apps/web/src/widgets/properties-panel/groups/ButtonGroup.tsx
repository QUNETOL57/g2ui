import { useEffect, useMemo, useState } from "react";

import type { ButtonProps, WidgetNode } from "@entities/ui-project";
import { getIconDefinition, ICON_GROUPS, IconGlyph } from "@entities/icon/iconLibrary";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";
import { TypographyCard } from "../ui/TypographyCard";

export function ButtonGroup({
  node,
  palette,
  onChange,
  onStyleChange,
}: {
  node: WidgetNode;
  palette: { token: string; hex: string }[] | undefined;
  onChange: (patch: Partial<ButtonProps>) => void;
  onStyleChange: (patch: Partial<NonNullable<WidgetNode["style"]>>) => void;
}) {
  const p = (node.props ?? {}) as ButtonProps;
  const paddingTop = p.paddingTop ?? p.paddingY ?? 0;
  const paddingRight = p.paddingRight ?? p.paddingX ?? 0;
  const paddingBottom = p.paddingBottom ?? p.paddingY ?? 0;
  const paddingLeft = p.paddingLeft ?? p.paddingX ?? 0;
  const hasIcon = p.iconId !== undefined;
  const [iconSearch, setIconSearch] = useState(p.iconId ?? "");
  const normalizedIconSearch = iconSearch.trim().toLowerCase();
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

  useEffect(() => {
    setIconSearch(p.iconId ?? "");
  }, [node.id, p.iconId]);

  return (
    <div className={cn(styles.group, styles.textGroup)}>
      <div className={styles.typographyCard}>
        <div className={styles.inspectorCardHead}>
          <div className={styles.typographyCardTitle}>Button Icon</div>
          <label className={styles.visibilityToggle}>
            <input
              type="checkbox"
              checked={hasIcon}
              onChange={(event) => onChange({ iconId: event.target.checked ? "earth" : undefined })}
            />
            Show icon
          </label>
        </div>
        {hasIcon ? (
          <>
            <div className={styles.row}>
              <label htmlFor={`${node.id}-button-icon-id`}>iconId</label>
              <input
                id={`${node.id}-button-icon-id`}
                type="search"
                className={styles.inputSearch}
                placeholder="search icons"
                value={iconSearch}
                onChange={(e) => {
                  const nextSearch = e.target.value;
                  setIconSearch(nextSearch);
                  if (getIconDefinition(nextSearch)) {
                    onChange({ iconId: nextSearch });
                  }
                }}
              />
            </div>
            <div className={styles.inlineGrid2}>
              <label className={styles.textFieldStack}>
                <span>Position</span>
                <select
                  className={styles.inputText}
                  value={p.iconPosition ?? "left"}
                  onChange={(event) =>
                    onChange({ iconPosition: event.target.value as NonNullable<ButtonProps["iconPosition"]> })
                  }
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
              <label className={styles.textFieldStack}>
                <span>Gap</span>
                <input
                  className={styles.inputText}
                  type="number"
                  min={0}
                  value={p.iconGap ?? 2}
                  onChange={(event) => onChange({ iconGap: Number(event.target.value) || 0 })}
                />
              </label>
            </div>
            <div className={styles.iconBrowser}>
              {filteredIconGroups.length > 0 ? (
                filteredIconGroups.map(([group, icons]) => (
                  <details key={group} className={styles.iconAccordion} open={Boolean(normalizedIconSearch)}>
                    <summary>{group}</summary>
                    <div className={styles.iconGrid}>
                      {icons.map((icon) => {
                        const isSelected = p.iconId === icon.id;
                        return (
                          <button
                            key={icon.id}
                            type="button"
                            onClick={() => {
                              setIconSearch(icon.id);
                              onChange({ iconId: icon.id });
                            }}
                            title={icon.id}
                            className={cn(styles.iconTile, isSelected && styles.iconTileSelected)}
                          >
                            <div className={styles.iconTilePreview}>
                              <IconGlyph iconId={icon.id} />
                            </div>
                            <span className={styles.iconTileName}>{icon.id}</span>
                            <span className={styles.iconTileSize}>
                              {icon.width}x{icon.height}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </details>
                ))
              ) : (
                <p className={styles.fieldHint}>No icons found for "{iconSearch}".</p>
              )}
            </div>
          </>
        ) : (
          <p className={styles.fieldHint}>Enable an icon to show it before, after, above, or below the text.</p>
        )}
      </div>
      <TypographyCard
        props={p}
        style={node.style}
        palette={palette}
        backgroundDefaultEnabled
        showBackground={false}
        onPropsChange={(patch) => onChange(patch as Partial<ButtonProps>)}
        onStyleChange={onStyleChange}
        paddingControls={{
          horizontalAlign: p.horizontalAlign ?? "center",
          verticalAlign: p.verticalAlign ?? "center",
          top: paddingTop,
          right: paddingRight,
          bottom: paddingBottom,
          left: paddingLeft,
          onChange,
        }}
      />
    </div>
  );
}

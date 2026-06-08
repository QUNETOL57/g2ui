import { useEffect, useMemo, useState } from "react";

import type { IconProps, WidgetNode } from "@entities/ui-project";
import { ICON_GROUPS, IconGlyph } from "@entities/icon/iconLibrary";
import { cn } from "@shared/lib/cn";

import styles from "../PropertiesPanel.module.css";

export function IconGroup({
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
    () =>
      ICON_GROUPS.find(([, icons]) => icons.some((icon) => icon.id === p.iconId))?.[0] ??
      "Transport & Places",
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
    <div className={styles.group}>
      <h4>Icon Library</h4>
      <div className={styles.row}>
        <label>iconId</label>
        <input
          type="search"
          className={styles.inputSearch}
          placeholder="search or enter iconId"
          value={iconSearch}
          onChange={(e) => onChange({ iconId: e.target.value })}
        />
      </div>
      <div className={styles.iconBrowser}>
        {filteredIconGroups.length > 0 ? (
          filteredIconGroups.map(([group, icons]) => (
            <details
              key={group}
              className={styles.iconAccordion}
              open={Boolean(openGroups[group]) || Boolean(normalizedIconSearch)}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenGroups((current) =>
                  current[group] === isOpen ? current : { ...current, [group]: isOpen },
                );
              }}
            >
              <summary>{group}</summary>
              <div className={styles.iconGrid}>
                {icons.map((icon) => {
                  const isSelected = p.iconId === icon.id;
                  return (
                    <button
                      key={icon.id}
                      type="button"
                      onClick={() => onChange({ iconId: icon.id })}
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
    </div>
  );
}

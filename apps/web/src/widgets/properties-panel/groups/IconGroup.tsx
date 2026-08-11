import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type { IconProps, WidgetNode } from "@entities/ui-project";
import { ICON_GROUPS, IconGlyph } from "@entities/icon/iconLibrary";
import { cn } from "@shared/lib/cn";
import { ChevronIcon } from "@widgets/canvas-workspace/toolbarIcons";

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
  const deferredSearch = useDeferredValue(normalizedIconSearch);
  const isFilterPending = deferredSearch !== normalizedIconSearch;

  const selectedGroup = useMemo(
    () =>
      ICON_GROUPS.find(([, icons]) => icons.some((icon) => icon.id === p.iconId))?.[0] ??
      "Transport & Places",
    [p.iconId],
  );

  const filteredIconGroups = useMemo(
    () =>
      deferredSearch
        ? ICON_GROUPS.map(
            ([group, icons]) =>
              [
                group,
                icons.filter((icon) => icon.id.toLowerCase().includes(deferredSearch)),
              ] as const,
          ).filter(([, icons]) => icons.length > 0)
        : ICON_GROUPS,
    [deferredSearch],
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

  // Clearing the filter must not leave huge catalogs mounted/open.
  useEffect(() => {
    if (deferredSearch) return;
    setOpenGroups({ [selectedGroup]: true });
  }, [deferredSearch, selectedGroup]);

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
      {isFilterPending ? <p className={styles.fieldHint}>Updating results…</p> : null}
      <div className={styles.iconBrowser}>
        {filteredIconGroups.length > 0 ? (
          filteredIconGroups.map(([group, icons]) => {
            const isOpen = Boolean(openGroups[group]) || Boolean(deferredSearch);
            return (
              <details
                key={group}
                className={styles.iconAccordion}
                open={isOpen}
                onToggle={(event) => {
                  const nextOpen = event.currentTarget.open;
                  setOpenGroups((current) =>
                    current[group] === nextOpen ? current : { ...current, [group]: nextOpen },
                  );
                }}
              >
                <summary>
                  <span className={styles.iconAccordionTwistie}>
                    <ChevronIcon size={12} />
                  </span>
                  <span>
                    {group} ({icons.length})
                  </span>
                </summary>
                {isOpen ? (
                  <div className={styles.iconGrid}>
                    {icons.map((icon) => {
                      const isSelected = p.iconId === icon.id;
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => {
                            if (import.meta.env.DEV) {
                              console.debug("[IconGroup] select iconId", icon.id);
                            }
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
                ) : null}
              </details>
            );
          })
        ) : (
          <p className={styles.fieldHint}>No icons found for "{iconSearch}".</p>
        )}
      </div>
    </div>
  );
}

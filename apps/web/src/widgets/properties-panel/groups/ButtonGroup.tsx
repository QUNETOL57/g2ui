import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import ExpandLessOutlinedIcon from "@mui/icons-material/ExpandLessOutlined";
import ExpandMoreOutlinedIcon from "@mui/icons-material/ExpandMoreOutlined";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import type {
  ButtonIconPosition,
  ButtonIconSlot,
  ButtonProps,
  ColorRef,
  WidgetNode,
} from "@entities/ui-project";
import {
  buttonIconsWritePatch,
  createDefaultButtonIconSlot,
  resolveButtonIcons,
} from "@entities/ui-project/lib/buttonIcons";
import { getIconDefinition, ICON_GROUPS, IconGlyph } from "@entities/icon/iconLibrary";
import { cn } from "@shared/lib/cn";
import { IconButton } from "@shared/ui/IconButton";
import { SectionTitle } from "@shared/ui/SectionTitle";
import { ChevronIcon } from "@widgets/canvas-workspace/toolbarIcons";

import styles from "../PropertiesPanel.module.css";
import { ColorField } from "../ui/ColorField";
import { CollapsiblePanelCard } from "../ui/CollapsiblePanelCard";
import { InspectorCard } from "../ui/InspectorCard";
import { NumberField } from "../ui/NumberField";
import { TypographyCard } from "../ui/TypographyCard";

function IconBrowser({
  selectedIconId,
  search,
  onSearchChange,
  onSelect,
}: {
  selectedIconId: string;
  search: string;
  onSearchChange: (value: string) => void;
  onSelect: (iconId: string) => void;
}) {
  const normalizedSearch = search.trim().toLowerCase();
  const deferredSearch = useDeferredValue(normalizedSearch);
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
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (deferredSearch) return;
    setOpenGroups({});
  }, [deferredSearch]);

  return (
    <>
      <div className={styles.row}>
        <label>iconId</label>
        <input
          type="search"
          className={styles.inputSearch}
          placeholder="search icons"
          aria-label="iconId"
          value={search}
          onChange={(e) => {
            const nextSearch = e.target.value;
            onSearchChange(nextSearch);
            if (getIconDefinition(nextSearch)) {
              onSelect(nextSearch);
            }
          }}
        />
      </div>
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
                      const isSelected = selectedIconId === icon.id;
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => {
                            onSearchChange(icon.id);
                            onSelect(icon.id);
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
          <p className={styles.fieldHint}>No icons found for "{search}".</p>
        )}
      </div>
    </>
  );
}

function ButtonIconSlotCard({
  index,
  slot,
  fallbackColor,
  palette,
  onChangeSlot,
  onRemove,
}: {
  index: number;
  slot: ButtonIconSlot;
  fallbackColor: ColorRef | undefined;
  palette: { token: string; hex: string }[] | undefined;
  onChangeSlot: (next: ButtonIconSlot) => void;
  onRemove: () => void;
}) {
  const [search, setSearch] = useState(slot.iconId);

  useEffect(() => {
    setSearch(slot.iconId);
  }, [slot.iconId]);

  const position = slot.position ?? "left";
  const padTop = slot.paddingTop ?? 0;
  const padRight = slot.paddingRight ?? 0;
  const padBottom = slot.paddingBottom ?? 0;
  const padLeft = slot.paddingLeft ?? 0;

  return (
    <div className={styles.inspectorCard} data-testid={`button-icon-card-${index}`}>
      <div className={styles.inspectorCardHead}>
        <div className={styles.typographyCardTitle}>Icon {index + 1}</div>
        <IconButton
          variant="ghost"
          className={styles.iconButtonDanger}
          aria-label={`Remove icon ${index + 1}`}
          title={`Remove icon ${index + 1}`}
          tooltip="Remove"
          onClick={onRemove}
        >
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </div>
      <IconBrowser
        selectedIconId={slot.iconId}
        search={search}
        onSearchChange={setSearch}
        onSelect={(iconId) => onChangeSlot({ ...slot, iconId })}
      />
      <label className={styles.textFieldStack}>
        <span>Position</span>
        <select
          className={styles.inputText}
          aria-label={`Icon ${index + 1} position`}
          value={position}
          onChange={(event) =>
            onChangeSlot({
              ...slot,
              position: event.target.value as ButtonIconPosition,
            })
          }
        >
          <option value="left">Left</option>
          <option value="right">Right</option>
          <option value="top">Top</option>
          <option value="bottom">Bottom</option>
        </select>
      </label>
      <InspectorCard title="Padding">
        <div className={styles.paddingGrid4}>
          <NumberField
            label="top"
            value={padTop}
            min={0}
            onChange={(v) => onChangeSlot({ ...slot, paddingTop: Math.max(0, v) })}
          />
          <NumberField
            label="right"
            value={padRight}
            min={0}
            onChange={(v) => onChangeSlot({ ...slot, paddingRight: Math.max(0, v) })}
          />
          <NumberField
            label="bottom"
            value={padBottom}
            min={0}
            onChange={(v) => onChangeSlot({ ...slot, paddingBottom: Math.max(0, v) })}
          />
          <NumberField
            label="left"
            value={padLeft}
            min={0}
            onChange={(v) => onChangeSlot({ ...slot, paddingLeft: Math.max(0, v) })}
          />
        </div>
      </InspectorCard>
      <InspectorCard title="Color">
        <ColorField
          label="color"
          value={slot.color ?? fallbackColor}
          palette={palette}
          onChange={(color) => onChangeSlot({ ...slot, color })}
        />
      </InspectorCard>
    </div>
  );
}

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
  const icons = resolveButtonIcons(p);
  const hasText = p.text !== undefined;
  const [lastText, setLastText] = useState(p.text ?? "Button");
  const [lastIcons, setLastIcons] = useState<ButtonIconSlot[]>(icons);
  const [showIcons, setShowIcons] = useState(icons.length > 0);
  const [contentCollapsed, setContentCollapsed] = useState(false);

  useEffect(() => {
    if (p.text !== undefined) setLastText(p.text || "Button");
  }, [node.id, p.text]);

  useEffect(() => {
    const resolved = resolveButtonIcons((node.props ?? {}) as ButtonProps);
    if (resolved.length > 0) {
      setLastIcons(resolved);
      setShowIcons(true);
      return;
    }
    setShowIcons(false);
  }, [node.id]);

  const writeIcons = (next: ButtonIconSlot[]) => {
    if (next.length > 0) setLastIcons(next);
    onChange(buttonIconsWritePatch(next));
  };

  const contentCollapseAction = (
    <IconButton
      className={styles.sectionCollapseButton}
      onClick={() => setContentCollapsed((current) => !current)}
      aria-label={contentCollapsed ? "Expand content section" : "Collapse content section"}
      title={contentCollapsed ? "Expand content" : "Collapse content"}
      data-testid="button-content-collapse"
    >
      {contentCollapsed ? (
        <ExpandLessOutlinedIcon fontSize="inherit" />
      ) : (
        <ExpandMoreOutlinedIcon fontSize="inherit" />
      )}
    </IconButton>
  );

  return (
    <div className={cn(styles.group, styles.textGroup, styles.textGroupCollapsible)}>
      <SectionTitle actions={contentCollapseAction}>Content</SectionTitle>
      {!contentCollapsed ? (
        <div className={styles.textGroupBody}>
      <CollapsiblePanelCard
        title="Icons"
        testId="icons-card"
        headerToggle={{
          label: "Show icons",
          checked: showIcons,
          onChange: (checked) => {
            setShowIcons(checked);
            if (checked) {
              if (icons.length === 0 && lastIcons.length > 0) {
                writeIcons(lastIcons);
              }
              return;
            }
            if (icons.length > 0) setLastIcons(icons);
            writeIcons([]);
          },
        }}
      >
        {icons.map((slot, index) => (
          <ButtonIconSlotCard
            key={`${node.id}-icon-${index}`}
            index={index}
            slot={slot}
            fallbackColor={node.style?.textColor}
            palette={palette}
            onChangeSlot={(nextSlot) => {
              const next = icons.map((item, i) => (i === index ? nextSlot : item));
              writeIcons(next);
            }}
            onRemove={() => {
              writeIcons(icons.filter((_, i) => i !== index));
            }}
          />
        ))}
        <button
          type="button"
          className={styles.addItemButton}
          aria-label="Add icon"
          onClick={() =>
            writeIcons([
              ...icons,
              createDefaultButtonIconSlot(icons.length === 0 ? "left" : "right"),
            ])
          }
        >
          <AddOutlinedIcon fontSize="small" aria-hidden />
          <span>Add icon</span>
        </button>
        {icons.length === 0 ? (
          <p className={styles.fieldHint}>Add icons before, after, above, or below the text.</p>
        ) : null}
      </CollapsiblePanelCard>
      <TypographyCard
        title="Text"
        headerToggle={{
          label: "Show text",
          checked: hasText,
          onChange: (checked) => {
            if (checked) {
              onChange({ text: lastText || "Button" });
              return;
            }
            if (p.text !== undefined) setLastText(p.text || "Button");
            onChange({ text: undefined });
          },
        }}
        props={p}
        style={node.style}
        palette={palette}
        backgroundDefaultEnabled
        showBackground={false}
        showTextField
        textFieldAriaLabel="button text"
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
      ) : null}
    </div>
  );
}

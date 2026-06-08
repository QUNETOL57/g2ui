import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { WidgetType } from "@entities/ui-project";
import { useEditorStore } from "@entities/ui-project/model/store";
import { findNode } from "@entities/ui-project/model/tree-ops";
import { cn } from "@shared/lib/cn";

import styles from "./CanvasToolbar.module.css";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ButtonIcon,
  ChevronIcon,
  FrameIcon,
  IconGlyphIcon,
  ImageIcon,
  LineIcon,
  RectIcon,
  SelectToolIcon,
  TextIcon,
} from "./toolbarIcons";

interface ToolItem {
  type: WidgetType;
  label: string;
  icon: ReactNode;
}

interface ToolGroup {
  id: string;
  label: string;
  /** icon shown on the main group button (defaults to the first item icon). */
  icon: ReactNode;
  items: ToolItem[];
}

const TOOL_GROUPS: ToolGroup[] = [
  {
    id: "layout",
    label: "Layout",
    icon: <FrameIcon />,
    items: [{ type: "panel", label: "Panel", icon: <FrameIcon /> }],
  },
  {
    id: "shape",
    label: "Shapes",
    icon: <RectIcon />,
    items: [
      { type: "rect", label: "Rectangle", icon: <RectIcon /> },
      { type: "line", label: "Line", icon: <LineIcon /> },
    ],
  },
  {
    id: "text",
    label: "Text",
    icon: <TextIcon />,
    items: [
      { type: "label", label: "Label", icon: <TextIcon /> },
      { type: "button", label: "Button", icon: <ButtonIcon /> },
    ],
  },
  {
    id: "media",
    label: "Media",
    icon: <IconGlyphIcon />,
    items: [
      { type: "icon", label: "Icon", icon: <IconGlyphIcon /> },
      { type: "image", label: "Image", icon: <ImageIcon /> },
    ],
  },
];

export function CanvasToolbar() {
  const activeScreenId = useEditorStore((s) => s.activeScreenId);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const selectNode = useEditorStore((s) => s.selectNode);
  const addWidget = useEditorStore((s) => s.addWidget);
  const moveNode = useEditorStore((s) => s.moveNode);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);

  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const menuBaseId = useId();

  useEffect(() => {
    if (!openGroupId) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenGroupId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroupId(null);
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [openGroupId]);

  const resolveParentForAdd = () => {
    if (!selectedNodeId) return activeScreenId;
    const selected = findNode(useEditorStore.getState().project, selectedNodeId);
    return selected?.type === "screen" || selected?.type === "panel"
      ? selected.id
      : activeScreenId;
  };

  const handleAdd = (type: WidgetType) => {
    addWidget(resolveParentForAdd(), type);
    setOpenGroupId(null);
  };

  const canArrange = !!selectedNodeId;
  const deletableIds = selectedNodeIds.filter((id) => id !== activeScreenId);
  const canDelete = deletableIds.length > 0;

  return (
    <div className={styles.toolbar} ref={rootRef} role="toolbar" aria-label="Canvas tools">
      <button
        type="button"
        className={cn(styles.tool, styles.toolActive)}
        title="Select"
        aria-label="Select"
        onClick={() => {
          selectNode(null);
          setOpenGroupId(null);
        }}
      >
        <SelectToolIcon />
      </button>

      <span className={styles.divider} aria-hidden />

      {TOOL_GROUPS.map((group) => {
        const hasMenu = group.items.length > 1;
        const menuId = `${menuBaseId}-${group.id}`;
        const isOpen = openGroupId === group.id;
        return (
          <div
            key={group.id}
            className={cn(
              styles.group,
              hasMenu && styles.groupMenu,
              hasMenu && isOpen && styles.groupMenuOpen,
            )}
          >
            <button
              type="button"
              className={styles.tool}
              title={hasMenu ? group.label : `Add ${group.items[0].label.toLowerCase()}`}
              aria-label={hasMenu ? group.label : `Add ${group.items[0].label.toLowerCase()}`}
              aria-haspopup={hasMenu ? "menu" : undefined}
              aria-expanded={hasMenu ? isOpen : undefined}
              aria-controls={hasMenu ? menuId : undefined}
              onClick={() =>
                hasMenu ? setOpenGroupId(isOpen ? null : group.id) : handleAdd(group.items[0].type)
              }
            >
              {group.icon}
            </button>
            {hasMenu ? (
              <button
                type="button"
                className={cn(styles.chevron, isOpen && styles.chevronOpen)}
                aria-label={`${group.label} tools`}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                aria-controls={menuId}
                onClick={() => setOpenGroupId(isOpen ? null : group.id)}
              >
                <ChevronIcon />
              </button>
            ) : null}
            {hasMenu && isOpen ? (
              <div className={styles.menu} id={menuId} role="menu" aria-label={group.label}>
                {group.items.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    role="menuitem"
                    className={styles.menuItem}
                    onClick={() => handleAdd(item.type)}
                  >
                    <span className={styles.menuItemIcon}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}

      <span className={styles.divider} aria-hidden />

      <div className={styles.arrangeGroup}>
        <button
          type="button"
          className={styles.tool}
          title="Move up"
          aria-label="Move up"
          disabled={!canArrange}
          onClick={() => selectedNodeId && moveNode(selectedNodeId, "up")}
        >
          <ArrowUpIcon />
        </button>
        <button
          type="button"
          className={styles.tool}
          title="Move down"
          aria-label="Move down"
          disabled={!canArrange}
          onClick={() => selectedNodeId && moveNode(selectedNodeId, "down")}
        >
          <ArrowDownIcon />
        </button>
        <button
          type="button"
          className={cn(styles.tool, styles.toolDanger)}
          title="Delete"
          aria-label="Delete"
          disabled={!canDelete}
          onClick={() => deleteNodes(selectedNodeIds)}
        >
          <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
    </div>
  );
}

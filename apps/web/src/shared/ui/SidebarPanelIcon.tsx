interface SidebarPanelIconProps {
  side: "left" | "right";
}

/** Rounded frame with a filled sidebar strip (left or right). */
export function SidebarPanelIcon({ side }: SidebarPanelIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden focusable="false">
      <rect
        x="4"
        y="5"
        width="16"
        height="14"
        rx="2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x={side === "left" ? 6.5 : 14}
        y="7"
        width="3.5"
        height="10"
        rx="0.75"
        fill="currentColor"
      />
    </svg>
  );
}

interface ToolbarIconProps {
  size?: number;
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false as const,
});

export function SelectToolIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)} fill="currentColor" stroke="none">
      <path d="M6 4.2 17.5 11l-4.8 1.1 2.7 5.2-2.1 1.1-2.7-5.2-3.3 3.5z" />
    </svg>
  );
}

export function FrameIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M8 3v18M16 3v18M3 8h18M3 16h18" />
    </svg>
  );
}

export function RectIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" />
    </svg>
  );
}

export function LineIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 19 19 5" />
      <circle cx="5" cy="19" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="5" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TextIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M5 6.5V5h14v1.5M12 5v14M9.5 19h5" />
    </svg>
  );
}

export function ButtonIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="7.5" width="18" height="9" rx="4.5" />
      <path d="M8.5 12h7" />
    </svg>
  );
}

export function IconGlyphIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5l2.5 5.3 5.8.7-4.3 3.9 1.2 5.7L12 16.9 6.8 19.8 8 14.1 3.7 10.2l5.8-.7z" />
    </svg>
  );
}

export function ImageIcon({ size = 18 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M5 17l4.5-4.5 3.5 3.5 2.5-2.5L19 17" />
    </svg>
  );
}

export function ChevronIcon({ size = 12 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

export function ArrowUpIcon({ size = 16 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 19V5M6 11l6-6 6 6" />
    </svg>
  );
}

export function ArrowDownIcon({ size = 16 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M12 5v14M6 13l6 6 6-6" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }: ToolbarIconProps) {
  return (
    <svg {...base(size)}>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

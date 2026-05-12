import type { ButtonHTMLAttributes, ReactNode } from "react";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  tooltip?: string;
}

export function IconButton({ children, className, title, tooltip, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      className={["icon-button", className].filter(Boolean).join(" ")}
      title={title}
      data-tooltip={tooltip}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

import { useCallback, useEffect, useId, useRef, useState } from "react";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";

import { cn } from "@shared/lib/cn";
import { IconButton } from "@shared/ui/IconButton";
import { ChangePasswordModal } from "@widgets/account/ChangePasswordModal";

import styles from "./UserAccountMenu.module.css";

interface UserAccountMenuProps {
  userEmail: string;
  onSignOut: () => void;
}

export function UserAccountMenu({ userEmail, onSignOut }: UserAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const closeMenu = useCallback(() => {
    setOpen(false);
    rootRef.current?.querySelector("button")?.blur();
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeMenu();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, closeMenu]);

  return (
    <>
      <div className={styles.root} ref={rootRef}>
        <IconButton
          variant="ghost"
          className={cn(open && styles.triggerOpen)}
          title="Account"
          aria-label="Account"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => {
            if (open) {
              closeMenu();
            } else {
              setOpen(true);
            }
          }}
        >
          <PersonOutlineOutlinedIcon fontSize="inherit" />
        </IconButton>
        {open ? (
          <div className={styles.menu} id={menuId} role="menu" aria-label="Account">
            <div className={styles.userEmail} role="presentation">
              {userEmail}
            </div>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                closeMenu();
                setIsChangePasswordOpen(true);
              }}
            >
              <LockOutlinedIcon fontSize="small" aria-hidden />
              Change password
            </button>
            <button
              type="button"
              className={styles.menuItem}
              role="menuitem"
              onClick={() => {
                closeMenu();
                onSignOut();
              }}
            >
              <LogoutOutlinedIcon fontSize="small" aria-hidden />
              Sign out
            </button>
          </div>
        ) : null}
      </div>
      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
}

import { useEffect, useState } from "react";
import LoginOutlinedIcon from "@mui/icons-material/LoginOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";

import { useEditorStore } from "@entities/ui-project/model/store";
import { cn } from "@shared/lib/cn";
import { findNode } from "@entities/ui-project/model/tree-ops";
import type { AuthMode } from "@pages/auth/AuthPage";
import logoUrl from "@shared/assets/logo.svg";
import { Button } from "@shared/ui/Button";
import { IconButton } from "@shared/ui/IconButton";
import { Modal } from "@shared/ui/Modal";
import { TopBar } from "@shared/ui/TopBar";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";
import { EditorMenu } from "@widgets/editor-menu/EditorMenu";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";
import { LeftPanelLayout } from "@widgets/left-panel/LeftPanelLayout";

import styles from "./EditorPage.module.css";

interface EditorPageProps {
  autosaveStatus?: "local" | "saved" | "saving" | "unsynced" | "error";
  autosaveError?: string | null;
  userEmail?: string | null;
  onOpenAuth?: (mode: AuthMode) => void;
  onLogout?: () => void;
  onBackToLibrary: () => void;
}

export function EditorPage({
  autosaveStatus = "local",
  autosaveError = null,
  userEmail = null,
  onOpenAuth,
  onLogout,
  onBackToLibrary,
}: EditorPageProps) {
  const lastError = useEditorStore((s) => s.lastError);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const isEditingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);
      const isModifier = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      const isUndoKey = isModifier && key === "z" && !event.shiftKey;
      const isRedoKey = isModifier && ((key === "z" && event.shiftKey) || key === "y");

      if ((isUndoKey || isRedoKey) && !isEditingText) {
        event.preventDefault();
        if (isUndoKey) undo();
        else redo();
        return;
      }

      if (
        event.key === "Enter" &&
        !isModifier &&
        !isEditingText &&
        selectedNodeId
      ) {
        const node = findNode(useEditorStore.getState().project, selectedNodeId);
        if (node?.type === "label" || node?.type === "button") {
          event.preventDefault();
          beginLabelTextEdit(selectedNodeId);
          return;
        }
      }

      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";

      if (!isDeleteKey || selectedNodeIds.length === 0) return;
      if (isEditingText) return;

      event.preventDefault();
      deleteNodes(selectedNodeIds);
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [beginLabelTextEdit, deleteNodes, redo, selectedNodeId, selectedNodeIds, undo]);

  return (
    <div
      className={cn(
        styles.appShell,
        !leftPanelOpen && styles.appShellLeftCollapsed,
        !rightPanelOpen && styles.appShellRightCollapsed,
      )}
    >
      <TopBar>
        <div className={styles.topBarStart}>
          <div className={styles.brand}>
            <button
              type="button"
              className={styles.brandLogoButton}
              onClick={onBackToLibrary}
              title="Back to project library"
              aria-label="Back to project library"
            >
              <img
                className={styles.brandLogo}
                src={logoUrl}
                alt=""
                aria-hidden
              />
            </button>
          </div>
          <EditorMenu
            onBackToLibrary={onBackToLibrary}
            viewSettings={{
              showGrid,
              showRulers,
              showGuides,
              onToggleGrid: () => setShowGrid((visible) => !visible),
              onToggleRulers: () => setShowRulers((visible) => !visible),
              onToggleGuides: () => setShowGuides((visible) => !visible),
            }}
          />
        </div>
        <TopBar.Controls>
          {userEmail ? <span className={styles.userEmail}>{userEmail}</span> : null}
          {onLogout ? (
            <IconButton
              title="Sign out"
              aria-label="Sign out"
              onClick={() => setIsLogoutConfirmOpen(true)}
            >
              <LogoutOutlinedIcon fontSize="inherit" />
            </IconButton>
          ) : onOpenAuth ? (
            <IconButton title="Sign in" aria-label="Sign in" onClick={() => onOpenAuth("login")}>
              <LoginOutlinedIcon fontSize="inherit" />
            </IconButton>
          ) : null}
        </TopBar.Controls>
      </TopBar>
      <aside
        className={cn(styles.leftPanel, !leftPanelOpen && styles.panelCollapsed)}
        aria-hidden={!leftPanelOpen}
      >
        {leftPanelOpen ? <LeftPanelLayout /> : null}
      </aside>
      <div className={styles.centerPanel}>
        <CanvasWorkspace
          leftPanelOpen={leftPanelOpen}
          rightPanelOpen={rightPanelOpen}
          showGrid={showGrid}
          showRulers={showRulers}
          showGuides={showGuides}
          onToggleLeftPanel={() => setLeftPanelOpen((open) => !open)}
          onToggleRightPanel={() => setRightPanelOpen((open) => !open)}
        />
        {lastError ? <div className={styles.errorBanner}>{lastError}</div> : null}
      </div>
      <aside
        className={cn(styles.rightPanel, !rightPanelOpen && styles.panelCollapsed)}
        aria-hidden={!rightPanelOpen}
      >
        {rightPanelOpen ? <PropertiesPanel /> : null}
      </aside>
      <div className={styles.statusBarSlot}>
        <EditorStatusBar autosaveStatus={autosaveStatus} autosaveError={autosaveError} />
      </div>
      <Modal
        open={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        size="sm"
        className={styles.logoutDialog}
        closeOnBackdrop={false}
      >
        <h2>Sign out?</h2>
        <p>You will leave this account. Local drafts will stay in this browser.</p>
        <div className={styles.logoutActions}>
          <Button type="button" size="sm" onClick={() => setIsLogoutConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => {
              setIsLogoutConfirmOpen(false);
              onLogout?.();
            }}
          >
            Sign out
          </Button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";

import { useEditorStore } from "@entities/ui-project/model/store";
import { cn } from "@shared/lib/cn";
import { debugLog } from "@shared/lib/debugLog";
import type { AutosaveStatus } from "@shared/lib/sync-status";
import { findNode } from "@entities/ui-project/model/tree-ops";
import type { AuthMode } from "@pages/auth/AuthPage";
import logoUrl from "@shared/assets/logo.svg";
import { Button } from "@shared/ui/Button";
import { Modal } from "@shared/ui/Modal";
import { SignInButton } from "@shared/ui/SignInButton";
import { TopBar } from "@shared/ui/TopBar";
import { UserAccountMenu } from "@shared/ui/UserAccountMenu";
import { CanvasWorkspace } from "@widgets/canvas-workspace/CanvasWorkspace";
import { EditorMenu } from "@widgets/editor-menu/EditorMenu";
import { EditorStatusBar } from "@widgets/editor-status-bar/EditorStatusBar";
import { PropertiesPanel } from "@widgets/properties-panel/PropertiesPanel";
import { LeftPanelLayout } from "@widgets/left-panel/LeftPanelLayout";

import styles from "./EditorPage.module.css";

interface EditorPageProps {
  autosaveStatus?: AutosaveStatus;
  autosaveError?: string | null;
  userEmail?: string | null;
  isTemplate?: boolean;
  allowCanvasOverflow?: boolean;
  showFullWidgets?: boolean;
  onCanvasViewSettingsChange?: (settings: {
    allowCanvasOverflow: boolean;
    showFullWidgets: boolean;
  }) => void;
  onToggleTemplate?: () => void;
  onOpenAuth?: (mode: AuthMode) => void;
  onLogout?: () => void;
  onBackToLibrary: () => void;
}

export function EditorPage({
  autosaveStatus = "local",
  autosaveError = null,
  userEmail = null,
  isTemplate = false,
  allowCanvasOverflow: initialAllowCanvasOverflow = false,
  showFullWidgets: initialShowFullWidgets = false,
  onCanvasViewSettingsChange,
  onToggleTemplate,
  onOpenAuth,
  onLogout,
  onBackToLibrary,
}: EditorPageProps) {
  const lastError = useEditorStore((s) => s.lastError);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedNodeIds = useEditorStore((s) => s.selectedNodeIds);
  const deleteNodes = useEditorStore((s) => s.deleteNodes);
  const copySelectedNodes = useEditorStore((s) => s.copySelectedNodes);
  const pasteClipboard = useEditorStore((s) => s.pasteClipboard);
  const duplicateSelectedNodes = useEditorStore((s) => s.duplicateSelectedNodes);
  const rotateSelectedNodes = useEditorStore((s) => s.rotateSelectedNodes);
  const beginLabelTextEdit = useEditorStore((s) => s.beginLabelTextEdit);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showGridOverlay, setShowGridOverlay] = useState(false);
  const [showRulers, setShowRulers] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [allowCanvasOverflow, setAllowCanvasOverflow] = useState(initialAllowCanvasOverflow);
  const [showFullWidgets, setShowFullWidgets] = useState(
    initialAllowCanvasOverflow && initialShowFullWidgets,
  );
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
      const isCopyKey = isModifier && key === "c" && !event.shiftKey && !event.altKey;
      const isPasteKey = isModifier && key === "v" && !event.shiftKey && !event.altKey;
      const isDuplicateKey = isModifier && key === "d" && !event.shiftKey && !event.altKey;
      const isDeleteKey =
        event.key === "Delete" ||
        event.key === "Backspace" ||
        event.code === "Delete" ||
        event.code === "Backspace";

      // Always swallow Delete/Backspace outside fields so the browser cannot
      // treat them as history navigation (e.g. back to /docs#/).
      if (isDeleteKey && !isEditingText) {
        event.preventDefault();
        if (document.querySelector('[aria-modal="true"]')) return;
        if (selectedNodeIds.length === 0) return;
        deleteNodes(selectedNodeIds);
        return;
      }

      // While any modal is open, keep editor hotkeys from acting on the selection.
      if (document.querySelector('[aria-modal="true"]')) return;

      if ((isUndoKey || isRedoKey) && !isEditingText) {
        event.preventDefault();
        if (isUndoKey) undo();
        else redo();
        return;
      }

      if (isCopyKey && !isEditingText) {
        if (copySelectedNodes()) event.preventDefault();
        return;
      }

      if (isPasteKey && !isEditingText) {
        if (pasteClipboard()) event.preventDefault();
        return;
      }

      if (isDuplicateKey && !isEditingText) {
        if (duplicateSelectedNodes()) event.preventDefault();
        return;
      }

      if (!isModifier && !isEditingText && key === "r" && selectedNodeIds.length > 0) {
        if (rotateSelectedNodes(event.shiftKey ? -1 : 1)) {
          event.preventDefault();
        }
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
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [
    beginLabelTextEdit,
    copySelectedNodes,
    deleteNodes,
    duplicateSelectedNodes,
    pasteClipboard,
    redo,
    rotateSelectedNodes,
    selectedNodeId,
    selectedNodeIds,
    undo,
  ]);

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
              showGridOverlay,
              showRulers,
              showGuides,
              allowCanvasOverflow,
              showFullWidgets,
              onToggleGrid: () =>
                setShowGrid((visible) => {
                  if (visible) setShowGridOverlay(false);
                  return !visible;
                }),
              onToggleGridOverlay: () => setShowGridOverlay((visible) => !visible),
              onToggleRulers: () => setShowRulers((visible) => !visible),
              onToggleGuides: () => setShowGuides((visible) => !visible),
              onToggleCanvasOverflow: () => {
                const nextOverflow = !allowCanvasOverflow;
                const next = {
                  allowCanvasOverflow: nextOverflow,
                  showFullWidgets: nextOverflow ? showFullWidgets : false,
                };
                setAllowCanvasOverflow(next.allowCanvasOverflow);
                setShowFullWidgets(next.showFullWidgets);
                debugLog("view", "allowCanvasOverflow changed", next);
                onCanvasViewSettingsChange?.(next);
              },
              onToggleFullWidgets: () => {
                if (!allowCanvasOverflow) return;
                const next = {
                  allowCanvasOverflow: true,
                  showFullWidgets: !showFullWidgets,
                };
                setShowFullWidgets(next.showFullWidgets);
                debugLog("view", "showFullWidgets changed", next);
                onCanvasViewSettingsChange?.(next);
              },
            }}
            templateSettings={{
              isTemplate,
              onToggleTemplate: () => onToggleTemplate?.(),
            }}
          />
        </div>
        <TopBar.Controls>
          {onLogout && userEmail ? (
            <UserAccountMenu
              userEmail={userEmail}
              onSignOut={() => setIsLogoutConfirmOpen(true)}
            />
          ) : onOpenAuth ? (
            <SignInButton onClick={() => onOpenAuth("login")} />
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
          showGridOverlay={showGridOverlay}
          showRulers={showRulers}
          showGuides={showGuides}
          allowCanvasOverflow={allowCanvasOverflow}
          showFullWidgets={showFullWidgets}
          isTemplate={isTemplate}
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
        <EditorStatusBar
          autosaveStatus={autosaveStatus}
          autosaveError={autosaveError}
          userEmail={userEmail}
        />
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

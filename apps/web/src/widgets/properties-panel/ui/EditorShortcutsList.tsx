import { getEditorShortcuts } from "@shared/config/editorShortcuts";

import styles from "./EditorShortcutsList.module.css";

export function EditorShortcutsList() {
  const shortcuts = getEditorShortcuts();

  return (
    <section className={styles.shortcuts} aria-label="Keyboard shortcuts">
      <h4 className={styles.title}>Shortcuts</h4>
      <ul className={styles.list}>
        {shortcuts.map((shortcut) => (
          <li key={`${shortcut.label}-${shortcut.keys}`} className={styles.item}>
            <span className={styles.label}>{shortcut.label}</span>
            <kbd className={styles.keys}>{shortcut.keys}</kbd>
          </li>
        ))}
      </ul>
    </section>
  );
}

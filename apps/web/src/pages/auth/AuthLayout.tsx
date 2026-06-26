import type { ReactNode } from "react";

import panelStyles from "@pages/library/CreateProjectPanel.module.css";

import styles from "./AuthPage.module.css";

interface AuthLayoutProps {
  kicker: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthLayout({ kicker, description, children, footer }: AuthLayoutProps) {
  return (
    <aside className={panelStyles.panel}>
      <div className={panelStyles.title}>
        <div className={panelStyles.kicker}>{kicker}</div>
        <p>{description}</p>
      </div>

      {children}

      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </aside>
  );
}

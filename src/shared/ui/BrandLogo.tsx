import { cn } from "@shared/lib/cn";
import logoUrl from "@shared/assets/logo.svg";

import styles from "./BrandLogo.module.css";

interface BrandLogoProps {
  className?: string;
  framed?: boolean;
}

export function BrandLogo({ className, framed = false }: BrandLogoProps) {
  const inner = (
    <>
      <img
        className={styles.logo}
        src={logoUrl}
        alt="GuiMintLab Studio"
        title="GuiMintLab Studio"
      />
      <span className={styles.name}>
        <strong>
          g<span className={styles.accent}>2</span>
          <span className={styles.white}>ui</span>
        </strong>
      </span>
    </>
  );
  return (
    <div className={cn(styles.brand, className)}>
      {framed ? <div className={styles.brandMain}>{inner}</div> : inner}
    </div>
  );
}

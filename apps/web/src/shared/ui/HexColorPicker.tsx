import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";

import { normalizeHex } from "@entities/ui-project/lib/palette";
import { cn } from "@shared/lib/cn";
import { hexToHsv, hsvToHex, type Hsv } from "@shared/lib/colorModel";

import styles from "./HexColorPicker.module.css";

interface HexColorPickerProps {
  value: string;
  onChange: (hex: string) => void;
  ariaLabel: string;
  className?: string;
  /** Horizontal alignment of the popover relative to the swatch. */
  align?: "start" | "end";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

const PANEL_WIDTH = 220;
const PANEL_GAP = 6;

export function HexColorPicker({
  value,
  onChange,
  ariaLabel,
  className,
  align = "end",
}: HexColorPickerProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const svRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const [draft, setDraft] = useState(value);
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value) ?? { h: 0, s: 0, v: 1 });
  const hsvRef = useRef(hsv);
  hsvRef.current = hsv;
  const draggingRef = useRef(false);
  const lastEmittedHexRef = useRef((normalizeHex(value) ?? value).toUpperCase());

  const preview = normalizeHex(draft) ?? normalizeHex(value) ?? "#FFFFFF";

  useEffect(() => {
    const normalized = normalizeHex(value)?.toUpperCase() ?? value.toUpperCase();
    setDraft(value);

    if (draggingRef.current) return;
    if (normalized === lastEmittedHexRef.current) return;

    const next = hexToHsv(value, hsvRef.current.h);
    if (next) {
      hsvRef.current = next;
      setHsv(next);
    }
    lastEmittedHexRef.current = normalized;
  }, [value]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    const updatePosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const left =
        align === "start"
          ? Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)
          : Math.min(Math.max(8, rect.right - PANEL_WIDTH), window.innerWidth - PANEL_WIDTH - 8);
      const top = Math.min(rect.bottom + PANEL_GAP, window.innerHeight - 8);
      setPanelStyle({
        position: "fixed",
        top,
        left: Math.max(8, left),
        width: PANEL_WIDTH,
        zIndex: 400,
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  const emitHsv = (next: Hsv) => {
    hsvRef.current = next;
    setHsv(next);
    const hex = hsvToHex(next);
    setDraft(hex);
    lastEmittedHexRef.current = hex;
    onChange(hex);
  };

  const updateSvFromPointer = (clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = clamp01((clientX - rect.left) / rect.width);
    const v = clamp01(1 - (clientY - rect.top) / rect.height);
    emitHsv({ ...hsvRef.current, s, v });
  };

  const updateHueFromPointer = (clientX: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const h = clamp01((clientX - rect.left) / rect.width) * 360;
    emitHsv({ ...hsvRef.current, h });
  };

  const bindDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    move: (clientX: number, clientY: number) => void,
  ) => {
    event.preventDefault();
    draggingRef.current = true;
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    move(event.clientX, event.clientY);
    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const onUp = (ev: PointerEvent) => {
      draggingRef.current = false;
      target.releasePointerCapture(ev.pointerId);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    };
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
  };

  const applyHexText = (raw: string, commitInvalid: boolean) => {
    setDraft(raw);
    const normalized = normalizeHex(raw);
    if (!normalized) {
      if (commitInvalid) setDraft(value);
      return;
    }
    const next = hexToHsv(normalized, hsvRef.current.h);
    if (next) {
      hsvRef.current = next;
      setHsv(next);
    }
    setDraft(normalized);
    lastEmittedHexRef.current = normalized;
    if (normalized.toUpperCase() !== (normalizeHex(value) ?? value).toUpperCase()) {
      onChange(normalized);
    }
  };

  const hueColor = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  const panel = open ? (
    <div
      ref={panelRef}
      className={styles.panel}
      id={panelId}
      role="dialog"
      aria-label={`${ariaLabel} color picker`}
      style={panelStyle}
    >
      <div
        ref={svRef}
        className={styles.sv}
        style={{ backgroundColor: hueColor }}
        onPointerDown={(event) => bindDrag(event, updateSvFromPointer)}
      >
        <div className={styles.svWhite} />
        <div className={styles.svBlack} />
        <span
          className={styles.svThumb}
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      <div
        ref={hueRef}
        className={styles.hue}
        onPointerDown={(event) => bindDrag(event, (clientX) => updateHueFromPointer(clientX))}
      >
        <span className={styles.hueThumb} style={{ left: `${(hsv.h / 360) * 100}%` }} />
      </div>

      <div className={styles.hexRow}>
        <span className={styles.hexLabel}>HEX</span>
        <input
          type="text"
          className={styles.panelHexInput}
          value={draft}
          spellCheck={false}
          aria-label={ariaLabel}
          placeholder="#FFFFFF"
          onChange={(event) => applyHexText(event.target.value, false)}
          onBlur={() => applyHexText(draft, true)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
            if (event.key === "Escape") {
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
        />
      </div>
    </div>
  ) : null;

  return (
    <div className={cn(styles.root, className)} ref={rootRef}>
      <button
        type="button"
        className={styles.swatchButton}
        aria-label={`${ariaLabel} picker`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={preview}
        style={{ backgroundColor: preview }}
        onClick={() => setOpen((current) => !current)}
      />
      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}

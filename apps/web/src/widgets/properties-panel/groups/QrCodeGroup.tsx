import type { Frame, QrCodeEcc, QrCodeProps, QrCodeSize, WidgetNode } from "@entities/ui-project";
import {
  canEncodeQr,
  minQrVersion,
  nextValidQrProps,
  QR_CODE_ECC_HELP,
  QR_CODE_ECC_LABEL,
  QR_CODE_ECC_OPTIONS,
  QR_CODE_MODULE_SCALE,
  QR_CODE_SIZE_OPTIONS,
  QR_CODE_VERSION_OPTIONS,
  qrByteCapacity,
  qrEccOptions,
  qrModuleCount,
  qrRenderedSize,
  qrVersionOptions,
  normalizeQrProps,
} from "@entities/ui-project/lib/qrcode";
import { Textarea } from "@shared/ui/Textarea";

import styles from "../PropertiesPanel.module.css";
import { InspectorCard } from "../ui/InspectorCard";

export function QrCodeGroup({
  node,
  onChange,
  onFrameChange,
}: {
  node: WidgetNode;
  onChange: (patch: Partial<QrCodeProps>) => void;
  onFrameChange: (frame: Frame) => void;
}) {
  const props = normalizeQrProps((node.props ?? {}) as Partial<QrCodeProps>);
  const versionOptions = qrVersionOptions(props.text, props.ecc);
  const eccOptions = qrEccOptions(props.text, props.version);
  const minVersion = minQrVersion(props.text, props.ecc);
  const renderedSize = qrRenderedSize(props.version, props.size);
  const currentCapacity = qrByteCapacity(props.version, props.ecc);
  const moduleCount = qrModuleCount(props.version);
  const impossible = minVersion == null;

  const apply = (patch: Partial<QrCodeProps>) => {
    const next = nextValidQrProps(props, patch);
    onChange(next);
    if (node.frame) {
      const nextSize = qrRenderedSize(next.version, next.size);
      if (node.frame.width !== nextSize || node.frame.height !== nextSize) {
        onFrameChange({ ...node.frame, width: nextSize, height: nextSize });
      }
    }
  };

  return (
    <div className={styles.group}>
      <h4>QR Code</h4>
      <InspectorCard title="Payload">
        <Textarea
          aria-label="qr text"
          variant="mono"
          className={styles.qrPayloadInput}
          rows={5}
          value={props.text}
          onChange={(event) => apply({ text: event.target.value })}
        />
        <p className={styles.fieldHint}>
          {props.text.length} chars · current capacity {currentCapacity} byte chars
        </p>
      </InspectorCard>

      <InspectorCard title="Encoding">
        <div className={styles.row}>
          <label title={QR_CODE_ECC_HELP}>ecc</label>
          <select
            aria-label="qr ecc"
            className={styles.inputText}
            value={props.ecc}
            title={QR_CODE_ECC_HELP}
            onChange={(event) => apply({ ecc: event.target.value as QrCodeEcc })}
          >
            {eccOptions.map((option) => (
              <option
                key={option.ecc}
                value={option.ecc}
                disabled={option.disabled}
                title={option.reason}
              >
                {QR_CODE_ECC_LABEL[option.ecc]}
              </option>
            ))}
          </select>
        </div>
        <p className={styles.fieldHint}>{QR_CODE_ECC_HELP}</p>

        <div className={styles.row}>
          <label title={`v${props.version}: ${moduleCount}x${moduleCount} modules, ${currentCapacity} byte chars at ECC ${QR_CODE_ECC_LABEL[props.ecc]}.`}>
            version
          </label>
          <select
            aria-label="qr version"
            className={styles.inputText}
            value={String(props.version)}
            onChange={(event) => apply({ version: Number(event.target.value) })}
          >
            {versionOptions.map((option) => (
              <option
                key={option.version}
                value={option.version}
                disabled={option.disabled}
                title={option.reason ?? `${option.moduleCount}x${option.moduleCount} modules · ${option.capacity} byte chars`}
              >
                v{option.version} · {option.moduleCount}x{option.moduleCount} · {option.capacity}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.row}>
          <label>size</label>
          <select
            aria-label="qr size"
            className={styles.inputText}
            value={props.size}
            onChange={(event) => apply({ size: event.target.value as QrCodeSize })}
          >
            {QR_CODE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} · {QR_CODE_MODULE_SCALE[size]}px · {qrRenderedSize(props.version, size)}x{qrRenderedSize(props.version, size)}
              </option>
            ))}
          </select>
        </div>

        <p className={styles.fieldHint}>
          {impossible
            ? "Text is too large for QR v40 at this ECC."
            : `Minimum for this text: v${minVersion}. Rendered: ${renderedSize}x${renderedSize}px.`}
        </p>

        {!canEncodeQr(props.text, props.version, props.ecc) ? (
          <p className={styles.fieldHint}>Current version/ECC does not fit this text.</p>
        ) : null}
      </InspectorCard>
    </div>
  );
}

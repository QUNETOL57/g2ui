import { describe, expect, it } from "vitest";

import {
  buildQrMatrix,
  canEncodeQr,
  minQrVersion,
  nextValidQrProps,
  qrByteCapacity,
  qrEccOptions,
  qrModuleCount,
  qrRenderedSize,
  utf8ByteLength,
  qrVersionOptions,
} from "@entities/ui-project/lib/qrcode";
import type { QrCodeProps } from "@entities/ui-project";

const WIFI_TEXT = "WIFI:T:WPA;S:WizardPod-AB12;P:x7k9m2pQ;;";

describe("QR code model helpers", () => {
  it("calculates module and rendered sizes from version and size token", () => {
    expect(qrModuleCount(1)).toBe(21);
    expect(qrModuleCount(3)).toBe(29);
    expect(qrRenderedSize(3, "xxs")).toBe(29);
    expect(qrRenderedSize(3, "m")).toBe(116);
    expect(qrRenderedSize(3, "xxl")).toBe(203);
  });

  it("finds the minimum QR version for byte-mode WiFi payloads", () => {
    expect(minQrVersion(WIFI_TEXT, "m")).toBe(3);
    expect(canEncodeQr(WIFI_TEXT, 2, "m")).toBe(false);
    expect(canEncodeQr(WIFI_TEXT, 3, "m")).toBe(true);
  });

  it("disables versions that cannot hold the current text at selected ECC", () => {
    const options = qrVersionOptions(WIFI_TEXT, "m");
    expect(options[0]).toMatchObject({ version: 1, disabled: true });
    expect(options[1]).toMatchObject({ version: 2, disabled: true });
    expect(options[2]).toMatchObject({ version: 3, disabled: false, moduleCount: 29 });
    expect(options[2].capacity).toBeGreaterThanOrEqual(WIFI_TEXT.length);
  });

  it("disables ECC levels that cannot fit in the selected version", () => {
    const options = qrEccOptions(WIFI_TEXT, 3);
    expect(options.find((option) => option.ecc === "l")?.disabled).toBe(false);
    expect(options.find((option) => option.ecc === "m")?.disabled).toBe(false);
    expect(options.find((option) => option.ecc === "q")?.disabled).toBe(true);
    expect(options.find((option) => option.ecc === "h")?.disabled).toBe(true);
  });

  it("builds a matrix for valid props and rejects impossible ones", () => {
    const matrix = buildQrMatrix({ text: WIFI_TEXT, version: 3, ecc: "m", size: "m" });
    expect(matrix?.moduleCount).toBe(29);
    expect(matrix?.modules).toHaveLength(29);
    expect(matrix?.modules.some((row) => row.some(Boolean))).toBe(true);

    expect(buildQrMatrix({ text: WIFI_TEXT, version: 1, ecc: "h", size: "m" })).toBeNull();
    expect(buildQrMatrix({ text: "A", version: 1, ecc: "l", size: "m" })?.moduleCount).toBe(21);
    expect(buildQrMatrix({ text: "A", version: 1, ecc: "q", size: "m" })?.moduleCount).toBe(21);
    expect(buildQrMatrix({ text: "A", version: 1, ecc: "h", size: "m" })?.moduleCount).toBe(21);
  });

  it("auto-selects the minimum version when text or ECC changes", () => {
    const props: QrCodeProps = { text: WIFI_TEXT, version: 3, ecc: "m", size: "m" };
    expect(nextValidQrProps(props, { text: "A" }).version).toBe(1);
    expect(nextValidQrProps(props, { ecc: "q" }).version).toBe(4);
    expect(nextValidQrProps(props, { version: 5 }).version).toBe(5);
    expect(nextValidQrProps(props, { version: 1 }).version).toBe(3);
  });

  it("reports byte capacity for version tooltips", () => {
    expect(qrByteCapacity(3, "m")).toBeGreaterThanOrEqual(WIFI_TEXT.length);
    expect(qrByteCapacity(3, "q")).toBeLessThan(qrByteCapacity(3, "m"));
  });

  it("uses UTF-8 byte length for fit checks", () => {
    expect(utf8ByteLength("setup")).toBe(5);
    expect(utf8ByteLength("настройка")).toBeGreaterThan("настройка".length);
    expect(minQrVersion("A".repeat(3000), "l")).toBeNull();
  });
});

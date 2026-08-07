import qrcode from "qrcode-generator";

import type { QrCodeEcc, QrCodeProps, QrCodeSize } from "../types";

export const QR_CODE_ECC_OPTIONS = ["l", "m", "q", "h"] as const satisfies readonly QrCodeEcc[];
export const QR_CODE_SIZE_OPTIONS = ["xxs", "xs", "s", "m", "l", "xl", "xxl"] as const satisfies readonly QrCodeSize[];
export const QR_CODE_VERSION_OPTIONS = Array.from({ length: 40 }, (_, index) => index + 1);

export const QR_CODE_MODULE_SCALE: Record<QrCodeSize, number> = {
  xxs: 1,
  xs: 2,
  s: 3,
  m: 4,
  l: 5,
  xl: 6,
  xxl: 7,
};

export const QR_CODE_ECC_LABEL: Record<QrCodeEcc, string> = {
  l: "L",
  m: "M",
  q: "Q",
  h: "H",
};

export const QR_CODE_ECC_HELP =
  "Error correction level. Higher levels survive more damage and screen glare, but reduce the amount of text that fits in the same QR version.";

const QR_CODE_BYTE_CAPACITY: Record<QrCodeEcc, readonly number[]> = {
  l: [17, 32, 53, 78, 106, 134, 154, 192, 230, 271, 321, 367, 425, 458, 520, 586, 644, 718, 792, 858, 929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, 1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953],
  m: [14, 26, 42, 62, 84, 106, 122, 152, 180, 213, 251, 287, 331, 362, 412, 450, 504, 560, 624, 666, 711, 779, 857, 911, 997, 1059, 1125, 1190, 1264, 1370, 1452, 1538, 1628, 1722, 1809, 1911, 1989, 2099, 2213, 2331],
  q: [11, 20, 32, 46, 60, 74, 86, 108, 130, 151, 177, 203, 241, 258, 292, 322, 364, 394, 442, 482, 509, 565, 611, 661, 715, 751, 805, 868, 908, 982, 1030, 1112, 1168, 1228, 1283, 1351, 1423, 1499, 1579, 1663],
  h: [7, 14, 24, 34, 44, 58, 64, 84, 98, 119, 137, 155, 177, 194, 220, 250, 280, 310, 338, 382, 403, 439, 461, 511, 535, 593, 625, 658, 698, 742, 790, 842, 898, 958, 983, 1051, 1093, 1139, 1219, 1273],
};

export interface QrCodeMatrix {
  version: number;
  moduleCount: number;
  modules: boolean[][];
}

export interface QrVersionOption {
  version: number;
  moduleCount: number;
  capacity: number;
  disabled: boolean;
  reason?: string;
}

export interface QrEccOption {
  ecc: QrCodeEcc;
  disabled: boolean;
  reason?: string;
}

type QrLibraryVersion = Parameters<typeof qrcode>[0];
const encoder = new TextEncoder();

export function qrModuleCount(version: number): number {
  return 21 + 4 * (clampQrVersion(version) - 1);
}

export function qrRenderedSize(version: number, size: QrCodeSize): number {
  return qrModuleCount(version) * QR_CODE_MODULE_SCALE[size];
}

/** Total pixel box including the border drawn around the QR content. */
export function qrBoxSize(renderedSize: number, borderWidth: number): number {
  return renderedSize + borderWidth * 2;
}

export function normalizeQrProps(props: Partial<QrCodeProps> | undefined): QrCodeProps {
  const text = typeof props?.text === "string" ? props.text : "";
  const ecc = isQrEcc(props?.ecc) ? props.ecc : "m";
  const size = isQrSize(props?.size) ? props.size : "m";
  const minVersion = minQrVersion(text, ecc) ?? 1;
  const requestedVersion = typeof props?.version === "number" ? props.version : minVersion;
  const version = canEncodeQr(text, requestedVersion, ecc)
    ? clampQrVersion(requestedVersion)
    : minVersion;
  return { text, ecc, size, version };
}

export function canEncodeQr(text: string, version: number, ecc: QrCodeEcc): boolean {
  return utf8ByteLength(text) <= qrByteCapacity(version, ecc);
}

export function minQrVersion(text: string, ecc: QrCodeEcc): number | null {
  for (const version of QR_CODE_VERSION_OPTIONS) {
    if (canEncodeQr(text, version, ecc)) return version;
  }
  return null;
}

export function buildQrMatrix(props: QrCodeProps): QrCodeMatrix | null {
  if (!canEncodeQr(props.text, props.version, props.ecc)) {
    return null;
  }
  const qr = qrcode(toLibraryVersion(props.version), toLibraryEcc(props.ecc));
  qr.addData(props.text, "Byte");
  qr.make();
  const moduleCount = qr.getModuleCount();
  const modules = Array.from({ length: moduleCount }, (_, row) =>
    Array.from({ length: moduleCount }, (_, col) => qr.isDark(row, col)),
  );
  return { version: clampQrVersion(props.version), moduleCount, modules };
}

export function qrVersionOptions(text: string, ecc: QrCodeEcc): QrVersionOption[] {
  return QR_CODE_VERSION_OPTIONS.map((version) => {
    const capacity = qrByteCapacity(version, ecc);
    const disabled = !canEncodeQr(text, version, ecc);
    return {
      version,
      moduleCount: qrModuleCount(version),
      capacity,
      disabled,
      reason: disabled ? `Text does not fit in v${version} with ECC ${QR_CODE_ECC_LABEL[ecc]}.` : undefined,
    };
  });
}

export function qrEccOptions(text: string, version: number): QrEccOption[] {
  return QR_CODE_ECC_OPTIONS.map((ecc) => {
    const disabled = !canEncodeQr(text, version, ecc);
    return {
      ecc,
      disabled,
      reason: disabled ? `Text does not fit in v${clampQrVersion(version)} with ECC ${QR_CODE_ECC_LABEL[ecc]}.` : undefined,
    };
  });
}

export function qrByteCapacity(version: number, ecc: QrCodeEcc): number {
  return QR_CODE_BYTE_CAPACITY[ecc][clampQrVersion(version) - 1] ?? 0;
}

export function utf8ByteLength(text: string): number {
  return encoder.encode(text).length;
}

export function nextValidQrProps(
  props: QrCodeProps,
  patch: Partial<QrCodeProps>,
): QrCodeProps {
  const next = normalizeQrProps({ ...props, ...patch });
  if (patch.version === undefined && (patch.text !== undefined || patch.ecc !== undefined)) {
    return {
      ...next,
      version: minQrVersion(next.text, next.ecc) ?? next.version,
    };
  }
  if (canEncodeQr(next.text, next.version, next.ecc)) {
    return next;
  }
  return {
    ...next,
    version: minQrVersion(next.text, next.ecc) ?? clampQrVersion(next.version),
  };
}

function isQrEcc(value: unknown): value is QrCodeEcc {
  return typeof value === "string" && QR_CODE_ECC_OPTIONS.includes(value as QrCodeEcc);
}

function isQrSize(value: unknown): value is QrCodeSize {
  return typeof value === "string" && QR_CODE_SIZE_OPTIONS.includes(value as QrCodeSize);
}

function clampQrVersion(version: number): number {
  return Math.min(40, Math.max(1, Math.round(version)));
}

function toLibraryVersion(version: number): QrLibraryVersion {
  return clampQrVersion(version) as QrLibraryVersion;
}

function toLibraryEcc(ecc: QrCodeEcc): "L" | "M" | "Q" | "H" {
  switch (ecc) {
    case "l":
      return "L";
    case "q":
      return "Q";
    case "h":
      return "H";
    case "m":
    default:
      return "M";
  }
}

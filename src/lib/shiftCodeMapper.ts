import type { ImportedShiftMeaning } from "@/types/trip";

/** Keep the source code unchanged; normalize only for meaning lookup. */
const SHIFT_CODE_MAP: Record<string, ImportedShiftMeaning> = {
  DAY: "day",
  D: "day",
  EVE: "evening",
  EVENING: "evening",
  EV: "evening",
  NIGHT: "night",
  NITE: "night",
  N: "night",
  RH: "rh",
  OFF: "off",
  "D/E": "day_evening",
  DE: "day_evening",
  "D/N": "day_night",
  DN: "day_night",
  "D/R.V": "day_rv",
};

export function normalizeShiftCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function mapShiftCode(originalCode: string): ImportedShiftMeaning {
  return SHIFT_CODE_MAP[normalizeShiftCode(originalCode)] ?? "unknown";
}

export function isKnownShiftCode(code: string): boolean {
  return mapShiftCode(code) !== "unknown";
}

export function getShiftMeaningLabel(meaning: ImportedShiftMeaning): string {
  const labels: Record<ImportedShiftMeaning, string> = {
    day: "เวร Day",
    evening: "เวร Eve",
    night: "เวร Night",
    rh: "เวร RH",
    day_evening: "เวร Day + Eve",
    day_night: "เวร Day + Night",
    day_rv: "เวร Day + RV",
    off: "วันหยุด",
    unknown: "ยังไม่ทราบความหมาย",
  };
  return labels[meaning];
}

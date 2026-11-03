import type { ImportedShiftMeaning } from "@/types/trip";
import { mapShiftCode } from "@/lib/shiftCodeMapper";

export const shiftCodeMapping: Record<string, ImportedShiftMeaning> = {
    DAY: "day",
    EVE: "evening",
    NIGHT: "night",
    RH: "rh",
    OFF: "off",
    "D/E": "day_evening",
    "D/N": "day_night",
    "D/R.V": "day_rv",
};

export function getShiftMeaning(originalCode: string): ImportedShiftMeaning {
    return mapShiftCode(originalCode);
}

export function getImportedShiftLabel(code: string): string {
    const meaning = getShiftMeaning(code);
    const labels: Record<ImportedShiftMeaning, string> = {
        day: "☀️ Day",
        evening: "🌇 Eve",
        night: "🌙 Night",
        rh: "✨ RH",
        day_evening: "🌅 Day + Eve",
        day_night: "🌅 Day + Night",
        day_rv: "🌅 Day + RV",
        off: "🏖️ Off",
        unknown: `❔ ${code} (ยังไม่กำหนด)`,
    };
    return labels[meaning];
}

export function getImportedShiftColor(code: string): string {
    const meaning = getShiftMeaning(code);
    const colors: Record<ImportedShiftMeaning, string> = {
        day: "#F4C995",
        evening: "#E9B68C",
        night: "#A9C5E8",
        rh: "#D9C6EF",
        day_evening: "#F4C995",
        day_night: "#A9C5E8",
        day_rv: "#D9C6EF",
        off: "#A8C9A0",
        unknown: "#BDBDBD",
    };
    return colors[meaning];
}

"use client";

import { useMemo, useRef, useState } from "react";
import {
    Upload, FileImage, FileSpreadsheet, CheckCircle,
    AlertCircle, Trash2, Pencil, ScanLine,
} from "lucide-react";
import * as XLSX from "xlsx";

import type { ImportedShift } from "@/types/trip";
import { getShiftMeaning } from "@/lib/shiftImport";

type DraftShift = Omit<ImportedShift, "id" | "createdAt" | "updatedAt">;

interface ImportShiftProps {
    onImport: (shifts: DraftShift[]) => Promise<void>;
}

const SHIFT_CODES = ["Day", "Eve", "Night", "Off", "D/E", "D/N", "RH"];

const MONTHS = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function toIsoDate(year: number, month: number, day: number) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeOcrCode(value: string): string | null {
    const compact = value.toUpperCase().replace(/[\s.]/g, "");
    const aliases: Record<string, string> = {
        DAY: "Day", D: "Day", PAY: "Day", OE: "Day",
        EVE: "Eve", EVENING: "Eve", EV: "Eve",
        NIGHT: "Night", NITE: "Night", N: "Night",
        OFF: "Off", ORT: "Off", O: "Off",
        RH: "RH",
        "D/E": "D/E", DE: "D/E",
        "D/N": "D/N", DN: "D/N",
    };
    return aliases[compact] ?? null;
}

/**
 * อ่านภาพปฏิทินแบบแบ่งช่อง (color-cell detection)
 * Template นี้ใช้สีประจำรหัสกะ จึงจำแนกสีของแต่ละช่องก่อนจับคู่กับวัน
 * แม่นยำกว่าการให้ OCR อ่านตัวอักษรสีขาวบนพื้นหลังสี ซึ่ง Tesseract มักอ่านพลาด
 */
async function readShiftImage(file: File, year: number, month: number): Promise<DraftShift[]> {
    const bitmap = await createImageBitmap(file);
    const width = bitmap.width;
    const height = bitmap.height;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
        bitmap.close();
        throw new Error("ไม่สามารถเตรียมภาพสำหรับอ่านตารางได้");
    }
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const pixels = ctx.getImageData(0, 0, width, height).data;
    const colorAt = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return [pixels[i], pixels[i + 1], pixels[i + 2]] as const;
    };
    const isColor = (x: number, y: number) => {
        const [r, g, b] = colorAt(x, y);
        return Math.max(r, g, b) - Math.min(r, g, b) > 45;
    };

    // 1) หาแถบแนวนอนของกล่องกะจากพิกเซลสี โดยไม่นับ legend ด้านบน
    const rowCounts = new Uint16Array(height);
    for (let y = 0; y < height; y++) {
        if (y < height * 0.05) continue;
        let count = 0;
        for (let x = 0; x < width; x++) if (isColor(x, y)) count++;
        rowCounts[y] = count;
    }
    const rowThreshold = Math.max(18, Math.floor(width * 0.15));
    const bands: Array<{ top: number; bottom: number }> = [];
    let bandStart = -1;
    for (let y = 0; y <= height; y++) {
        const active = y < height && rowCounts[y] >= rowThreshold;
        if (active && bandStart < 0) bandStart = y;
        if (!active && bandStart >= 0) {
            const bottom = y - 1;
            if (bottom - bandStart >= 10) {
                const previous = bands[bands.length - 1];
                if (previous && bandStart - previous.bottom <= 3) previous.bottom = bottom;
                else bands.push({ top: bandStart, bottom });
            }
            bandStart = -1;
        }
    }
    if (!bands.length) {
        throw new Error("ไม่พบกล่องสีของกะงาน กรุณาใช้ภาพที่เห็นแถวปฏิทินและกล่องสีครบถ้วน");
    }

    // 2) สีตัวอย่างของแต่ละรหัสกะจาก Template ปฏิทิน
    const palette: Array<{ code: string; rgb: [number, number, number] }> = [
        { code: "Off", rgb: [249, 129, 249] },
        { code: "Day", rgb: [54, 189, 252] },
        { code: "Eve", rgb: [251, 140, 31] },
        { code: "Night", rgb: [220, 156, 251] },
        { code: "D/E", rgb: [227, 216, 22] },
        { code: "D/N", rgb: [17, 65, 251] },
        { code: "RH", rgb: [48, 200, 91] },
    ];
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const cellWidth = width / 7;
    const found = new Map<number, { code: string; distance: number }>();

    // 3) ตรวจสีพื้นหลังในแต่ละช่อง แล้วคำนวณวันที่จากตำแหน่งแถว/คอลัมน์
    for (let rowIndex = 0; rowIndex < bands.length; rowIndex++) {
        const { top, bottom } = bands[rowIndex];
        const bandHeight = bottom - top + 1;
        for (let column = 0; column < 7; column++) {
            const x0 = Math.max(0, Math.floor(column * cellWidth) + 3);
            const x1 = Math.min(width, Math.floor((column + 1) * cellWidth) - 3);
            const samples: number[][] = [];
            for (let y = top + 2; y < bottom - 1; y++) {
                for (let x = x0; x < x1; x++) {
                    if (isColor(x, y)) samples.push([...colorAt(x, y)]);
                }
            }
            // ไม่เอาเส้นสีเขียวของหมายเหตุมาเป็นช่องกะ
            if (samples.length < Math.max(60, bandHeight * (x1 - x0) * 0.08)) continue;

            const median = (channel: number) => {
                const values = samples.map((sample) => sample[channel]).sort((a, b) => a - b);
                return values[Math.floor(values.length / 2)];
            };
            const rgb: [number, number, number] = [median(0), median(1), median(2)];
            const nearest = palette.map((item) => ({
                code: item.code,
                distance: Math.sqrt(
                    (rgb[0] - item.rgb[0]) ** 2 +
                    (rgb[1] - item.rgb[1]) ** 2 +
                    (rgb[2] - item.rgb[2]) ** 2
                ),
            })).sort((a, b) => a.distance - b.distance)[0];

            // ป้องกันการเดารหัสกะเมื่อสีไม่ตรงกับ Template ที่รองรับ
            if (!nearest || nearest.distance > 115) continue;
            const day = rowIndex * 7 + column - firstWeekday + 1;
            if (day < 1 || day > daysInMonth) continue;
            found.set(day, { code: nearest.code, distance: nearest.distance });
        }
    }

    if (!found.size) {
        throw new Error("ตรวจพบแถวปฏิทิน แต่ไม่พบสีที่ตรงกับรหัสกะที่รองรับ (Day, Eve, Night, Off, D/E, D/N, RH)");
    }

    return [...found.entries()].sort((a, b) => a[0] - b[0]).map(([day, item]) => ({
        date: toIsoDate(year, month, day),
        originalCode: item.code,
        meaning: getShiftMeaning(item.code),
        sourceFile: file.name,
    }));
}

export default function ImportShift({ onImport }: ImportShiftProps) {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<DraftShift[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [yearBE, setYearBE] = useState("2569");
    const [month, setMonth] = useState("11");
    const [employeeName, setEmployeeName] = useState("");
    const [mode, setMode] = useState<"image" | "excel">("image");
    const inputRef = useRef<HTMLInputElement>(null);

    const year = Number(yearBE) >= 2400 ? Number(yearBE) - 543 : Number(yearBE);
    const previewCount = useMemo(() => preview.length, [preview]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setPreview([]);
        setError("");
        setMessage("");
        setLoading(true);

        try {
            let imported: DraftShift[] = [];
            if (selectedFile.type.startsWith("image/") || /\.(png|jpe?g)$/i.test(selectedFile.name)) {
                setMode("image");
                imported = await readShiftImage(selectedFile, year, Number(month));
            } else if (/\.(xlsx|xls|csv)$/i.test(selectedFile.name)) {
                setMode("excel");
                const workbook = XLSX.read(await selectedFile.arrayBuffer(), { type: "array", cellDates: true });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                if (!sheet) throw new Error("ไม่พบ Sheet ในไฟล์");
                const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: false, defval: "" });
                imported = rows.slice(1).flatMap((row) => {
                    const dateValue = row[0];
                    const code = String(row[2] ?? row[1] ?? "").trim();
                    if (!dateValue || !code) return [];
                    const date = dateValue instanceof Date
                        ? toIsoDate(dateValue.getFullYear(), dateValue.getMonth() + 1, dateValue.getDate())
                        : String(dateValue).trim();
                    return [{
                        date,
                        originalCode: code,
                        meaning: getShiftMeaning(code),
                        employeeName: String(row[1] ?? employeeName).trim() || undefined,
                        sourceFile: selectedFile.name,
                    }];
                });
            } else {
                throw new Error("รองรับเฉพาะ PNG, JPG, JPEG, XLSX, XLS และ CSV");
            }

            const withEmployee = imported.map((item) => ({
                ...item,
                employeeName: item.employeeName || employeeName.trim() || undefined,
            }));
            setPreview(withEmployee);
            if (withEmployee.length === 0) {
                setError("ไม่พบรหัสกะที่จับคู่กับวันที่ได้ กรุณาตรวจสอบภาพหรือปรับความคมชัด");
            }
        } catch (err) {
            console.error("Shift import error:", err);
            setError(err instanceof Error ? err.message : "ไม่สามารถอ่านไฟล์ได้");
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };

    const updateItem = (index: number, patch: Partial<DraftShift>) => {
        setPreview((current) => current.map((item, i) => i === index
            ? { ...item, ...patch, meaning: getShiftMeaning(patch.originalCode ?? item.originalCode) }
            : item));
    };

    const handleImport = async () => {
        if (!preview.length) return;
        const invalid = preview.find((item) => !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !item.originalCode.trim());
        if (invalid) {
            setError("กรุณาตรวจสอบวันที่และรหัสกะให้ครบก่อนบันทึก");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await onImport(preview);
            setMessage(`บันทึกข้อมูลสำเร็จ ${preview.length} รายการ`);
            setPreview([]);
            setFile(null);
        } catch (err) {
            console.error("Save imported shifts error:", err);
            setError("บันทึกข้อมูลไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อ Firestore");
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="rounded-3xl border border-[#f3e8e0] bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-[#e8f0e5] p-3 text-[#78977c]">
                    {mode === "image" ? <FileImage size={24} /> : <FileSpreadsheet size={24} />}
                </div>
                <div>
                    <h2 className="font-bold text-[#604b3e]">Import ตารางกะงาน</h2>
                    <p className="text-sm text-[#a18b7c]">อ่านตารางจาก PNG/JPG ด้วย OCR หรือ Excel/CSV</p>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="text-sm text-[#8e7b6d]">
                    เดือน
                    <select value={month} onChange={(e) => setMonth(e.target.value)}
                        className="mt-1 min-h-11 w-full rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-3">
                        {MONTHS.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
                    </select>
                </label>
                <label className="text-sm text-[#8e7b6d]">
                    ปี (พ.ศ.)
                    <input value={yearBE} onChange={(e) => setYearBE(e.target.value)} inputMode="numeric"
                        className="mt-1 min-h-11 w-full rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-3" />
                </label>
                <label className="col-span-2 text-sm text-[#8e7b6d] sm:col-span-1">
                    ชื่อพนักงาน (ถ้ามี)
                    <input value={employeeName} onChange={(e) => setEmployeeName(e.target.value)}
                        placeholder="ชื่อพนักงาน" className="mt-1 min-h-11 w-full rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-3" />
                </label>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#e5d6ca] bg-[#fffaf6] p-6 transition hover:bg-[#fff3eb]">
                {loading ? <ScanLine size={28} className="mb-2 animate-pulse text-[#d69a82]" /> : <Upload size={28} className="mb-2 text-[#d69a82]" />}
                <span className="text-sm font-medium text-[#604b3e]">
                    {loading ? "กำลังอ่านไฟล์..." : "คลิกเพื่อเลือกรูปตารางกะงาน หรือไฟล์ Excel"}
                </span>
                <span className="mt-1 text-center text-xs text-[#a18b7c]">
                    {file?.name ?? "PNG, JPG, JPEG, XLSX, XLS, CSV"}
                </span>
                <input ref={inputRef} type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                    onChange={handleFileChange} disabled={loading} className="hidden" />
            </label>

            {preview.length > 0 && (
                <div className="mt-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="font-semibold text-[#604b3e]">ตรวจสอบข้อมูลก่อนบันทึก</p>
                            <p className="text-xs text-[#a18b7c]">พบ {previewCount} รายการ · แก้ไขวันที่และรหัสกะได้</p>
                        </div>
                        <button type="button" onClick={() => setPreview([])} className="text-xs text-red-500">ล้างข้อมูล</button>
                    </div>
                    <div className="max-h-80 overflow-auto rounded-xl border border-[#f3e8e0]">
                        <table className="w-full min-w-[560px] text-left text-xs sm:text-sm">
                            <thead className="sticky top-0 bg-[#fff7f2] text-[#8b7463]">
                                <tr>
                                    <th className="p-3">วันที่</th><th className="p-3">พนักงาน</th>
                                    <th className="p-3">รหัสกะ</th><th className="p-3">ความหมาย</th><th className="p-3">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {preview.map((item, index) => (
                                    <tr key={`${item.date}-${index}`} className="border-t border-[#f3e8e0]">
                                        <td className="p-2"><input type="date" value={item.date}
                                            onChange={(e) => updateItem(index, { date: e.target.value })}
                                            className="w-[145px] rounded-lg border border-[#eee0d6] p-2" /></td>
                                        <td className="p-2"><input value={item.employeeName ?? ""} placeholder="-" 
                                            onChange={(e) => updateItem(index, { employeeName: e.target.value })}
                                            className="w-28 rounded-lg border border-[#eee0d6] p-2" /></td>
                                        <td className="p-2"><select value={SHIFT_CODES.includes(item.originalCode) ? item.originalCode : "custom"}
                                            onChange={(e) => updateItem(index, { originalCode: e.target.value === "custom" ? item.originalCode : e.target.value })}
                                            className="rounded-lg border border-[#eee0d6] bg-white p-2">
                                            {SHIFT_CODES.map((code) => <option key={code}>{code}</option>)}
                                            {!SHIFT_CODES.includes(item.originalCode) && <option value="custom">{item.originalCode}</option>}
                                        </select></td>
                                        <td className="p-2 whitespace-nowrap">{item.meaning === "unknown" ? "ไม่ทราบความหมาย" : item.originalCode}</td>
                                        <td className="p-2"><button type="button" onClick={() => setPreview((current) => current.filter((_, i) => i !== index))}
                                            className="rounded-lg p-2 text-red-500" aria-label="ลบรายการ"><Trash2 size={16} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={handleImport} disabled={loading || !preview.length}
                        className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d69a82] px-4 py-3 font-semibold text-white transition hover:bg-[#c78b73] disabled:opacity-50">
                        <CheckCircle size={18} />{loading ? "กำลังบันทึก..." : `ยืนยันและบันทึก ${preview.length} รายการลง Firestore`}
                    </button>
                </div>
            )}

            {message && <p className="mt-4 flex items-center gap-2 text-sm text-green-600"><CheckCircle size={16} />{message}</p>}
            {error && <p role="alert" className="mt-4 flex items-center gap-2 text-sm text-red-500"><AlertCircle size={16} />{error}</p>}
            <p className="mt-3 text-xs leading-5 text-[#a18b7c]">
                หมายเหตุ: OCR เป็นการอ่านเบื้องต้น ระบบจะแสดง Preview ให้ตรวจสอบและแก้ไขก่อนบันทึกทุกครั้ง
            </p>
        </section>
    );
}

import {
    collection,
    writeBatch,
    doc,
    serverTimestamp,
    query,
    where,
    getDocs,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import type { ImportedShift } from "@/types/trip";

const COLLECTION_NAME = "importedShifts";
const BATCH_LIMIT = 450;

/**
 * บันทึกเวรที่นำเข้าเป็นชุด ๆ เพื่อหลีกเลี่ยงการเขียนทีละรายการ
 * และลดโอกาสเกิดข้อมูลค้างบางส่วนเมื่อจำนวนรายการมาก
 */
export async function saveImportedShifts(
    shifts: Omit<ImportedShift, "id" | "createdAt" | "updatedAt">[]
) {
    if (shifts.length === 0) return;

    const collectionRef = collection(db, COLLECTION_NAME);

    for (let offset = 0; offset < shifts.length; offset += BATCH_LIMIT) {
        const batch = writeBatch(db);
        const chunk = shifts.slice(offset, offset + BATCH_LIMIT);

        for (const shift of chunk) {
            const newDoc = doc(collectionRef);
            batch.set(newDoc, {
                ...shift,
                originalCode: shift.originalCode.trim(),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }

        await batch.commit();
    }
}

/** ลบเวรที่ Import เฉพาะวันที่เลือก */
export async function deleteImportedShiftsByDate(date: string) {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("date", "==", date)
    );

    const snapshot = await getDocs(q);

    for (let offset = 0; offset < snapshot.docs.length; offset += BATCH_LIMIT) {
        const batch = writeBatch(db);
        snapshot.docs.slice(offset, offset + BATCH_LIMIT).forEach((item) => {
            batch.delete(doc(db, COLLECTION_NAME, item.id));
        });
        await batch.commit();
    }
}

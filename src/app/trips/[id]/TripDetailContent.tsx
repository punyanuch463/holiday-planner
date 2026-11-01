
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trip } from "@/types/trip";
import TripForm from "@/components/trips/TripForm";
import { ArrowLeft, Trash2 } from "lucide-react";

export default function TripDetailContent() {
    const params = useParams<{ id: string }>();
    const router = useRouter();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (!params.id) return;

        const unsubscribe = onSnapshot(
            doc(db, "trips", params.id),
            (snapshot) => {
                if (snapshot.exists()) {
                    setTrip({
                        id: snapshot.id,
                        ...snapshot.data(),
                    } as Trip);
                } else {
                    setTrip(null);
                }

                setLoading(false);
            },
            (error) => {
                console.error("Load trip error:", error);
                setLoading(false);
            }
        );

        return unsubscribe;
    }, [params.id]);

    const handleDelete = async () => {
        if (!trip) return;

        setDeleting(true);

        try {
            await deleteDoc(doc(db, "trips", trip.id));
            router.push("/");
        } catch (error) {
            console.error("Delete trip error:", error);
            alert("ไม่สามารถลบทริปได้");
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#fff7f2] p-10 text-center text-[#a18b7c]">
                กำลังโหลดข้อมูลทริป...
            </main>
        );
    }

    if (!trip) {
        return (
            <main className="min-h-screen bg-[#fff7f2] p-10 text-center">
                <p className="mb-4">ไม่พบข้อมูลทริปนี้</p>
                <button onClick={() => router.push("/")}>
                    กลับหน้าหลัก
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#fff7f2] px-4 py-6">
            <div className="mx-auto max-w-2xl">
                <button
                    onClick={() => router.push("/")}
                    className="mb-6 flex min-h-11 items-center gap-2 text-sm text-[#a18b7c]"
                >
                    <ArrowLeft size={18} />
                    กลับหน้าหลัก
                </button>

                <TripForm trip={trip} />

                <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white py-3 text-sm font-semibold text-red-500 hover:bg-red-50"
                >
                    <Trash2 size={18} />
                    ลบทริปนี้
                </button>

                {showDeleteConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-sm">
                        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
                            <h2 className="text-lg font-bold text-[#604b3e]">
                                ยืนยันการลบทริป?
                            </h2>

                            <p className="mt-2 break-words text-sm text-[#a18b7c]">
                                คุณต้องการลบทริป `{trip.title}` ใช่หรือไม่?
                                การลบนี้ไม่สามารถย้อนกลับได้
                            </p>

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={deleting}
                                    className="min-h-12 flex-1 rounded-xl border border-[#f0e3d9] text-sm"
                                >
                                    ยกเลิก
                                </button>

                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="min-h-12 flex-1 rounded-xl bg-red-500 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                    {deleting ? "กำลังลบ..." : "ยืนยันลบ"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}

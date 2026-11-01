"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    addDoc,
    collection,
    doc,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Trip } from "@/types/trip";
import { ArrowLeft, Plus, X } from "lucide-react";

interface TripFormProps {
    initialDate?: string;
    trip?: Trip;
}

const colors = [
    "#D9C6EF",
    "#A9C5E8",
    "#A8C9A0",
    "#F5A5B8",
    "#F4C995",
];

export default function TripForm({
    initialDate = "",
    trip,
}: TripFormProps) {
    const router = useRouter();
    const isEditing = Boolean(trip);

    const [title, setTitle] = useState(trip?.title ?? "");
    const [startDate, setStartDate] = useState(
        trip?.startDate ?? initialDate
    );
    const [endDate, setEndDate] = useState(
        trip?.endDate ?? initialDate
    );
    const [description, setDescription] = useState(
        trip?.description ?? ""
    );
    const [places, setPlaces] = useState<string[]>(
        trip?.places ?? []
    );
    const [placeInput, setPlaceInput] = useState("");
    const [color, setColor] = useState(
        trip?.color ?? "#D9C6EF"
    );

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const addPlace = () => {
        const value = placeInput.trim();

        if (!value) return;

        setPlaces((prev) => [...prev, value]);
        setPlaceInput("");
    };

    const removePlace = (index: number) => {
        setPlaces((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!title.trim() || !startDate || !endDate) {
            setError("กรุณากรอกชื่อทริปและวันที่ให้ครบ");
            return;
        }

        if (endDate < startDate) {
            setError("วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่มต้น");
            return;
        }

        setSaving(true);
        setError("");

        const tripData = {
            title: title.trim(),
            startDate,
            endDate,
            description: description.trim(),
            places,
            color,
            updatedAt: serverTimestamp(),
        };

        try {
            if (trip) {
                await updateDoc(doc(db, "trips", trip.id), tripData);
            } else {
                await addDoc(collection(db, "trips"), {
                    ...tripData,
                    createdAt: serverTimestamp(),
                });
            }

            router.push("/");
        } catch (err) {
            console.error("Save trip error:", err);
            setError("ไม่สามารถบันทึกทริปได้ กรุณาลองใหม่");
        } finally {
            setSaving(false);
        }
    };

    return (
        <main className="min-h-screen bg-[#fff7f2] px-4 py-6 text-[#604b3e] sm:py-10">
            <div className="mx-auto max-w-2xl">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mb-6 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-[#a18b7c] hover:bg-white"
                >
                    <ArrowLeft size={18} />
                    กลับ
                </button>

                <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm sm:p-8">
                    <div className="mb-7">
                        <p className="text-sm text-[#b49a87]">
                            HOLIDAY PLANNER
                        </p>

                        <h1 className="mt-2 text-2xl font-bold">
                            {isEditing ? "✏️ แก้ไขทริป" : "✈️ สร้างทริปใหม่"}
                        </h1>

                        <p className="mt-2 text-sm text-[#a18b7c]">
                            วางแผนการเดินทางของคุณได้ที่นี่ 🌷
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                ชื่อทริป *
                            </label>

                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="เช่น เที่ยวทะเลกับเพื่อน"
                                required
                                className="w-full rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-4 py-3 outline-none focus:border-[#d69a82]"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    วันเริ่มต้น *
                                </label>

                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => {
                                        setStartDate(e.target.value);

                                        if (endDate && e.target.value > endDate) {
                                            setEndDate(e.target.value);
                                        }
                                    }}
                                    required
                                    className="w-full min-w-0 rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-3 py-3 outline-none focus:border-[#d69a82]"
                                />
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-medium">
                                    วันสิ้นสุด *
                                </label>

                                <input
                                    type="date"
                                    min={startDate || undefined}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                    className="w-full min-w-0 rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-3 py-3 outline-none focus:border-[#d69a82]"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                รายละเอียดทริป
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="รายละเอียดเพิ่มเติม..."
                                rows={4}
                                className="w-full resize-y rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-4 py-3 outline-none focus:border-[#d69a82]"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium">
                                สถานที่ท่องเที่ยว
                            </label>

                            <div className="flex gap-2">
                                <input
                                    value={placeInput}
                                    onChange={(e) => setPlaceInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            addPlace();
                                        }
                                    }}
                                    placeholder="เพิ่มสถานที่..."
                                    className="min-w-0 flex-1 rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-4 py-3 outline-none focus:border-[#d69a82]"
                                />

                                <button
                                    type="button"
                                    onClick={addPlace}
                                    className="flex min-h-12 items-center justify-center gap-1 rounded-xl bg-[#d69a82] px-4 text-white"
                                >
                                    <Plus size={18} />
                                    เพิ่ม
                                </button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {places.map((place, index) => (
                                    <span
                                        key={`${place}-${index}`}
                                        className="flex items-center gap-2 rounded-full bg-[#f5eee8] px-3 py-2 text-sm"
                                    >
                                        {place}

                                        <button
                                            type="button"
                                            onClick={() => removePlace(index)}
                                            aria-label={`ลบ ${place}`}
                                        >
                                            <X size={14} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="mb-3 block text-sm font-medium">
                                สีของทริป
                            </label>

                            <div className="flex flex-wrap gap-4">
                                {colors.map((item) => (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => setColor(item)}
                                        aria-label={`เลือกสี ${item}`}
                                        aria-pressed={color === item}
                                        className={`h-10 w-10 rounded-full ${color === item
                                            ? "ring-2 ring-[#604b3e] ring-offset-2"
                                            : ""
                                            }`}
                                        style={{ backgroundColor: item }}
                                    />
                                ))}
                            </div>
                        </div>

                        {error && (
                            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                                {error}
                            </p>
                        )}

                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => router.push("/")}
                                className="min-h-12 flex-1 rounded-xl border border-[#f0e3d9] py-3 text-sm font-medium text-[#a18b7c]"
                            >
                                ยกเลิก
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                className="min-h-12 flex-1 rounded-xl bg-[#d69a82] py-3 text-sm font-semibold text-white hover:bg-[#c4876c] disabled:opacity-50"
                            >
                                {saving
                                    ? "กำลังบันทึก..."
                                    : isEditing
                                        ? "บันทึกการแก้ไข"
                                        : "สร้างทริป"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </main>
    );
}
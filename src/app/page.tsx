
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import type { Trip, Holiday } from "@/types/trip";

import {
  CalendarDays,
  MapPin,
  Plus,
  Plane,
  Heart,
  Clock,
  X,
  Pencil,
  Trash2,
  ArrowRight,
} from "lucide-react";

import dynamic from "next/dynamic";

const MonthlyCalendar = dynamic(
  () => import("@/components/calendar/MonthlyCalendar"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-3xl bg-white/80 p-10 text-center text-[#a18b7c]">
        กำลังโหลดปฏิทิน... 🌷
      </div>
    ),
  }
);

const holidayColors = [
  "#F5A5B8",
  "#A8C9A0",
  "#A9C5E8",
  "#D9C6EF",
  "#F4C995",
];

function getLocalDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatThaiDate(date: string) {
  if (!date) return "";

  return new Date(`${date}T00:00:00`).toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Home() {
  const router = useRouter();

  // ข้อมูลหลัก
  const [trips, setTrips] = useState<Trip[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal รายละเอียดวันที่
  const [selectedDate, setSelectedDate] = useState("");
  const [showDayModal, setShowDayModal] = useState(false);

  // Modal เพิ่ม / แก้ไขวันหยุด
  const [showHolidayForm, setShowHolidayForm] = useState(false);
  const [holidayId, setHolidayId] = useState<string | null>(null);
  const [holidayName, setHolidayName] = useState("");
  const [holidayColor, setHolidayColor] = useState("#F5A5B8");
  const [savingHoliday, setSavingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState("");

  // Modal ยืนยันการลบ ใช้ร่วมกันทั้ง Holiday และ Trip
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: "holiday" | "trip";
  } | null>(null);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // ----------------------------------------
  // Firebase Authentication + Real-time data
  // ----------------------------------------

  useEffect(() => {
    let unsubscribeTrips: (() => void) | undefined;
    let unsubscribeHolidays: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch((error) => {
          console.error("Authentication error:", error);
          setLoading(false);
        });

        return;
      }

      unsubscribeTrips?.();
      unsubscribeHolidays?.();

      unsubscribeTrips = onSnapshot(
        collection(db, "trips"),
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Trip[];

          setTrips(data);
          setLoading(false);
        },
        (error) => {
          console.error("Load trips error:", error);
          setLoading(false);
        }
      );

      unsubscribeHolidays = onSnapshot(
        collection(db, "holidays"),
        (snapshot) => {
          const data = snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as Holiday[];

          setHolidays(data);
        },
        (error) => {
          console.error("Load holidays error:", error);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      unsubscribeTrips?.();
      unsubscribeHolidays?.();
    };
  }, []);

  // ----------------------------------------
  // เลือกวันที่จากปฏิทิน
  // ----------------------------------------

  const handleSelectDate = (date: string) => {
    setSelectedDate(date);
    setShowDayModal(true);
  };

  const selectedDayHolidays = holidays.filter(
    (holiday) => holiday.date === selectedDate
  );

  const selectedDayTrips = trips.filter(
    (trip) =>
      selectedDate >= trip.startDate &&
      selectedDate <= trip.endDate
  );

  const upcomingTrips = [...trips].sort((a, b) =>
    a.startDate.localeCompare(b.startDate)
  );

  // ----------------------------------------
  // เพิ่มวันหยุด
  // ----------------------------------------

  const openAddHoliday = (date = getLocalDate()) => {
    setSelectedDate(date);
    setHolidayId(null);
    setHolidayName("");
    setHolidayColor("#F5A5B8");
    setHolidayError("");

    setShowDayModal(false);
    setShowHolidayForm(true);
  };

  // ----------------------------------------
  // แก้ไขวันหยุด
  // ----------------------------------------

  const openEditHoliday = (holiday: Holiday) => {
    setHolidayId(holiday.id);
    setSelectedDate(holiday.date);
    setHolidayName(holiday.name);
    setHolidayColor(holiday.color || "#F5A5B8");
    setHolidayError("");

    setShowDayModal(false);
    setShowHolidayForm(true);
  };

  // ----------------------------------------
  // บันทึกวันหยุด
  // ----------------------------------------

  const handleSaveHoliday = async () => {
    if (!holidayName.trim() || !selectedDate) return;

    setSavingHoliday(true);
    setHolidayError("");

    try {
      const holidayData = {
        date: selectedDate,
        name: holidayName.trim(),
        color: holidayColor,
        updatedAt: serverTimestamp(),
      };

      if (holidayId) {
        await updateDoc(
          doc(db, "holidays", holidayId),
          holidayData
        );
      } else {
        await addDoc(collection(db, "holidays"), {
          ...holidayData,
          createdAt: serverTimestamp(),
        });
      }

      setShowHolidayForm(false);
      setHolidayId(null);
      setHolidayName("");
      setHolidayColor("#F5A5B8");
      setHolidayError("");
    } catch (error) {
      console.error("Save holiday error:", error);
      setHolidayError("ไม่สามารถบันทึกวันหยุดได้ กรุณาลองใหม่");
    } finally {
      setSavingHoliday(false);
    }
  };

  // ----------------------------------------
  // เปิด Modal ยืนยันการลบ
  // ใช้ได้ทั้ง Holiday และ Trip
  // ----------------------------------------

  const openDeleteModal = (
    id: string,
    name: string,
    type: "holiday" | "trip"
  ) => {
    setDeleteTarget({
      id,
      name,
      type,
    });

    setDeleteError("");
    setShowDeleteModal(true);
  };

  // ----------------------------------------
  // ยืนยันการลบ
  // ----------------------------------------

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      const collectionName =
        deleteTarget.type === "holiday" ? "holidays" : "trips";

      await deleteDoc(
        doc(db, collectionName, deleteTarget.id)
      );

      setShowDeleteModal(false);
      setDeleteTarget(null);
      setDeleteError("");
    } catch (error) {
      console.error("Delete error:", error);
      setDeleteError("ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeleting(false);
    }
  };

  // ----------------------------------------
  // ปิด Modal ลบ
  // ----------------------------------------

  const closeDeleteModal = () => {
    if (deleting) return;

    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteError("");
  };

  // ----------------------------------------
  // เพิ่ม Trip
  // ----------------------------------------

  const openAddTrip = (date = "") => {
    setShowDayModal(false);

    router.push(
      date
        ? `/trips/new?date=${encodeURIComponent(date)}`
        : "/trips/new"
    );
  };

  // ----------------------------------------
  // เปิดรายละเอียด Trip
  // ----------------------------------------

  const openTripDetail = (tripId: string) => {
    router.push(`/trips/${tripId}`);
  };

  return (
    <main className="min-h-screen bg-[#fff7f2] px-3 py-5 text-[#604b3e] sm:px-5 sm:py-8 md:px-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <header className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Plane className="text-[#d69a82]" size={28} />

              <h1 className="text-2xl font-bold md:text-3xl">
                Holiday Planner
              </h1>
            </div>

            <p className="mt-2 text-sm text-[#a18b7c]">
              วางแผนวันหยุดและออกไปเที่ยวกัน 🌷
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => openAddHoliday()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d69a82] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#c4876c] sm:px-5"
            >
              <Plus size={18} />
              วันหยุด
            </button>

            <button
              type="button"
              onClick={() => openAddTrip()}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#a99acb] px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#9584bb] sm:px-5"
            >
              <Plane size={18} />
              เพิ่ม Trip
            </button>
          </div>
        </header>

        {/* Summary */}
        <div className="mb-7 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">

          <div className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm text-[#a18b7c]">
              <CalendarDays size={18} />
              วันหยุดทั้งหมด
            </div>

            <p className="text-3xl font-bold text-[#d69a82]">
              {holidays.length}
            </p>

            <p className="mt-1 text-xs text-[#b9a394]">
              วันที่วางแผนหยุด
            </p>
          </div>

          <div className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm text-[#a18b7c]">
              <Plane size={18} />
              ทริปทั้งหมด
            </div>

            <p className="text-3xl font-bold text-[#a99acb]">
              {trips.length}
            </p>

            <p className="mt-1 text-xs text-[#b9a394]">
              ทริปที่วางแผนไว้
            </p>
          </div>

          <div className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm text-[#a18b7c]">
              <Heart size={18} />
              สถานที่เที่ยว
            </div>

            <p className="text-3xl font-bold text-[#91b7a0]">
              {trips.reduce(
                (total, trip) =>
                  total + (trip.places?.length ?? 0),
                0
              )}
            </p>

            <p className="mt-1 text-xs text-[#b9a394]">
              สถานที่ในแผนเที่ยว
            </p>
          </div>
        </div>

        {/* Calendar */}
        <MonthlyCalendar
          trips={trips}
          holidays={holidays}
          onSelectDate={handleSelectDate}
        />

        {/* Upcoming Trips */}
        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold sm:text-xl">
              <Clock
                className="mr-2 inline text-[#d69a82]"
                size={20}
              />
              ทริปที่วางแผนไว้
            </h2>

            <span className="text-sm text-[#b9a394]">
              {trips.length} ทริป
            </span>
          </div>

          {loading ? (
            <p className="rounded-2xl bg-white/80 p-6 text-center text-sm text-[#a18b7c]">
              กำลังโหลดข้อมูล...
            </p>
          ) : upcomingTrips.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#e8d9ce] bg-white/60 p-8 text-center">
              <Plane
                className="mx-auto mb-3 text-[#c5b2d9]"
                size={32}
              />

              <p className="font-medium">
                ยังไม่มีทริปที่วางแผนไว้
              </p>

              <p className="mt-1 text-sm text-[#a18b7c]">
                เริ่มสร้างทริปแรกของคุณได้เลย
              </p>

              <button
                type="button"
                onClick={() => openAddTrip()}
                className="mt-4 rounded-xl bg-[#a99acb] px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus className="mr-1 inline" size={16} />
                สร้างทริป
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {upcomingTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-2xl border border-white bg-white/80 p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openTripDetail(trip.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <h3 className="break-words font-semibold">
                        {trip.title}
                      </h3>

                      <p className="mt-2 text-xs text-[#a18b7c]">
                        📅 {trip.startDate} — {trip.endDate}
                      </p>
                    </button>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[#f8e5dc] p-2 text-[#d69a82]">
                        <Plane size={18} />
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          openDeleteModal(
                            trip.id,
                            trip.title,
                            "trip"
                          )
                        }
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-400 transition hover:bg-red-100"
                        aria-label={`ลบทริป ${trip.title}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openTripDetail(trip.id)}
                    className="mt-3 block w-full text-left"
                  >
                    {trip.description && (
                      <p className="line-clamp-2 text-sm text-[#8e7b6d]">
                        {trip.description}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {(trip.places ?? []).map((place, index) => (
                        <span
                          key={`${trip.id}-${place}-${index}`}
                          className="flex items-center gap-1 rounded-full bg-[#f5eee8] px-3 py-1 text-xs text-[#a18b7c]"
                        >
                          <MapPin size={12} />
                          {place}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-1 text-xs text-[#a99acb]">
                      ดูรายละเอียด
                      <ArrowRight size={14} />
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ================================== */}
        {/* Day Detail Modal */}
        {/* ================================== */}

        {showDayModal && (
          <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 px-0 backdrop-blur-sm sm:items-center sm:px-4"
            onClick={() => setShowDayModal(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="day-modal-title"
              className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#a18b7c]">
                    รายละเอียดวันที่เลือก
                  </p>

                  <h2
                    id="day-modal-title"
                    className="mt-1 text-lg font-bold sm:text-xl"
                  >
                    {formatThaiDate(selectedDate)}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDayModal(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff7f2] text-[#a18b7c]"
                  aria-label="ปิด"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Holiday list */}
              <section className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#d69a82]">
                  <CalendarDays size={18} />
                  วันหยุด ({selectedDayHolidays.length})
                </h3>

                {selectedDayHolidays.length === 0 ? (
                  <p className="rounded-xl bg-[#fffcfa] p-4 text-center text-sm text-[#b9a394]">
                    ยังไม่มีวันหยุดในวันนี้
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayHolidays.map((holiday) => (
                      <div
                        key={holiday.id}
                        className="flex items-center gap-3 rounded-xl p-3"
                        style={{
                          backgroundColor: `${holiday.color || "#F5A5B8"}25`,
                        }}
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              holiday.color || "#F5A5B8",
                          }}
                        />

                        <span className="min-w-0 flex-1 break-words text-sm font-medium">
                          {holiday.name}
                        </span>

                        <button
                          type="button"
                          onClick={() => openEditHoliday(holiday)}
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 text-[#a18b7c]"
                          aria-label="แก้ไขวันหยุด"
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            openDeleteModal(
                              holiday.id,
                              holiday.name,
                              "holiday"
                            )
                          }
                          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/70 text-red-400 hover:bg-red-50"
                          aria-label="ลบวันหยุด"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Trip list */}
              <section className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-[#9b83bd]">
                  <Plane size={18} />
                  ทริปที่เกี่ยวข้อง ({selectedDayTrips.length})
                </h3>

                {selectedDayTrips.length === 0 ? (
                  <p className="rounded-xl bg-[#fffcfa] p-4 text-center text-sm text-[#b9a394]">
                    ยังไม่มีทริปในวันนี้
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayTrips.map((trip) => (
                      <div
                        key={trip.id}
                        className="rounded-xl bg-[#f5effb] p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => openTripDetail(trip.id)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <p className="break-words font-semibold text-[#6b4e8a]">
                              ✈ {trip.title}
                            </p>

                            <p className="mt-2 text-xs text-[#9b83bd]">
                              {trip.startDate} — {trip.endDate}
                            </p>
                          </button>

                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openTripDetail(trip.id)}
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 text-[#9b83bd]"
                              aria-label="ดูรายละเอียดทริป"
                            >
                              <ArrowRight size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                openDeleteModal(
                                  trip.id,
                                  trip.title,
                                  "trip"
                                )
                              }
                              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/70 text-red-400 hover:bg-red-50"
                              aria-label="ลบทริป"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {trip.description && (
                          <p className="mt-2 break-words text-sm text-[#8e7b9d]">
                            {trip.description}
                          </p>
                        )}

                        {(trip.places ?? []).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {trip.places.map((place, index) => (
                              <span
                                key={`${trip.id}-${place}-${index}`}
                                className="rounded-full bg-white px-3 py-1 text-xs text-[#9b83bd]"
                              >
                                📍 {place}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Add buttons */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => openAddHoliday(selectedDate)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#d69a82] px-4 py-3 text-sm font-semibold text-white"
                >
                  <Plus size={18} />
                  เพิ่มวันหยุด
                </button>

                <button
                  type="button"
                  onClick={() => openAddTrip(selectedDate)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#a99acb] px-4 py-3 text-sm font-semibold text-white"
                >
                  <Plane size={18} />
                  เพิ่มทริป
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================== */}
        {/* Add / Edit Holiday Modal */}
        {/* ================================== */}

        {showHolidayForm && (
          <div
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/30 px-0 backdrop-blur-sm sm:items-center sm:px-4"
            onClick={() => {
              if (!savingHoliday) setShowHolidayForm(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="holiday-form-title"
              className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl sm:rounded-3xl sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <h2
                  id="holiday-form-title"
                  className="text-xl font-bold"
                >
                  {holidayId ? "✏️ แก้ไขวันหยุด" : "🌷 เพิ่มวันหยุด"}
                </h2>

                <button
                  type="button"
                  onClick={() => setShowHolidayForm(false)}
                  disabled={savingHoliday}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#fff7f2] disabled:opacity-40"
                  aria-label="ปิด"
                >
                  <X size={20} />
                </button>
              </div>

              <label className="mb-2 block text-sm font-medium">
                วันที่
              </label>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mb-5 min-h-12 w-full rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-4 py-3 outline-none focus:border-[#d69a82]"
              />

              <label className="mb-2 block text-sm font-medium">
                ชื่อวันหยุด
              </label>

              <input
                type="text"
                placeholder="เช่น ลาพักร้อน / วันหยุดส่วนตัว"
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="mb-5 min-h-12 w-full rounded-xl border border-[#f0e3d9] bg-[#fffcfa] px-4 py-3 outline-none focus:border-[#d69a82]"
              />

              <label className="mb-3 block text-sm font-medium">
                สีของวันหยุด
              </label>

              <div className="mb-7 flex flex-wrap gap-4">
                {holidayColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setHolidayColor(color)}
                    aria-label={`เลือกสี ${color}`}
                    aria-pressed={holidayColor === color}
                    className={`h-10 w-10 rounded-full ${holidayColor === color
                      ? "ring-2 ring-[#8e7b6d] ring-offset-2"
                      : ""
                      }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {holidayError && (
                <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-500">
                  {holidayError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowHolidayForm(false)}
                  disabled={savingHoliday}
                  className="min-h-12 flex-1 rounded-xl border border-[#f0e3d9] py-3 text-sm font-medium text-[#a18b7c] disabled:opacity-40"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleSaveHoliday}
                  disabled={
                    !holidayName.trim() ||
                    !selectedDate ||
                    savingHoliday
                  }
                  className="min-h-12 flex-1 rounded-xl bg-[#d69a82] py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {savingHoliday
                    ? "กำลังบันทึก..."
                    : holidayId
                      ? "บันทึกการแก้ไข"
                      : "บันทึกวันหยุด"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================== */}
        {/* Delete Confirmation Modal */}
        {/* ใช้ร่วมกันทั้ง Holiday และ Trip */}
        {/* ================================== */}

        {showDeleteModal && deleteTarget && (
          <div
            className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 px-0 backdrop-blur-sm sm:items-center sm:px-4"
            onClick={closeDeleteModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-modal-title"
              className="w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-400">
                    <Trash2 size={22} />
                  </div>

                  <div>
                    <h2
                      id="delete-modal-title"
                      className="text-lg font-bold"
                    >
                      ยืนยันการลบ
                    </h2>

                    <p className="mt-1 text-sm text-[#a18b7c]">
                      {deleteTarget.type === "holiday"
                        ? "ลบวันหยุดนี้ออกจากปฏิทิน"
                        : "ลบทริปนี้ออกจากรายการ"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff7f2] text-[#a18b7c] disabled:opacity-40"
                  aria-label="ปิด"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-5 rounded-xl bg-[#fff7f2] p-4">
                <p className="text-xs text-[#a18b7c]">
                  รายการที่ต้องการลบ
                </p>

                <p className="mt-1 break-words font-semibold text-[#604b3e]">
                  {deleteTarget.name}
                </p>
              </div>

              <p className="mb-5 text-sm leading-6 text-[#8e7b6d]">
                คุณต้องการลบรายการนี้ใช่หรือไม่?
                <br />
                <span className="text-red-400">
                  การลบข้อมูลนี้ไม่สามารถย้อนกลับได้
                </span>
              </p>

              {deleteError && (
                <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-500">
                  {deleteError}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deleting}
                  className="min-h-12 rounded-xl border border-[#f0e3d9] px-4 py-3 text-sm font-semibold text-[#a18b7c] disabled:opacity-40"
                >
                  ยกเลิก
                </button>

                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  className="min-h-12 rounded-xl bg-red-400 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "กำลังลบ..." : "ยืนยันการลบ"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

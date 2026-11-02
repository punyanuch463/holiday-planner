
"use client";

import { useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Plus,
} from "lucide-react";

import type { Trip, Holiday, Shift } from "@/types/trip";

interface MonthlyCalendarProps {
    trips: Trip[];
    holidays: Holiday[];
    shifts: Shift[];
    onSelectDate: (date: string) => void;
}

const weekDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

const shiftColors: Record<string, string> = {
    morning: "#91B7A0",
    afternoon: "#F4C995",
    night: "#A9C5E8",
    rh: "#D9C6EF",
    substitute: "#F5A5B8",
    yp: "#B5C7A8",
};

const shiftLabels: Record<string, string> = {
    morning: "🌈 เช้า",
    afternoon: "☀️ บ่าย",
    night: "🌝 ดึก",
    rh: "✨ RH",
    substitute: "🤍 แทน",
    yp: "✅ YP",
};

export default function MonthlyCalendar({
    trips,
    holidays,
    shifts,
    onSelectDate,
}: MonthlyCalendarProps) {
    const [currentDate, setCurrentDate] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const monthName = currentDate.toLocaleDateString("th-TH", {
        month: "long",
        year: "numeric",
    });

    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const formatDate = (day: number) => {
        const m = String(month + 1).padStart(2, "0");
        const d = String(day).padStart(2, "0");

        return `${year}-${m}-${d}`;
    };

    const getDayEvents = (date: string) => {
        const dayTrips = trips.filter(
            (trip) => date >= trip.startDate && date <= trip.endDate
        );

        const dayHolidays = holidays.filter(
            (holiday) => holiday.date === date
        );

        const dayShifts = shifts.filter(
            (shift) => shift.date === date
        );

        return {
            trips: dayTrips,
            holidays: dayHolidays,
            shifts: dayShifts,
        };
    };

    const isToday = (day: number) => {
        const today = new Date();

        return (
            today.getDate() === day &&
            today.getMonth() === month &&
            today.getFullYear() === year
        );
    };

    const calendarDays = [];

    for (let i = 0; i < firstDay; i++) {
        calendarDays.push(
            <div
                key={`empty-${i}`}
                className="min-h-[76px] sm:min-h-24 md:min-h-28"
            />
        );
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = formatDate(day);
        const events = getDayEvents(date);

        const totalEvents =
            events.holidays.length +
            events.trips.length +
            events.shifts.length;

        calendarDays.push(
            <button
                key={day}
                type="button"
                onClick={() => onSelectDate(date)}
                aria-label={`${day} ${monthName}, มี ${totalEvents} รายการ`}
                className={`group relative flex min-h-[76px] min-w-0 flex-col items-center overflow-hidden rounded-xl border p-1 transition hover:border-[#d69a82] hover:bg-[#fff5ef] active:bg-[#fff0e8] sm:min-h-24 sm:p-1.5 md:min-h-28 md:p-2 ${isToday(day)
                    ? "border-[#d69a82] bg-[#fff0e8]"
                    : "border-[#f3e8e0] bg-white"
                    }`}
            >
                <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium sm:h-8 sm:w-8 sm:text-sm ${isToday(day)
                        ? "bg-[#d69a82] text-white"
                        : "text-[#6b5548]"
                        }`}
                >
                    {day}
                </span>

                <div className="mt-1 flex w-full min-w-0 flex-col gap-1">
                    {/* วันหยุด */}
                    {events.holidays.slice(0, 1).map((holiday) => (
                        <div
                            key={holiday.id}
                            className="w-full min-w-0 truncate rounded-md px-1 py-0.5 text-[8px] text-white sm:text-[10px] md:text-xs"
                            style={{
                                backgroundColor: holiday.color || "#F5A5B8",
                            }}
                        >
                             {holiday.name}
                        </div>
                    ))}

                    {/* เวร */}
                    {events.shifts.slice(0, 2).map((shift) => (
                        <div
                            key={shift.id}
                            className="w-full min-w-0 truncate rounded-md px-1 py-0.5 text-[8px] text-white sm:text-[10px] md:text-xs"
                            style={{
                                backgroundColor:
                                    shift.color || shiftColors[shift.type] || "#91B7A0",
                            }}
                            title={`${shift.name} ${shift.startTime}–${shift.endTime}${shift.endNextDay ? " (วันถัดไป)" : ""
                                }`}
                        >
                            {shiftLabels[shift.type] || "🕒"} {shift.name}
                        </div>
                    ))}

                    {/* ทริป */}
                    {events.trips.slice(0, 2).map((trip) => (
                        <div
                            key={trip.id}
                            className="w-full min-w-0 truncate rounded-md px-1 py-0.5 text-[8px] text-[#6b4e8a] sm:text-[10px] md:text-xs"
                            style={{
                                backgroundColor: trip.color || "#D9C6EF",
                            }}
                        >
                            ✈ {trip.title}
                        </div>
                    ))}

                    {totalEvents > 3 && (
                        <span className="text-[8px] text-[#a18b7c] sm:text-[10px]">
                            +{totalEvents - 3} รายการ
                        </span>
                    )}
                </div>

                {totalEvents === 0 && (
                    <Plus
                        size={12}
                        className="absolute bottom-1 right-1 text-[#dfcfc3] opacity-0 transition group-hover:opacity-100"
                    />
                )}
            </button>
        );
    }

    return (
        <section className="min-w-0 rounded-3xl border border-white bg-white/80 p-3 shadow-sm sm:p-4 md:p-6">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between gap-2 sm:mb-6">
                <div className="min-w-0">
                    <h2 className="flex items-center gap-2 text-base font-bold text-[#604b3e] sm:text-lg md:text-xl">
                        <CalendarDays
                            className="shrink-0 text-[#d69a82]"
                            size={22}
                        />

                        <span className="truncate">{monthName}</span>
                    </h2>

                    <p className="mt-1 text-[10px] text-[#b49a87] sm:text-xs">
                        แตะวันที่เพื่อดูรายละเอียด เพิ่มวันหยุด ลงเวร หรือสร้างทริป
                    </p>
                </div>

                <div className="flex shrink-0 gap-1.5 sm:gap-2">
                    <button
                        type="button"
                        onClick={previousMonth}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0e3d9] transition hover:bg-[#fff3eb] active:bg-[#f5e8df]"
                        aria-label="เดือนก่อนหน้า"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button
                        type="button"
                        onClick={nextMonth}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[#f0e3d9] transition hover:bg-[#fff3eb] active:bg-[#f5e8df]"
                        aria-label="เดือนถัดไป"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Weekdays */}
            <div className="mb-2 grid grid-cols-7 gap-1">
                {weekDays.map((day, index) => (
                    <div
                        key={day}
                        className={`py-2 text-center text-[10px] font-medium sm:text-xs md:text-sm ${index === 0 ? "text-[#d69a82]" : "text-[#a18b7c]"
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar */}
            <div className="grid grid-cols-7 gap-1">
                {calendarDays}
            </div>

            {/* Legend */}
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-[#a18b7c] sm:text-xs">
                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#F5A5B8]" />
                    วันหยุด
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#91B7A0]" />
                    เวรเช้า
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#F4C995]" />
                    เวรบ่าย
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#A9C5E8]" />
                    เวรดึก
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#D9C6EF]" />
                    RH
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#F5A5B8]" />
                    เวรแทน
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#B5C7A8]" />
                    YP
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#D9C6EF]" />
                    ทริปเที่ยว
                </div>

                <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-[#d69a82]" />
                    วันนี้
                </div>
            </div>
        </section>
    );
}


import { Trip, Holiday } from "./trip";

export const mockTrips: Trip[] = [
  {
    id: "1",
    title: "เที่ยวทะเลกับเพื่อน 🌊",
    startDate: "2026-11-20",
    endDate: "2026-11-22",
    description: "พักผ่อนช่วงวันหยุดยาว",
    places: ["เกาะล้าน", "หาดพัทยา"],
  },
  {
    id: "2",
    title: "ทริปเชียงใหม่ 🌷",
    startDate: "2026-11-28",
    endDate: "2026-11-30",
    description: "เที่ยวภูเขาและคาเฟ่",
    places: ["ดอยอินทนนท์"],
  },
];

export const mockHolidays: Holiday[] = [
  {
    id: "1",
    date: "2026-11-05",
    name: "วันหยุดส่วนตัว",
    color: "#F5A5B8",
  },
  {
    id: "2",
    date: "2026-11-12",
    name: "ลาพักร้อน",
    color: "#A8C9A0",
  },
];

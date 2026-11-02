
export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  description: string;
  places: string[];
  color?: string;
}

export interface Holiday {
  id: string;
  date: string;
  name: string;
  color: string;
}

/**
 * ประเภทเวร
 * morning = เวรเช้า
 * afternoon = เวรบ่าย
 * night = เวรดึก
 * rh = RH (กำหนดเวลาเอง 4 ชั่วโมง)
 * substitute = เวรแทน
 * yp = อบรม YP (08:00–12:00)
 */
export type ShiftType =
  | "morning"
  | "afternoon"
  | "night"
  | "rh"
  | "substitute"
  | "yp";

/**
 * ข้อมูลเวรรายวัน
 */
export interface Shift {
  id: string;
  date: string;
  type: ShiftType;
  name: string;

  // เวลาเริ่มและสิ้นสุด รูปแบบ HH:mm
  startTime: string;
  endTime: string;

  // กรณีเวรดึกที่สิ้นสุดวันถัดไป
  endNextDay: boolean;

  // กรณี RH หรือเวรแทน
  note?: string;

  color: string;

  createdAt?: unknown;
  updatedAt?: unknown;
}

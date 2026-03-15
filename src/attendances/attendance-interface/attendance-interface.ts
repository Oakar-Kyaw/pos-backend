import { Attendance } from '@prisma/client';

// User inside attendance (sanitized — no password)
export interface AttendanceUser {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  role: string;
  employeeType: string | null;
}

// Single attendance record with user included
export interface AttendanceWithUser extends Omit<Attendance, 'user'> {
  user: AttendanceUser;
}
/// types/attendance.types.ts

export interface MonthlyAttendanceGroupedResponse {
  success: boolean;
  message: string;
  summary: {
    totalDays: number;
    totalPresent: number;
    totalAbsent: number;
    totalHalfDay: number;
    totalLeave: number;
    totalHoliday: number;
    totalLate: number;
    totalEarlyLeave: number;
    totalBoth: number;
  };
  attendanceByAbsent: AttendanceWithUser[];
  attendanceByPresent: AttendanceWithUser[]; // pure — isLate=false, isEarlyLeave=false
  attendanceByHalfDay: AttendanceWithUser[];
  attendanceByHoliday: AttendanceWithUser[];
  attendanceByLeave: AttendanceWithUser[];
  attendanceByLate: AttendanceWithUser[]; // isLate=true, isEarlyLeave=false
  attendanceByEarlyLeave: AttendanceWithUser[]; // isEarlyLeave=true, isLate=false
  attendanceByBoth: AttendanceWithUser[]; // both true
}

export interface AttendanceWithUser extends Attendance {
  user: AttendanceUser;
}

import { AttendanceStatus } from '@prisma/client';

export class AttendanceTimeService {
  extractOffset(isoString: string): string {
    // input:  "2026-03-10T17:32:59+06:30"
    // output: "17:32"
    const timePart = isoString.split('T')[1];
    return timePart.slice(0, 5); // "17:32"
  }

  getStatusByCheckIn(
    checkInTime: string, // "17:32"
    startTime: string, // "09:00"
    lunchTime: string, // "12:00" — treat as half day threshold
    endTime: string, // "18:00"
  ): AttendanceStatus {
    const current = this.timeToMinutes(checkInTime);
    const start = this.timeToMinutes(startTime);
    const lunch = this.timeToMinutes(lunchTime);
    const end = this.timeToMinutes(endTime);

    if (current >= end) return AttendanceStatus.ABSENT; // checked in after work ends
    if (current >= lunch) return AttendanceStatus.HALF_DAY; // checked in after lunch
    return AttendanceStatus.PRESENT; // normal
  }

  getLateMinutes(currentTime: string, startTime: string): number {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    return Math.max(0, current - start); // never negative
  }

  getEarlyLeaveMinutes(checkOutTime: string, endTime: string): number {
    const current = this.timeToMinutes(checkOutTime);
    const end = this.timeToMinutes(endTime);
    return Math.max(0, end - current); // 0 if checked out on time or late
  }

  getOvertimeMinutes(checkOutTime: string, endTime: string): number {
    const current = this.timeToMinutes(checkOutTime);
    const end = this.timeToMinutes(endTime);
    return Math.max(0, current - end); // ✅ only positive if worked past end
  }

  getWorkingMinutes(
    checkInTime: string,
    checkOutTime: string,
    lunchMinutes: number,
  ): number {
    const checkIn = this.timeToMinutes(checkInTime);
    const checkOut = this.timeToMinutes(checkOutTime);
    return Math.max(0, checkOut - checkIn - lunchMinutes);
  }

  timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}

import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus, Role } from '@prisma/client';
import { sanitized } from 'src/utils/sanatized-user';
import * as XLSX from 'xlsx';
import { excelDateToJSDate } from 'src/utils/convert-excel-date';
import { CacheService } from 'src/cache-service/cache-service.service';
import { Attendance } from '@prisma/client';
import { AttendanceTimeService } from './attendance-time-service';
import moment from 'moment-timezone';
import { AttendanceWithUser } from './attendance-interface/attendance-interface';
import { MonthlyAttendanceGroupedResponse } from './attendance-interface/attendance-interface';

@Injectable()
export class AttendancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
    private readonly attendanceTimeService: AttendanceTimeService,
  ) {}

  // ================= CREATE =================
  async create(
    dto: CreateAttendanceDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      // 🔎 Validate user belongs to company
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          companyId,
          isDeleted: false,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      console.log('user ', dto.date, new Date(dto.date));

      const attendance = await this.prisma.attendance.create({
        data: {
          userId,
          companyId,
          branchId,
          date: new Date(dto.date),
          checkIn: dto.checkIn,
          checkOut: dto.checkOut,
          workingMinutes: dto.workingMinutes,
          status: dto.status,
          note: dto.note,
        },
      });

      return {
        success: true,
        message: 'Attendance created successfully',
        data: attendance,
      };
    } catch (error) {
      console.log('Attendance create error:', error);
      throw new ForbiddenException('Unable to create attendance');
    }
  }

  // ================= FIND ALL =================
  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    date?: string,
    filterUserId?: string,
    page = 1,
    limit = 10,
  ) {
    const skip = (page - 1) * limit;

    // 🔹 Calculate first and last day of the month if date exists
    let dateFilter: { gte: Date; lte: Date } | undefined = undefined;
    if (date) {
      const inputDate = new Date(date);
      const firstDay = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth(),
        1,
      );
      const lastDay = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      dateFilter = { gte: firstDay, lte: lastDay };
    }

    // 🔹 Determine which userId to filter
    // let userFilter: number | undefined;
    // if (filterUserId) {
    //   userFilter = Number(filterUserId);
    // } else if (role !== Role.ADMIN) {
    //   userFilter = userId;
    // }

    const whereClause: any = {
      companyId,
      ...(branchId && { branchId }),
      ...(userId !== undefined && { userId }),
      ...(dateFilter && { date: dateFilter }),
    };

    const [attendances, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: whereClause,
        include: {
          user: true,
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendance.count({
        where: whereClause,
      }),
    ]);

    const sanitizedData = sanitized(attendances);

    return {
      success: true,
      message: 'Attendance list fetched successfully',
      data: sanitizedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ================= FIND ALL HOLIDAY AND ABSENT  =================
  async getMonthlyAttendanceGroupedByStatus(
    role: Role,
    userId: number,
    companyId: number,
    branchId?: number,
    date?: Date,
    filterUserId?: number,
  ): Promise<MonthlyAttendanceGroupedResponse> {
    //  Date filter — first & last day of month
    const totalDaysInMonth = date
      ? new Date(
          new Date(date).getFullYear(),
          new Date(date).getMonth() + 1,
          0,
        ).getDate()
      : new Date(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          0,
        ).getDate();

    let dateFilter: { gte: Date; lte: Date } | undefined;

    if (date) {
      const inputDate = new Date(date);
      const firstDay = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth(),
        1,
      );
      const lastDay = new Date(
        inputDate.getFullYear(),
        inputDate.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      dateFilter = { gte: firstDay, lte: lastDay };
    }

    // 🔹 Where clause
    const whereClause = {
      companyId,
      ...(branchId && { branchId }),
      ...(filterUserId && { userId: Number(filterUserId) }),
      ...(dateFilter && { date: dateFilter }),
    };

    // 🔹 Fetch
    const attendances = await this.prisma.attendance.findMany({
      where: whereClause,
      include: { user: true },
      orderBy: { date: 'desc' },
    });

    const sanitizedData = sanitized(attendances) as AttendanceWithUser[];

    // 🔹 Status groups
    const attendanceByAbsent: AttendanceWithUser[] = [];
    let attendanceByHalfDay: AttendanceWithUser[] = [];
    const attendanceByLeave: AttendanceWithUser[] = [];
    const attendanceByHoliday: AttendanceWithUser[] = [];

    sanitizedData.forEach((att: AttendanceWithUser) => {
      switch (att.status) {
        case AttendanceStatus.ABSENT:
          attendanceByAbsent.push(att);
          break;
        case AttendanceStatus.HALF_DAY:
          attendanceByHalfDay.push(att);
          break;
        case AttendanceStatus.LEAVE:
          attendanceByLeave.push(att);
          break;
        case AttendanceStatus.HOLIDAY:
          attendanceByHoliday.push(att);
          break;
      }
    });

    const workedDays = [AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY];

    //  Pure present — no late, no early leave
    const attendanceByPresent = sanitizedData.filter(
      (att) =>
        att.status === AttendanceStatus.PRESENT &&
        att.isLate === false &&
        att.isEarlyLeave === false,
    );

    attendanceByHalfDay = sanitizedData.filter(
      (att) =>
        att.status === AttendanceStatus.HALF_DAY &&
        att.isLate === false &&
        att.isEarlyLeave === false,
    );

    // Late only — showed up late but left on time
    const attendanceByLate = sanitizedData.filter(
      (att) =>
        att.isLate === true &&
        att.isEarlyLeave === false &&
        (workedDays as readonly string[]).includes(att.status),
    );

    // Early leave only — on time but left early
    const attendanceByEarlyLeave = sanitizedData.filter(
      (att) =>
        att.isEarlyLeave === true &&
        att.isLate === false &&
        (workedDays as readonly string[]).includes(att.status),
    );

    //Both — late AND early leave same day
    const attendanceByBoth = sanitizedData.filter(
      (att) =>
        att.isLate === true &&
        att.isEarlyLeave === true &&
        (workedDays as readonly string[]).includes(att.status),
    );

    // 🔹 Summary
    const summary = {
      totalDays: totalDaysInMonth,
      totalPresent: attendanceByPresent.length,
      totalAbsent: attendanceByAbsent.length,
      totalHalfDay: attendanceByHalfDay.length,
      totalLeave: attendanceByLeave.length,
      totalHoliday: attendanceByHoliday.length,
      totalLate: attendanceByLate.length,
      totalEarlyLeave: attendanceByEarlyLeave.length,
      totalBoth: attendanceByBoth.length,
    };

    return {
      success: true,
      message: 'Attendance grouped by status successfully',
      summary,
      attendanceByAbsent,
      attendanceByPresent,
      attendanceByHalfDay,
      attendanceByHoliday,
      attendanceByLeave,
      attendanceByLate,
      attendanceByEarlyLeave,
      attendanceByBoth,
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number, userId: number, companyId: number) {
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        user: true,
        company: true,
        branch: true,
      },
    });

    if (!attendance) {
      throw new NotFoundException({
        success: false,
        message: 'Attendance not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Attendance fetched successfully',
      data: attendance,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdateAttendanceDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id, userId, companyId);

    const updated = await this.prisma.attendance.update({
      where: { id },
      data: {
        checkIn: dto.checkIn,
        checkOut: dto.checkOut,
        workingMinutes: dto.workingMinutes,
        status: dto.status,
        note: dto.note,
      },
    });

    return {
      success: true,
      message: 'Attendance updated successfully',
      data: updated,
    };
  }

  // ================= DELETE =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.attendance.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Attendance deleted successfully',
      data: deleted,
    };
  }

  async createCheckIn(
    dto: CreateAttendanceDto,
    timezone: string,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      // 🔎 Validate user belongs to company
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          companyId,
          isDeleted: false,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }
      const time = moment().tz(timezone).format();
      const checkInTime = this.attendanceTimeService.extractOffset(time);

      let status = this.attendanceTimeService.getStatusByCheckIn(
        checkInTime,
        user.startTime!,
        user.lunchTime!,
        user.endTime!,
      );

      let lateMinutes = this.attendanceTimeService.getLateMinutes(
        checkInTime,
        user.startTime!,
      );

      let isLate = lateMinutes > 0;

      const attendance = await this.prisma.attendance.create({
        data: {
          user: { connect: { id: userId } },
          company: { connect: { id: companyId } },
          ...(branchId && {
            branch: { connect: { id: branchId } },
          }),
          date: new Date(dto.date),
          checkIn: checkInTime,
          workingMinutes: dto.workingMinutes ?? 0,
          isLate,
          status,
          note: dto.note,
          lateMinutes,
        },
      });

      return {
        success: true,
        message: 'Attendance created successfully',
        data: attendance,
      };
    } catch (error) {
      console.log('Attendance create error:', error);
      throw new ForbiddenException('Unable to create attendance');
    }
  }

  async findByDateAndUserFilter(
    userId: number,
    companyId: number,
    branchId: number,
    date: Date,
  ) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const data = await this.prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        branchId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: true,
      },
    });
    return {
      success: true,
      message: 'Attendance fetched successfully',
      data,
    };
  }

  async checkOut(
    timezone: string,
    userId: number,
    companyId: number,
    branchId: number,
    date: Date,
    checkOut: string,
  ) {
    console.log('check out ', checkOut);
    // Start and end of day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        isDeleted: false,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 1️⃣ Find the attendance record first
    const attendance = await this.prisma.attendance.findFirst({
      where: {
        userId,
        companyId,
        branchId,
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!attendance) {
      throw new Error('Attendance record not found for today');
    }

    const time = moment().tz(timezone).format();
    const checkOutTime = this.attendanceTimeService.extractOffset(time);

    let earlyLeaveMinutes = this.attendanceTimeService.getEarlyLeaveMinutes(
      checkOutTime,
      user.endTime!,
    );

    let isEarlyLeave = earlyLeaveMinutes > 0;

    // // 2️⃣ Update by id
    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut: checkOutTime, earlyLeaveMinutes, isEarlyLeave },
      include: {
        user: true,
      },
    });

    return {
      success: true,
      message: 'Attendance updated successfully',
      // data: updated,
    };
  }

  async postExcel(file: Express.Multer.File, timezone: string = 'UTC') {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    const attendanceData: any[] = [];

    //  Get all emails from Excel
    const emails = [...new Set(rows.map((r: any) => r['Email']?.trim()))];

    //  Fetch all users at once
    const users = await this.prisma.user.findMany({
      where: {
        email: { in: emails },
      },
    });

    //  Convert to Map for O(1) lookup
    const userMap = new Map(users.map((u) => [u.email, u]));

    for (const row of rows as any[]) {
      const email = row['Email']?.trim();
      const user = userMap.get(email);

      if (!user) continue;
      if (!user.startTime || !user.endTime || !user.lunchTime) continue;

      const checkInTime = row['CheckIn'] as string;
      const checkOutTime = row['CheckOut'] as string;

      //  If no check-in or check-out, mark as ABSENT
      let status: AttendanceStatus = AttendanceStatus.PRESENT;
      let lateMinutes = 0;
      let earlyLeaveMinutes = 0;

      if (!checkInTime || !checkOutTime) {
        status = 'ABSENT';
      } else {
        lateMinutes = this.attendanceTimeService.getLateMinutes(
          checkInTime,
          user.startTime,
        );
        earlyLeaveMinutes = this.attendanceTimeService.getEarlyLeaveMinutes(
          checkOutTime,
          user.endTime,
        );
        status = this.attendanceTimeService.getStatusByCheckIn(
          checkInTime,
          user.startTime,
          user.lunchTime,
          user.endTime,
        );
      }

      attendanceData.push({
        userId: user.id,
        companyId: user.companyId,
        branchId: user.branchId ?? null,
        date: new Date(row['Date']),
        checkIn: checkInTime ?? null,
        checkOut: checkOutTime ?? null,
        status,
        lateMinutes,
        earlyLeaveMinutes,
        isLate: lateMinutes > 0,
        isEarlyLeave: earlyLeaveMinutes > 0,
      });
    }

    if (attendanceData.length > 0) {
      await this.prisma.attendance.createMany({
        data: attendanceData,
        skipDuplicates: true,
      });
    }

    return {
      success: true,
      message: 'Attendance imported successfully',
      total: attendanceData.length,
    };
  }
}

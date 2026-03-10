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

@Injectable()
export class AttendancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
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
          workingHours: dto.workingHours,
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
    role: Role,
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
    let userFilter: number | undefined;
    if (filterUserId) {
      userFilter = Number(filterUserId);
    } else if (role !== Role.ADMIN) {
      userFilter = userId;
    }

    const whereClause: any = {
      companyId,
      ...(branchId && { branchId }),
      ...(userFilter !== undefined && { userId: userFilter }),
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
    date?: string,
    filterUserId?: number,
  ) {
    // 🔹 Calculate first & last day of month
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

    // 🔹 Prisma where clause
    const whereClause: any = {
      companyId,
      ...(branchId && { branchId }),
      ...(filterUserId && { userId: Number(filterUserId) }),
      ...(dateFilter && { date: dateFilter }),
    };

    // 🔹 Fetch attendances
    const attendances = await this.prisma.attendance.findMany({
      where: whereClause,
      include: {
        user: true,
      },
      orderBy: {
        date: 'desc',
      },
    });

    // 🔹 Group by attendance status
    const attendanceByAbsent: Attendance[] = [];
    const attendanceByPresent: Attendance[] = [];
    const attendanceByLate: Attendance[] = [];
    const attendanceByLeave: Attendance[] = [];
    const attendanceByHalfDay: Attendance[] = [];
    const attendanceByHoliday: Attendance[] = [];

    const sanitizedData = sanitized(attendances);

    sanitizedData.forEach((att: Attendance) => {
      switch (att.status) {
        case AttendanceStatus.ABSENT:
          attendanceByAbsent.push(att);
          break;

        case AttendanceStatus.PRESENT:
          attendanceByPresent.push(att);
          break;

        case AttendanceStatus.LATE:
          attendanceByLate.push(att);
          break;

        case AttendanceStatus.LEAVE:
          attendanceByLeave.push(att);
          break;

        case AttendanceStatus.HALF_DAY:
          attendanceByHalfDay.push(att);
          break;

        case AttendanceStatus.HOLIDAY:
          attendanceByHoliday.push(att);
          break;
      }
    });

    return {
      success: true,
      message: 'Attendance grouped by status successfully',
      attendanceByAbsent,
      attendanceByPresent,
      attendanceByLate,
      attendanceByHalfDay,
      attendanceByHoliday,
      attendanceByLeave,
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
        workingHours: dto.workingHours,
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

      let status = this.checkStatusByCheckInTime(
        dto.checkIn!,
        user.startTime!,
        user.lunchTime!,
        user.endTime!,
      );

      let lateMinutes =
        status === AttendanceStatus.LATE
          ? this.calculateLateMinute(dto.checkIn!, user.startTime!)
          : 0;

      const attendance = await this.prisma.attendance.create({
        data: {
          userId,
          companyId,
          branchId,
          date: new Date(dto.date),
          checkIn: dto.checkIn,
          workingHours: dto.workingHours,
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

  checkStatusByCheckInTime(
    date: string,
    startTime: string,
    lunchTime: string,
    endTime: string,
  ) {
    const current = this.toMinutes(date);
    const start = this.toMinutes(startTime);
    const lunch = this.toMinutes(lunchTime);
    const end = this.toMinutes(endTime);

    if (current > end) return AttendanceStatus.ABSENT;
    if (current > lunch) return AttendanceStatus.HALF_DAY;
    if (current > start) return AttendanceStatus.LATE;

    return AttendanceStatus.PRESENT;
  }

  checkStatusByCheckOutTime(date: string, lunchTime: string, endTime: string) {
    const current = this.toMinutes(date);
    const afterLunch = this.toMinutes(lunchTime) + 60;
    const end = this.toMinutes(endTime);

    if (current < end) return AttendanceStatus.EARLY_LEAVE;
    if (current < afterLunch) return AttendanceStatus.HALF_DAY;
    return null;
  }

  calculateLateMinute(date: string, startTime: string) {
    const current = this.toMinutes(date);
    const start = this.toMinutes(startTime);
    return current - start;
  }

  calculateEarlyMinute(date: string, endTime: string) {
    const current = this.toMinutes(date);
    const end = this.toMinutes(endTime);
    return end - current;
  }

  toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
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

    let status = this.checkStatusByCheckOutTime(
      checkOut!,
      user.lunchTime!,
      user.endTime!,
    );

    let earlyLeaveMinutes =
      status && status === AttendanceStatus.EARLY_LEAVE
        ? this.calculateEarlyMinute(checkOut!, user.endTime!)
        : 0;

    // 2️⃣ Update by id
    const updated = await this.prisma.attendance.update({
      where: { id: attendance.id },
      data: { checkOut, earlyLeaveMinutes },
      include: {
        user: true,
      },
    });

    return {
      success: true,
      message: 'Attendance updated successfully',
      data: updated,
    };
  }

  async postExcel(file: Express.Multer.File) {
    console.log('file', file);
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet);

    const attendanceData: any[] = [];

    for (const row of rows as any[]) {
      // Fetch user from cache or DB
      const user = await this.cacheService.getData(
        `attendance:${row['Email']}`,
        async () =>
          await this.prisma.user.findUnique({
            where: { email: row['Email'].trim() },
          }),
        300,
      );

      if (!user) continue;

      let status = this.checkStatusByCheckInTime(
        row['CheckIn'],
        user.startTime!,
        user.lunchTime!,
        user.endTime!,
      );

      let lateMinutes =
        status === AttendanceStatus.LATE
          ? this.calculateLateMinute(row['CheckIn'], user.startTime!)
          : 0;

      let lateStatus = this.checkStatusByCheckOutTime(
        row['CheckOut'],
        user.lunchTime!,
        user.endTime!,
      );

      let earlyLeaveMinutes =
        lateStatus && lateStatus === AttendanceStatus.EARLY_LEAVE
          ? this.calculateEarlyMinute(row['CheckOut'], user.endTime!)
          : 0;

      attendanceData.push({
        userId: user.id,
        date: excelDateToJSDate(row['Date']),
        checkIn: row['CheckIn'],
        checkOut: row['CheckOut'],
        companyId: user.companyId,
        branchId: user.branchId,
        lateMinutes,
        status:
          status != AttendanceStatus.PRESENT
            ? status
            : lateStatus != null
              ? lateStatus
              : AttendanceStatus.PRESENT,
        earlyLeaveMinutes,
        //status: row['AttendanceStatus'],
      });
    }

    console.log('Prepared attendance rows:', attendanceData);

    // Step 2: Bulk insert
    if (attendanceData.length > 0) {
      await this.prisma.attendance.createMany({
        data: attendanceData,
        skipDuplicates: true, // optional, skip if already exists
      });
    }

    return {
      success: true,
      message: 'Attendance imported successfully',
      total: attendanceData.length,
    };
  }
}

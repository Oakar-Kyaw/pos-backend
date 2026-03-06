import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceStatus } from '@prisma/client';
import { sanitized } from 'src/utils/sanatized-user';

@Injectable()
export class AttendancesService {
  constructor(private readonly prisma: PrismaService) {}

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

      let status = !dto.status
        ? this.checkTime(
            dto.checkIn!,
            user.startTime!,
            user.lunchTime!,
            user.endTime!,
          )
        : dto.status;

      // const attendance = await this.prisma.attendance.create({
      //   data: {
      //     userId,
      //     companyId,
      //     branchId,
      //     date: new Date(dto.date),
      //     checkIn: dto.checkIn,
      //     checkOut: dto.checkOut,
      //     workingHours: dto.workingHours,
      //     status,
      //     note: dto.note,
      //   },
      // });

      return {
        success: true,
        message: 'Attendance created successfully',
        // data: attendance,
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
    page: number,
    limit: number,
  ) {
    const skip = (page - 1) * limit;

    const [attendances, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          companyId,
          ...(branchId && { branchId }),
        },
        include: {
          user: true,
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.attendance.count({
        where: {
          companyId,
          ...(branchId && { branchId }),
        },
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

      let status = this.checkTime(
        dto.checkIn!,
        user.startTime!,
        user.lunchTime!,
        user.endTime!,
      );

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

  checkTime(
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

  toMinutes(time: string) {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  HttpException,
} from '@nestjs/common';
import { HrRule, HrRuleType, Role } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { AttendancesService } from 'src/attendances/attendances.service';
import { CalculatePayrollDto } from './dto/calculate-payroll.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { UpdatePayrollDto } from './dto/update-payroll.dto';
import { MonthlyAttendanceGroupedResponse } from 'src/attendances/attendance-interface/attendance-interface';
import {
  EarlyLeaveDeductionItem,
  lateDeductionItem,
} from './interface/payroll-item.interface';

interface PayrollContext {
  userId: number;
  companyId: number;
  branchId?: number;
}

@Injectable()
export class PayrollService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendancesService: AttendancesService,
  ) {}

  // ================= HELPERS =================

  private isCacluatedByPercent(rule: HrRule): boolean {
    return rule.thresholdAmountPercent && rule.thresholdAmountPercent > 0
      ? true
      : false;
  }

  // Rules must be sorted ASC by thresholdMinute before passing in
  // Example: [{threshold:1}, {threshold:15}, {threshold:30}]
  // minutes=8  → 1 ≤ 8 < 15  → rule[0]  (1–14)
  // minutes=20 → 15 ≤ 20 < 30 → rule[1] (15–29)
  // minutes=35 → 30 ≤ 35 < ∞  → rule[2] (30+)
  // minutes=0  → below first threshold → undefined
  private findRangeRule(
    minutes: number,
    sortedRules: HrRule[],
  ): HrRule | undefined {
    for (let i = 0; i < sortedRules.length; i++) {
      const current = sortedRules[i];
      const next = sortedRules[i + 1];
      const lowerBound = current.thresholdMinute ?? 0;
      const upperBound = next ? (next.thresholdMinute ?? Infinity) : Infinity;

      if (minutes >= lowerBound && minutes < upperBound) {
        return current;
      }
    }
    return undefined;
  }

  private calcDeductAmount(rule: HrRule, salaryByDay: number): number {
    return this.isCacluatedByPercent(rule)
      ? (salaryByDay * (rule.thresholdAmountPercent ?? 0)) / 100
      : (rule.thresholdAmount ?? 0);
  }

  // ================= CREATE =================
  async create(
    dto: CreatePayrollDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    //console.log('create payroll is ', dto);
    try {
      const month = new Date(dto.date).getMonth() + 1;
      //console.log('month is: ', month);
      const year = new Date(dto.date).getFullYear();

      const employee = await this.prisma.user.findFirst({
        where: { id: dto.userId, companyId, isDeleted: false },
      });

      if (!employee) {
        throw new NotFoundException('User not found');
      }

      const existPayroll = await this.prisma.payroll.findFirst({
        where: {
          userId: dto.userId,
          month,
        },
      });

      if (existPayroll)
        throw new ConflictException('Payroll with this id already exist');

      const calulateData = await this.calculate(
        { userId: dto.userId, date: dto.date },
        { userId, companyId, branchId },
      );
      const { data, summary } = calulateData;
      const netSalary =
        data.netSalary + (dto.bonus ?? 0) - (dto.deduction ?? 0);
      const totalDeductions =
        (data.totalDeductions ?? 0) + (dto.deduction ?? 0);

      const payroll = await this.prisma.payroll.create({
        data: {
          userId: dto.userId,
          approveUserId: userId,
          companyId,
          branchId,
          month,
          year,
          baseSalary: data.totalSalary,
          lateDeduction: data.lateDeduction ?? 0,
          earlyLeaveDeduction: data.earlyLeaveDeduction ?? 0,
          overtime: data.overtime ?? 0,
          bonus: dto.bonus ?? 0,
          deduction: dto.deduction ?? 0,
          totalDeductions,
          leaveDeduction: data.leaveDeduction ?? 0,
          netSalary,
          totalWorkingDays: data.workedDays ?? 0,
          presentDays: summary.totalPresent ?? 0,
          absentDays: summary.totalAbsent ?? 0,
          halfDays: summary.totalHalfDay ?? 0,
          leaveDays: summary.totalLeave ?? 0,
          lateTotalMinutes: data.lateTotalMinutes ?? 0,
          earlyLeaveTotalMinutes: data.earlyLeaveTotalMinutes ?? 0,
          overtimeTotalMinutes: data.overtimeTotalMinutes ?? 0,
          overtimeDays: data.overtimeDays ?? 0,
          status: dto.status,
          note: dto.note,
        },
        include: { user: true },
      });

      return {
        success: true,
        message: 'Payroll created successfully',
        data: payroll,
      };
    } catch (error) {
      console.log('Payroll create error:', error);

      if (error instanceof HttpException) {
        throw error;
      }
      throw new ForbiddenException('Unable to create payroll');
    }
  }

  // ================= FIND ALL =================
  async findAll(
    userId: number,
    companyId: number,
    branchId: number | undefined,
    page: number,
    limit: number,
    filterUserId?: number,
    month?: number,
    year?: number,
  ) {
    const skip = (page - 1) * limit;
    const whereClause: any = {
      companyId,
      ...(branchId && { branchId }),
      ...(filterUserId && { userId: filterUserId }),
      ...(userId && { userId }),
      ...(month && { month }),
      ...(year && { year }),
    };
    console.log('wehre closu', whereClause);
    const [payrolls, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where: whereClause,
        include: { user: true },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payroll.count({ where: whereClause }),
    ]);

    return {
      success: true,
      message: 'Payroll list fetched successfully',
      data: payrolls,
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
    const payroll = await this.prisma.payroll.findFirst({
      where: { id, companyId },
      include: { user: true },
    });

    if (!payroll) {
      throw new NotFoundException({
        success: false,
        message: 'Payroll not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Payroll fetched successfully',
      data: payroll,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdatePayrollDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id, userId, companyId);

    const updated = await this.prisma.payroll.update({
      where: { id },
      data: {
        baseSalary: dto.baseSalary,
        lateDeduction: dto.lateDeduction,
        earlyLeaveDeduction: dto.earlyLeaveDeduction,
        overtime: dto.overtime,
        bonus: dto.bonus,
        deduction: dto.deduction,
        leaveDeduction: dto.leaveDeduction,
        netSalary: dto.netSalary,
        totalWorkingDays: dto.totalWorkingDays,
        presentDays: dto.presentDays,
        absentDays: dto.absentDays,
        halfDays: dto.halfDays,
        leaveDays: dto.leaveDays,
        lateTotalMinutes: dto.lateTotalMinutes,
        earlyLeaveTotalMinutes: dto.earlyLeaveTotalMinutes,
        overtimeTotalMinutes: dto.overtimeTotalMinutes,
        overtimeDays: dto.overtimeDays,
        status: dto.status,
        note: dto.note,
      },
      include: { user: true },
    });

    return {
      success: true,
      message: 'Payroll updated successfully',
      data: updated,
    };
  }

  // ================= DELETE =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.payroll.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Payroll deleted successfully',
      data: deleted,
    };
  }

  // ================= CALCULATE =================
  async calculate(dto: CalculatePayrollDto, ctx: PayrollContext) {
    let lateTotalMinutes = 0;
    let earlyLeaveTotalMinutes = 0;
    let overtimeTotalMinutes = 0;
    let overtimeDays = 0;

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const attendanceData: MonthlyAttendanceGroupedResponse =
      await this.attendancesService.getMonthlyAttendanceGroupedByStatus(
        Role.ADMIN,
        ctx.userId,
        ctx.companyId,
        ctx.branchId,
        dto.date,
        dto.userId,
      );

    const {
      attendanceByLate,
      attendanceByBoth,
      attendanceByLeave,
      attendanceByEarlyLeave,
      attendanceByAbsent,
      attendanceByHalfDay,
      attendanceByHoliday,
      attendanceByPresent,
    } = attendanceData;

    const totalSalary = user.monthlySalary ?? 0;
    const salaryByDay = totalSalary / attendanceData.summary.totalDays;

    // =============================================
    // 🔹 WORKED DAYS (informational — for payslip display)
    // late/earlyLeave/both are still present days — they earned full day salary
    // half day = 0.5 because they only worked half the day
    // =============================================
    const workedDays =
      attendanceByPresent.length +
      attendanceByLate.length +
      attendanceByEarlyLeave.length +
      attendanceByBoth.length +
      attendanceByHoliday.length +
      attendanceByLeave.length +
      attendanceByHalfDay.length * 0.5;

    const attendanceSalary = Math.round(workedDays * salaryByDay);

    // 🔹 Fetch rules ordered ASC by thresholdMinute
    const rules = await this.prisma.hrRule.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { thresholdMinute: 'asc' },
    });

    const deductRules = rules.filter((r) => r.type === HrRuleType.DEDUCT);
    const earlyLeaveRules = rules.filter(
      (r) => r.type === HrRuleType.EARLY_LEAVE,
    );
    const overtimeRules = rules.filter((r) => r.type === HrRuleType.OVERTIME);
    const leaveAllowRule = rules.find((r) => r.type === HrRuleType.LEAVE_ALLOW);

    // =============================================
    // 🔹 LATE DEDUCTION
    // DB rules example (sorted asc):
    //   threshold:1  → fixed 5,000      (1–14 mins)
    //   threshold:15 → 10% of daily     (15–29 mins)
    //   threshold:30 → 50% of daily     (30+ mins)
    // =============================================
    const lateAttendances = [...attendanceByLate, ...attendanceByBoth];
    let lateDeductionTotal = 0;
    const lateDeductionItems: lateDeductionItem[] = [];

    for (const late of lateAttendances) {
      if (late.lateMinutes <= 0) continue;

      const matchedRule = this.findRangeRule(late.lateMinutes, deductRules);
      if (!matchedRule) continue;

      const deductAmount = this.calcDeductAmount(matchedRule, salaryByDay);
      lateTotalMinutes += late.lateMinutes;
      lateDeductionTotal += deductAmount;
      lateDeductionItems.push({
        date: late.date,
        lateMinutes: late.lateMinutes,
        ruleId: matchedRule.id,
        threshold: matchedRule.thresholdMinute ?? 0,
        deduction: Math.round(deductAmount),
      });
    }

    // =============================================
    // 🔹 EARLY LEAVE DEDUCTION
    // attendanceByBoth included — they left early AND came late
    // =============================================
    const earlyLeaveAttendances = [
      ...attendanceByEarlyLeave,
      ...attendanceByBoth,
    ];
    let earlyLeaveDeductionTotal = 0;
    const earlyLeaveDeductionItems: EarlyLeaveDeductionItem[] = [];

    for (const early of earlyLeaveAttendances) {
      if (early.earlyLeaveMinutes <= 0) continue;

      const matchedRule = this.findRangeRule(
        early.earlyLeaveMinutes,
        earlyLeaveRules,
      );
      if (!matchedRule) continue;

      const deductAmount = this.calcDeductAmount(matchedRule, salaryByDay);
      earlyLeaveTotalMinutes += early.earlyLeaveMinutes;
      earlyLeaveDeductionTotal += deductAmount;
      earlyLeaveDeductionItems.push({
        date: early.date,
        earlyLeaveMinutes: early.earlyLeaveMinutes,
        ruleId: matchedRule.id,
        threshold: matchedRule.thresholdMinute ?? 0,
        deduction: Math.round(deductAmount),
      });
    }

    // =============================================
    // 🔹 ABSENT DEDUCTION
    // Each absent day deducts one full day salary
    // =============================================
    const absentDeduction = attendanceByAbsent.length * salaryByDay;

    // =============================================
    // 🔹 LEAVE DEDUCTION
    // Free leave days from leaveAllowRule are not deducted
    // =============================================
    const freeLeaveDays = leaveAllowRule?.thresholdDays ?? 0;
    const chargeableLeaveDays = Math.max(
      0,
      attendanceData.summary.totalLeave - freeLeaveDays,
    );
    const leaveDeduction = chargeableLeaveDays * salaryByDay;

    // =============================================
    // 🔹 NET SALARY
    // Base = totalSalary (full monthly salary)
    // absentDeduction handles unpaid absent days
    // late/earlyLeave penalties are on top
    // =============================================
    const totalDeductions =
      lateDeductionTotal +
      earlyLeaveDeductionTotal +
      absentDeduction +
      leaveDeduction;

    const overtime = 0;
    const netSalary = Math.max(0, attendanceSalary - totalDeductions);

    const { success, message, ...attendanceGrouped } = attendanceData;

    return {
      success: true,
      message: 'Get all calculate data',
      data: {
        totalSalary,
        salaryByDay: Math.round(salaryByDay),
        overtime,
        attendanceSalary, // informational: salary from worked days only
        workedDays, // informational: total worked days count
        lateDeduction: Math.round(lateDeductionTotal),
        earlyLeaveDeduction: Math.round(earlyLeaveDeductionTotal),
        absentDeduction: Math.round(absentDeduction),
        leaveDeduction: Math.round(leaveDeduction),
        totalDeductions: Math.round(totalDeductions),
        netSalary: Math.round(netSalary),
        lateDeductionItems,
        earlyLeaveDeductionItems,
        lateTotalMinutes,
        earlyLeaveTotalMinutes,
        overtimeTotalMinutes,
        overtimeDays,
      },
      // rules: {
      //   deductRules,
      //   earlyLeaveRules,
      //   overtimeRules,
      //   leaveAllowRule,
      // },
      ...attendanceGrouped,
    };
  }
}

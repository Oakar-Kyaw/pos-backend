import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateHrRuleDto } from './dto/create-hr-rule.dto';
import { UpdateHrRuleDto } from './dto/update-hr-rule.dto';
import { HrRuleType } from '@prisma/client';

@Injectable()
export class HrRuleService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(
    dto: CreateHrRuleDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      const hrRule = await this.prisma.hrRule.create({
        data: {
          companyId,
          branchId: branchId,
          type: dto.type ?? HrRuleType.DEDUCT,
          thresholdMinute: dto.thresholdMinute,
          thresholdAmount: dto.thresholdAmount,
          thresholdAmountPercent: dto.thresholdAmountPercent,
          overtimeMinute: dto.overtimeMinute,
          overtimeDay: dto.overtimeDay,
          overtimeAmount: dto.overtimeAmount,
          overtimeAmountPercent: dto.overtimeAmountPercent,
          earlyLeaveMinute: dto.earlyLeaveMinute,
          earlyLeaveAmount: dto.earlyLeaveAmount,
          earlyLeavePercent: dto.earlyLeavePercent,
          leaveAllowDay: dto.leaveAllowDay,
        },
      });

      return {
        success: true,
        message: 'HR rule created successfully',
        data: hrRule,
      };
    } catch (error) {
      console.log('HR rule create error:', error);
      throw new ForbiddenException('Unable to create HR rule');
    }
  }

  // ================= FIND ALL =================
  async findAll(userId: number, companyId: number, branchId?: number) {
    const whereClause: any = {
      companyId,
      ...(branchId && { branchId }),
    };

    const [rules, total] = await Promise.all([
      this.prisma.hrRule.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.hrRule.count({
        where: whereClause,
      }),
    ]);

    return {
      success: true,
      message: 'HR rules fetched successfully',
      data: rules,
      meta: {
        total,
      },
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number, userId: number, companyId: number) {
    const rule = await this.prisma.hrRule.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        company: true,
        branch: true,
      },
    });

    if (!rule) {
      throw new NotFoundException({
        success: false,
        message: 'HR rule not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'HR rule fetched successfully',
      data: rule,
    };
  }

  // ================= UPDATE =================
  async update(
    id: number,
    dto: UpdateHrRuleDto,
    userId: number,
    companyId: number,
  ) {
    await this.findOne(id, userId, companyId);

    const updated = await this.prisma.hrRule.update({
      where: { id },

      data: {
        type: dto.type,
        thresholdMinute: dto.thresholdMinute,
        thresholdAmount: dto.thresholdAmount,
        thresholdAmountPercent: dto.thresholdAmountPercent,
        overtimeMinute: dto.overtimeMinute,
        overtimeAmount: dto.overtimeAmount,
        overtimeDay: dto.overtimeDay,
        overtimeAmountPercent: dto.overtimeAmountPercent,
        earlyLeaveMinute: dto.earlyLeaveMinute,
        earlyLeaveAmount: dto.earlyLeaveAmount,
        earlyLeavePercent: dto.earlyLeavePercent,
        leaveAllowDay: dto.leaveAllowDay,
      },
    });

    return {
      success: true,
      message: 'HR rule updated successfully',
      data: updated,
    };
  }

  // ================= DELETE =================
  async remove(id: number, userId: number, companyId: number) {
    await this.findOne(id, userId, companyId);

    const deleted = await this.prisma.hrRule.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'HR rule deleted successfully',
      data: deleted,
    };
  }

  // ================= GET COMPANY ACTIVE RULE =================
  async getCompanyRule(companyId: number, branchId?: number) {
    const rule = await this.prisma.hrRule.findFirst({
      where: {
        companyId,
        ...(branchId && { branchId }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!rule) {
      throw new NotFoundException('HR rule not found for company');
    }

    return {
      success: true,
      message: 'Company HR rule fetched successfully',
      data: rule,
    };
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlanService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(dto: CreatePlanDto) {
    try {
      const plan = await this.prisma.plan.create({
        data: {
          name: dto.name,
          title: dto.title,
          durationDays: dto.durationDays,
          priceMMK: dto.priceMMK,
          priceUSD: dto.priceUSD,
          discountPercent: dto.discountPercent ?? 0,
          isPopular: dto.isPopular ?? false,
          isActive: dto.isActive ?? true,
        },
      });

      return {
        success: true,
        message: 'Plan created successfully',
        data: plan,
      };
    } catch (error) {
      console.log('Plan create error:', error);
      throw new ForbiddenException('Unable to create plan');
    }
  }

  // ================= FIND ALL =================
  async findAll() {
    const plans = await this.prisma.plan.findMany({
      where: {
        isDeleted: false,
        isActive: true,
      },
      include: {
        planFeatures: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    return {
      success: true,
      message: 'Plans fetched successfully',
      data: plans,
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      success: true,
      message: 'Plan fetched successfully',
      data: plan,
    };
  }

  // ================= UPDATE =================
  async update(id: number, dto: UpdatePlanDto) {
    await this.findOne(id);

    try {
      const updated = await this.prisma.plan.update({
        where: { id },
        data: {
          name: dto.name,
          title: dto.title,
          durationDays: dto.durationDays,
          priceMMK: dto.priceMMK,
          priceUSD: dto.priceUSD,
          discountPercent: dto.discountPercent,
          isPopular: dto.isPopular,
          isActive: dto.isActive,
        },
      });

      return {
        success: true,
        message: 'Plan updated successfully',
        data: updated,
      };
    } catch (error) {
      console.log('Plan update error:', error);
      throw new ForbiddenException('Unable to update plan');
    }
  }

  // ================= DELETE (SOFT) =================
  async remove(id: number) {
    await this.findOne(id);

    const deleted = await this.prisma.plan.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Plan deleted successfully',
      data: deleted,
    };
  }
}

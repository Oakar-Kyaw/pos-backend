import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreatePlanFeatureDto } from './dto/create-plan-feature.dto';
import { UpdatePlanFeatureDto } from './dto/update-plan-feature.dto';

@Injectable()
export class PlanFeatureService {
  constructor(private readonly prisma: PrismaService) {}

  // ================= CREATE =================
  async create(dto: CreatePlanFeatureDto) {
    try {
      const feature = await this.prisma.planFeature.create({
        data: {
          planId: dto.planId!,
          icon: dto.icon,
          key: dto.key,
          value: dto.value,
        },
      });

      return {
        success: true,
        message: 'Plan feature created successfully',
        data: feature,
      };
    } catch (error) {
      console.log('PlanFeature create error:', error);
      throw new ForbiddenException('Unable to create plan feature');
    }
  }

  // ================= CREATE =================
  async createInAllPlan(dtos: CreatePlanFeatureDto[]) {
    try {
      const plans = await this.prisma.plan.findMany({
        where: {
          isDeleted: false,
          isActive: true,
        },
        select: {
          id: true,
        },
      });

      // Build features for all plans × all dto features
      const featuresData: {
        planId: number;
        icon: string;
        key: string;
        value: string;
      }[] = [];

      for (const plan of plans) {
        for (const dto of dtos) {
          featuresData.push({
            planId: plan.id,
            icon: dto.icon,
            key: dto.key,
            value: dto.value,
          });
        }
      }

      await this.prisma.planFeature.createMany({
        data: featuresData,
        skipDuplicates: true,
      });

      return {
        success: true,
        message: 'Plan features created for all plans successfully',
      };
    } catch (error) {
      console.log('PlanFeature create error:', error);
      throw new ForbiddenException('Unable to create plan features');
    }
  }
  // ================= FIND ALL =================
  async findAll() {
    const features = await this.prisma.planFeature.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        plan: true, // optional: include plan details
      },
    });

    return {
      success: true,
      message: 'Plan features fetched successfully',
      data: features,
    };
  }

  // ================= FIND ONE =================
  async findOne(id: number) {
    const feature = await this.prisma.planFeature.findFirst({
      where: { id },
      include: {
        plan: true,
      },
    });

    if (!feature) {
      throw new NotFoundException('Plan feature not found');
    }

    return {
      success: true,
      message: 'Plan feature fetched successfully',
      data: feature,
    };
  }

  // ================= UPDATE =================
  async update(id: number, dto: UpdatePlanFeatureDto) {
    await this.findOne(id);

    try {
      const updated = await this.prisma.planFeature.update({
        where: { id },
        data: {
          planId: dto.planId,
          icon: dto.icon,
          key: dto.key,
          value: dto.value,
        },
      });

      return {
        success: true,
        message: 'Plan feature updated successfully',
        data: updated,
      };
    } catch (error) {
      console.log('PlanFeature update error:', error);
      throw new ForbiddenException('Unable to update plan feature');
    }
  }

  // ================= DELETE =================
  async remove(id: number) {
    await this.findOne(id);

    await this.prisma.planFeature.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Plan feature deleted successfully',
    };
  }

  // ================= CUSTOM: FIND BY PLAN =================
  async findByPlan(planId: number) {
    const features = await this.prisma.planFeature.findMany({
      where: { planId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return {
      success: true,
      message: 'Plan features by plan fetched successfully',
      data: features,
    };
  }
}

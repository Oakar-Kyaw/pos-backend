import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BrandService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(
    dto: CreateBrandDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      const brand = await this.prisma.brand.create({
        data: {
          name: dto.name,
          code: dto.code,
          description: dto.description,
          userId,
          companyId: Number(companyId),
          ...(branchId && { branchId }),
        },
      });

      return {
        success: true,
        message: 'Brand created successfully',
        data: brand,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          success: false,
          message: `Brand with name "${dto.name}" already exists`,
          data: null,
        };
      }
      throw new ForbiddenException('Unable to create brand');
    }
  }

  // FIND ALL + SEARCH BY NAME
  async findAll(userId: number, companyId: number, search?: string) {
    const brands = await this.prisma.brand.findMany({
      where: {
        isDeleted: false,
        ...(companyId && { companyId }),
        ...(search && {
          name: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      orderBy: { name: 'asc' },
    });

    console.log('brand is ', companyId, brands);

    return {
      success: true,
      message: 'Brands fetched successfully',
      data: brands,
    };
  }

  // FIND ONE
  async findOne(id: number) {
    const brand = await this.prisma.brand.findFirst({
      where: { id, isDeleted: false },
    });

    if (!brand) {
      throw new NotFoundException({
        success: false,
        message: 'Brand not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Brand fetched successfully',
      data: brand,
    };
  }

  // UPDATE
  async update(id: number, dto: UpdateBrandDto) {
    await this.findOne(id);

    const updated = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });

    return {
      success: true,
      message: 'Brand updated successfully',
      data: updated,
    };
  }

  // DELETE (Soft Delete)
  async remove(id: number) {
    await this.findOne(id);

    const deleted = await this.prisma.brand.update({
      where: { id },
      data: { isDeleted: true },
    });

    return {
      success: true,
      message: 'Brand deleted successfully',
      data: deleted,
    };
  }
}

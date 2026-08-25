import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSupplierDto, userId: number, companyId: number) {
    try {
      // Validate branch belongs to this company
      if (dto.branchId !== undefined) {
        const branch = await this.prisma.branch.findFirst({
          where: {
            id: dto.branchId,
            companyId,
          },
        });

        if (!branch) {
          throw new NotFoundException(`Branch ${dto.branchId} not found`);
        }
      }

      // Prevent duplicate supplier email inside the company
      if (dto.email) {
        const existing = await this.prisma.supplier.findFirst({
          where: {
            companyId,
            email: dto.email,
            isDeleted: false,
          },
        });

        if (existing) {
          throw new ConflictException(
            'Supplier with this email already exists',
          );
        }
      }

      const supplier = await this.prisma.supplier.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          address: dto.address,
          branchId: dto.branchId,
          companyId,
        },
      });

      return {
        success: true,
        message: 'Supplier created successfully',
        data: supplier,
      };
    } catch (error) {
      console.error('Supplier create error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to create supplier');
    }
  }

  async findAll(
    userId: number,
    companyId: number,
    branchId?: number,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      companyId,
      isDeleted: false,

      ...(branchId !== undefined && {
        branchId,
      }),

      ...(search?.trim() && {
        OR: [
          {
            name: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
          {
            email: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,

        include: {
          branch: true,
        },

        orderBy: {
          id: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.supplier.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Suppliers fetched successfully',
      data,

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================================
  // FIND BY FILTER
  // ============================================================

  async findByFilter(
    companyId: number,
    branchId: number,
    page = 1,
    limit = 20,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierWhereInput = {
      companyId,

      isDeleted: false,

      ...(branchId !== undefined && {
        branchId,
      }),

      ...(search?.trim() && {
        OR: [
          {
            name: {
              contains: search.trim(),
              mode: 'insensitive',
            },
          },
        ],
      }),
    };

    console.log('filter where:', where);
    console.log('page:', page);
    console.log('limit:', limit);
    console.log('skip:', skip);

    const [data, total] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        where,

        orderBy: {
          id: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.supplier.count({
        where,
      }),
    ]);

    return {
      success: true,
      message: 'Supplier by filter fetched successfully',

      data,

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: number,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    const supplier = await this.prisma.supplier.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,

        ...(branchId !== undefined && {
          branchId,
        }),
      },

      include: {
        branch: true,
        purchases: {
          where: {
            isDeleted: false,
          },

          orderBy: {
            id: 'desc',
          },
        },
      },
    });

    if (!supplier) {
      throw new NotFoundException({
        success: false,
        message: 'Supplier not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Supplier fetched successfully',
      data: supplier,
    };
  }

  async update(
    id: number,
    dto: UpdateSupplierDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    // Make sure supplier belongs to this company/branch
    await this.findOne(id, userId, companyId, branchId);

    // Validate new branch
    if (dto.branchId !== undefined) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          companyId,
        },
      });

      if (!branch) {
        throw new NotFoundException(`Branch ${dto.branchId} not found`);
      }
    }

    // Check duplicate email
    if (dto.email) {
      const existing = await this.prisma.supplier.findFirst({
        where: {
          companyId,
          email: dto.email,
          isDeleted: false,

          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new ConflictException('Supplier with this email already exists');
      }
    }

    const updated = await this.prisma.supplier.update({
      where: {
        id,
      },

      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),

        ...(dto.email !== undefined && {
          email: dto.email,
        }),

        ...(dto.phone !== undefined && {
          phone: dto.phone,
        }),

        ...(dto.address !== undefined && {
          address: dto.address,
        }),

        ...(dto.branchId !== undefined && {
          branchId: dto.branchId,
        }),
      },
    });

    return {
      success: true,
      message: 'Supplier updated successfully',
      data: updated,
    };
  }

  async remove(
    id: number,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    await this.findOne(id, userId, companyId, branchId);

    const deleted = await this.prisma.supplier.update({
      where: {
        id,
      },

      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: 'Supplier deleted successfully',
      data: deleted,
    };
  }
}

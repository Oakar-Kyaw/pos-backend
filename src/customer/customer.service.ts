import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'prisma/prisma.service';

import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCustomerDto, userId: number, companyId: number) {
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

      // Prevent duplicate customer email inside the company
      if (dto.email) {
        const existing = await this.prisma.customer.findFirst({
          where: {
            companyId,
            email: dto.email,
            isDeleted: false,
          },
        });

        if (existing) {
          throw new ConflictException(
            'Customer with this email already exists',
          );
        }
      }

      const customer = await this.prisma.customer.create({
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
        message: 'Customer created successfully',
        data: customer,
      };
    } catch (error) {
      console.error('Customer create error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new ForbiddenException('Unable to create customer');
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

    const where: Prisma.CustomerWhereInput = {
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
      this.prisma.customer.findMany({
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

      this.prisma.customer.count({
        where,
      }),
    ]);

    console.log('customer data: ', data, where);

    return {
      success: true,
      message: 'Customers fetched successfully',
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

    const where: Prisma.CustomerWhereInput = {
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
            phone: {
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
      this.prisma.customer.findMany({
        where,

        orderBy: {
          id: 'desc',
        },

        skip,
        take: limit,
      }),

      this.prisma.customer.count({
        where,
      }),
    ]);
    console.log('data for customer', data);
    return {
      success: true,
      message: 'Customer by filter fetched successfully',

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
    const customer = await this.prisma.customer.findFirst({
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
      },
    });

    if (!customer) {
      throw new NotFoundException({
        success: false,
        message: 'Customer not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Customer fetched successfully',
      data: customer,
    };
  }

  async update(
    id: number,
    dto: UpdateCustomerDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    // Make sure customer belongs to this company/branch
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
      const existing = await this.prisma.customer.findFirst({
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
        throw new ConflictException('Customer with this email already exists');
      }
    }

    const updated = await this.prisma.customer.update({
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
      message: 'Customer updated successfully',
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

    const deleted = await this.prisma.customer.update({
      where: {
        id,
      },

      data: {
        isDeleted: true,
      },
    });

    return {
      success: true,
      message: 'Customer deleted successfully',
      data: deleted,
    };
  }
}

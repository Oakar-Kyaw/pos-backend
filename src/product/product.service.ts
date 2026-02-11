import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(
    dto: CreateProductDto,
    userId: number,
    companyId: number,
    photoUrl?: string,
  ) {
    try {
      // console.log('dto is ', dto, companyId);
      const product = await this.prisma.product.create({
        data: {
          name: dto.name,
          code: dto.code,
          barcode: dto.barcode,
          description: dto.description,
          price: Number(dto.price),
          costPrice: Number(dto.costPrice),
          stock: Number(dto.stock) ?? 0,
          minStock: Number(dto.minStock),
          categoryId: Number(dto.categoryId),
          userId: Number(userId),
          companyId: Number(companyId),
          ...{ photoUrl },
        },
      });

      return {
        success: true,
        message: 'Product created successfully',
        data: product,
      };
    } catch (error) {
      console.log('error: ', error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          success: false,
          message: 'Product code or barcode already exists',
          data: null,
        };
      }

      throw new ForbiddenException('Unable to create product');
    }
  }

  // FIND ALL + SEARCH
  async findAll(userId: number, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      userId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      success: true,
      message: 'Products fetched successfully',
      data: products,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // FIND ONE
  async findOne(id: number, userId: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id,
        userId,
        isDeleted: false,
      },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException({
        success: false,
        message: 'Product not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Product fetched successfully',
      data: product,
    };
  }

  // UPDATE
  async update(id: number, dto: UpdateProductDto, userId: number) {
    await this.findOne(id, userId);

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        barcode: dto.barcode,
        description: dto.description,
        price: dto.price,
        costPrice: dto.costPrice,
        stock: dto.stock,
        minStock: dto.minStock,
        categoryId: dto.categoryId,
        isActive: dto.isActive,
      },
    });

    return {
      success: true,
      message: 'Product updated successfully',
      data: updated,
    };
  }

  // DELETE (SOFT DELETE)
  async remove(id: number, userId: number) {
    await this.findOne(id, userId);

    const deleted = await this.prisma.product.update({
      where: { id },
      data: {
        isDeleted: true,
        isActive: false,
      },
    });

    return {
      success: true,
      message: 'Product deleted successfully',
      data: deleted,
    };
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateInventoryDto } from './dto/create-inventory-item';

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
  async findAll(
    userId: number,
    companyId: number,
    page = 1,
    limit = 10,
    search?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      companyId,
      isDeleted: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    // If search → return all matches (no pagination)
    if (search) {
      const products = await this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { id: 'desc' },
      });

      return {
        success: true,
        message: 'Products fetched successfully',
        data: products,
        meta: {
          total: products.length,
          isSearch: true,
        },
      };
    }

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

  async createLostAndExpireItems(
    dto: CreateInventoryDto,
    userId: number,
    companyId: number,
    branchId?: number,
  ) {
    try {
      const inventory = await this.prisma.$transaction(async (tx) => {
        let totalAmount = dto.items.reduce(
          (prev, next) => prev + next.price * next.quantity,
          0,
        );
        //  Create main InventoryLoss record
        const created = await tx.inventoryManagement.create({
          data: {
            type: dto.type,
            reason: dto.reason,
            note: dto.note,
            totalAmount: totalAmount,
            userId,
            companyId,
            branchId,
          },
        });

        // Create InventoryLossItem records
        const itemsData = dto.items.map((item) => ({
          inventoryId: created.id,
          productId: item.productId,
          photoUrl: item.photoUrl,
          quantity: item.quantity,
          price: item.price,
          totalAmount: item.totalAmount,
        }));

        await tx.inventoryItem.createMany({ data: itemsData });

        return created;
      });

      return {
        success: true,
        message: 'Inventory record created successfully',
        data: inventory,
      };
    } catch (error) {
      console.error('Inventory loss creation error:', error);
      throw new ForbiddenException('Unable to create inventory loss record');
    }
  }

  async findAllInventoryManagement(
    userId: number,
    companyId: number,
    branchId: number,
    page: number,
    limit: number,
    type?: string,
  ) {
    const skip = (page - 1) * limit;

    const whereCondition: any = {
      companyId,
      isDeleted: false,
      ...(branchId && { branchId }),
    };
    //console.log('type is ', type);
    if (type === 'REQUESTED') {
      whereCondition.type = 'REQUESTED';
    } else if (type) {
      whereCondition.type = { not: 'REQUESTED' };
    }

    const [inventories, total] = await Promise.all([
      this.prisma.inventoryManagement.findMany({
        where: whereCondition,
        include: {
          user: true,
          branch: true,
          company: true,
          items: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { id: 'desc' },
        skip,
        take: limit,
      }),

      this.prisma.inventoryManagement.count({
        where: whereCondition,
      }),
    ]);
    // console.log('inver', inventories[0].items);
    return {
      success: true,
      message: 'Inventory list fetched successfully',
      data: inventories,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

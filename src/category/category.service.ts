import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE
  async create(dto: CreateCategoryDto, userId: number) {
    try {
      const category = await this.prisma.category.create({
        data: {
          title: dto.title,
          userId,
        },
      });

      return {
        success: true,
        message: 'Category created successfully',
        data: category,
      };
    } catch (error) {
      // Check if the error is unique constraint violation
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return {
          success: false,
          message: `Category with title "${dto.title}" already exists`,
          data: null,
        };
      }
      // Otherwise, throw the error
      throw new ForbiddenException('Unable to create category');
    }
  }

  // FIND ALL + SEARCH BY NAME
  async findAll(userId: number, search?: string) {
    const categories = await this.prisma.category.findMany({
      where: {
        userId,
        ...(search && {
          title: {
            contains: search,
            mode: 'insensitive',
          },
        }),
      },
      orderBy: { id: 'desc' },
    });

    return {
      success: true,
      message: 'Categories fetched successfully',
      data: categories,
    };
  }

  // FIND ONE
  async findOne(id: number) {
    const category = await this.prisma.category.findFirst({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException({
        success: false,
        message: 'Category not found',
        data: null,
      });
    }

    return {
      success: true,
      message: 'Category fetched successfully',
      data: category,
    };
  }

  // UPDATE
  async update(id: number, dto: UpdateCategoryDto) {
    await this.findOne(id);

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        title: dto.title,
      },
    });

    return {
      success: true,
      message: 'Category updated successfully',
      data: updated,
    };
  }

  // DELETE
  async remove(id: number) {
    await this.findOne(id);

    const deleted = await this.prisma.category.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'Category deleted successfully',
      data: deleted,
    };
  }
}

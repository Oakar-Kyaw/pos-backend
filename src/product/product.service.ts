import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateInventoryDto } from './dto/create-inventory-item';
import type { Cache } from 'cache-manager';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/utils/redis/redis.service';
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  // CREATE
  async create(
    dto: CreateProductDto,
    userId: number,
    companyId: number,
    photoUrl?: string,
  ) {
    try {
      // console.log('dto is ', dto, companyId);
      const product = await this.prisma.$transaction(async (tx) => {
        const data = await tx.product.create({
          data: {
            name: dto.name,
            code: dto.code,
            barcode: dto.barcode,
            description: dto.description,
            price: Number(dto.price),
            avgCostPrice: Number(dto.costPrice),
            costPrice: Number(dto.costPrice),
            memberSellingPrice: Number(dto.memberSellingPrice),
            vipSellingPrice: Number(dto.vipSellingPrice),
            vvipSellingPrice: Number(dto.vvipSellingPrice),
            stock: Number(dto.stock),
            minStock: Number(dto.minStock),
            categoryId: Number(dto.categoryId),
            userId: Number(userId),
            companyId: Number(companyId),
            ...{ photoUrl },
          },
        });

        await tx.restockLog.create({
          data: {
            restockQty: Number(dto.stock),
            costPrice: Number(dto.costPrice),
            avgCostPrice: Number(dto.costPrice),
            productId: Number(product.id),
          },
        });

        return data;
      });

      await this.invalidateProductCache(product.companyId);
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
    type ProductWithCategory = Prisma.ProductGetPayload<{
      include: {
        category: true;
      };
    }>;

    let products: ProductWithCategory[] = [];
    let total = 0;
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
    const { redisKey } = await this.getProductCacheKey({
      companyId,
      skip,
      limit,
    });
    const cachedData = await this.redis.get(redisKey);
    // If search → return all matches (no pagination)
    if (search) {
      const products = await this.prisma.product.findMany({
        where,
        include: { category: true },
        orderBy: { id: 'desc' },
        // skip,
        // take: limit,
      });

      console.log('product search is ', products);

      return {
        success: true,
        message: 'Products fetched successfully',
        data: products,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          isSearch: true,
        },
      };
    }
    // console.log('uncache data are ');
    if (!cachedData) {
      const [data, sum] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: {
            category: true,
          },
          orderBy: { name: 'asc' },
          skip,
          take: limit,
        }),
        this.prisma.product.count({ where }),
      ]);
      const cacheObject = { data, sum };

      // const bytes = Buffer.byteLength(JSON.stringify(cacheObject), 'utf8');

      // this.logger.log(`Cache Size: ${bytes} bytes`);
      // this.logger.log(`Cache Size: ${(bytes / 1024).toFixed(2)} KB`);
      // this.logger.log(`Cache Size: ${(bytes / 1024 / 1024).toFixed(2)} MB`);

      const ttl = this.configService.get<number>('REDIS_TTL')!;

      products = data;
      total = sum;

      await this.setProductCache({
        companyId,
        redisKey,
        data,
        cacheObject,
        ttl,
      });
    } else {
      this.logger.log('Cache Exist');
      //cachedData);

      products = cachedData['data'];
      total = cachedData['sum'];
      // const memory = await this.redis.getClient().memory('USAGE', redisKey);

      // if (memory !== null) {
      //   this.logger.log(`Redis Memory: ${memory} bytes`);
      //   this.logger.log(`Redis Memory: ${(memory / 1024).toFixed(2)} KB`);
      //   this.logger.log(
      //     `Redis Memory: ${(memory / 1024 / 1024).toFixed(2)} MB`,
      //   );
      // } else {
      //   this.logger.log('Key does not exist in Redis.');
      // }
    }
    // console.log('product are ', products);
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

  // FIND ONE
  async findByBarcode(companyId: number, barcode: string) {
    console.log('barcode find: ', barcode, companyId);
    const product = await this.prisma.product.findFirst({
      where: {
        companyId,
        isDeleted: false,
        barcode,
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
    console.log('product is ', product);

    return {
      success: true,
      message: 'Product by barcode fetched successfully',
      data: product,
    };
  }

  // UPDATE
  async update(
    id: number,
    dto: UpdateProductDto,
    userId: number,
    companyId: number,
    photoUrl?: string,
  ) {
    const oldData = await this.findOne(id, userId);

    const updated = await this.prisma.$transaction(async (tx) => {
      const data = await tx.product.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code,
          barcode: dto.barcode,
          description: dto.description,
          price: Number(dto.price),
          avgCostPrice: Number(dto.costPrice),
          costPrice: Number(dto.costPrice),
          memberSellingPrice: Number(dto.memberSellingPrice),
          vipSellingPrice: Number(dto.vipSellingPrice),
          vvipSellingPrice: Number(dto.vvipSellingPrice),
          stock: dto.stock,
          minStock: dto.minStock,
          categoryId: dto.categoryId,
          isActive: dto.isActive,
          ...{ photoUrl },
        },
      });

      const user = await tx.user.findUnique({
        where: { id: Number(userId) },
      });

      // ==============================================
      // BUILD CHANGE LOG — old value != new value ဖြစ်မှသာ ထည့်
      // ==============================================
      const old = oldData.data;
      const changes: string[] = [];

      const track = (label: string, oldVal: any, newVal: any) => {
        const oldStr = oldVal?.toString?.() ?? String(oldVal);
        const newStr = newVal?.toString?.() ?? String(newVal);
        if (oldStr !== newStr) {
          changes.push(`${label}: ${oldStr} → ${newStr}`);
        }
      };

      track('name', old.name, data.name);
      track('code', old.code, data.code);
      track('barcode', old.barcode, data.barcode);
      track('price', old.price, data.price);
      track('costPrice', old.costPrice, data.costPrice);
      track('avgCostPrice', old.avgCostPrice, data.avgCostPrice);
      track(
        'memberSellingPrice',
        old.memberSellingPrice,
        data.memberSellingPrice,
      );
      track('vipSellingPrice', old.vipSellingPrice, data.vipSellingPrice);
      track('vvipSellingPrice', old.vvipSellingPrice, data.vvipSellingPrice);
      track('stock', old.stock, data.stock);
      track('minStock', old.minStock, data.minStock);
      track('categoryId', old.categoryId, data.categoryId);
      track('isActive', old.isActive, data.isActive);

      const description =
        changes.length > 0 ? changes.join('\n') : 'No field changes detected';

      await tx.auditLogs.create({
        data: {
          title: `Product Updated: ${user?.email ?? 'Unknown'}`,
          description,
          userId: Number(userId),
        },
      });

      return data;
    });

    await this.patchProductInCache({
      companyId: oldData.data.companyId,
      updatedProduct: updated,
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
    await this.invalidateProductCache(deleted.companyId);
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
      console.log('item', dto.items);
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
            totalAmount,
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
          costPrice: item.costPrice,
          avgCostPrice: item.avgCostPrice,
        }));

        await tx.inventoryItem.createMany({ data: itemsData });

        //only reduce stock when the inventoryType is Expire, Damage
        if (dto.type === 'DAMAGED' || dto.type === 'EXPIRED') {
          // ======================================================
          // REDUCED STOCK
          // ======================================================
          const values = Prisma.join(
            dto.items.map(
              (pr) => Prisma.sql`(${pr.productId}::int, ${pr.quantity}::int)`,
            ),
            ',',
          );

          await tx.$executeRaw`
              UPDATE "Product" AS p
              SET
                 "stock" = p."stock" - v.qty
                FROM (VALUES ${values}) AS v(id, qty)
              WHERE p.id = v.id
            `;
        }
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
    startDate?: Date,
    endDate?: Date,
  ) {
    const skip = (page - 1) * limit;
    const today = new Date();
    endDate = endDate ? new Date(endDate) : today;

    // If startDate is after endDate, reset startDate to endDate
    if (startDate && startDate > endDate) {
      startDate = endDate;
    }
    const where: any = {
      companyId,
      isDeleted: false,
      ...(branchId && { branchId }),
      ...(userId && { userId }),
    };

    if (startDate && endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && {
          lt: new Date(endDate.getTime() + 24 * 60 * 60 * 1000),
        }),
      };
    }
    //console.log('type is ', type);
    if (type === 'REQUESTED') {
      where.type = 'REQUESTED';
    } else if (type) {
      where.type = { not: 'REQUESTED' };
    }

    const [inventories, total] = await Promise.all([
      this.prisma.inventoryManagement.findMany({
        where,
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
        where: where,
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

  async deleteInventoryManagement(id: number) {
    console.log('id is ', id);
    const deleted = await this.prisma.$transaction(async (tx) => {
      const data = await tx.inventoryManagement.update({
        where: { id },
        data: {
          isDeleted: true,
        },
        include: {
          items: true,
        },
      });
      //only add restock when the inventoryType is Expire, Damage
      if (data.type === 'DAMAGED' || data.type === 'EXPIRED') {
        // ======================================================
        // ADD STOCK
        // ======================================================
        const values = Prisma.join(
          data.items.map(
            (pr) => Prisma.sql`(${pr.productId}::int, ${pr.quantity}::int)`,
          ),
          ',',
        );

        await tx.$executeRaw`
              UPDATE "Product" AS p
              SET
                 "stock" = p."stock" + v.qty
                FROM (VALUES ${values}) AS v(id, qty)
              WHERE p.id = v.id
            `;
      }
      return data;
    });

    return {
      success: true,
      message: 'Product deleted successfully',
      data: deleted,
    };
  }

  async getProductCacheKey({
    companyId,
    skip,
    limit,
  }: {
    companyId: number;
    skip: number;
    limit: number;
  }): Promise<{
    redisProductCacheKey: string;
    redisProductCacheVersion: number;
    redisKey: string;
  }> {
    const redisProductCacheKey = `product:version:${companyId}`;

    const redisProductCacheVersion =
      await this.redis.getVersion(redisProductCacheKey);

    const redisKey = `product:${companyId}:v${redisProductCacheVersion}:${skip}:${limit}:all`;
    return { redisProductCacheKey, redisProductCacheVersion, redisKey };
  }

  async setProductCache({
    companyId,
    redisKey,
    cacheObject,
    data,
    ttl,
  }: {
    companyId: number;
    redisKey: string;
    cacheObject: any;
    data: Prisma.ProductWhereInput[];
    ttl?: number;
  }) {
    await this.redis.set(redisKey, cacheObject, ttl);
    //await this.redis.increaseVersionNumber(redisProductCacheKey);

    const redisPipeline = this.redis.getClient().pipeline();
    //console.log('redis pipeline is ', redisPipeline);
    console.log(
      '🔧 Pipeline ဆောက်နေတယ်... product id တစ်ခုချင်းစီအတွက် command ထည့်နေတယ်',
    );
    for (const product of data) {
      const indexKey = `product:${companyId}:page-index:${product.id}`;
      redisPipeline.sadd(indexKey, redisKey);
      redisPipeline.expire(indexKey, String(ttl));
      console.log(
        `   ➕ Pipeline ထဲကို ထည့်လိုက်တယ်: SADD ${indexKey} ${redisKey}`,
      );
    }
    await redisPipeline.exec();
    console.log(
      '🚀 Pipeline ကို Redis ဆီ တစ်ကြိမ်တည်း ပို့လိုက်ပြီ (command 4 ခု, round-trip 1 ခုတည်း)',
    );
  }

  async patchProductInCache({
    companyId,
    updatedProduct,
  }: {
    companyId: number;
    updatedProduct: any;
  }) {
    const indexKey = `product:${companyId}:page-index:${updatedProduct.id}`;
    console.log(`🔍 ရှာမယ့် index key: ${indexKey}`);
    // Output: 🔍 ရှာမယ့် index key: product:11:page-index:8

    const redisClient = this.redis.getClient();
    const cacheKeys: string[] = await redisClient.smembers(indexKey);
    console.log(
      `📋 Product id ${updatedProduct.id} ရှိတဲ့ page key(များ):`,
      cacheKeys,
    );
    // Output: 📋 Product id 8 ရှိတဲ့ page key(များ): [ 'product:11:v1:0:20' ]

    if (cacheKeys.length === 0) {
      console.log('ဘယ် page မှာမှ cache မရှိသေးဘူး → ဘာမှမလုပ်ဘဲ ရပ်လိုက်တယ်');
      return;
    }

    for (const key of cacheKeys) {
      const cached = await this.redis.get(key);

      if (!cached) {
        console.log(`⚠️ Key "${key}" ရဲ့ TTL ကုန်သွားပြီ → ကျော်လိုက်တယ်`);
        continue;
      }

      console.log(
        `📂 "${key}" ကို ဖွင့်လိုက်တယ်, အရင် data:`,
        cached['data'].map((p) => ({ id: p.id })),
      );
      // Output: 📂 "product:11:v1:0:20" ကို ဖွင့်လိုက်တယ်, အရင် data: [ { id: 8, price: 2000 }, { id: 7, price: 400 } ]

      const idx = cached['data'].findIndex((p) => p.id === updatedProduct.id);
      console.log(
        `   ↳ Product id ${updatedProduct.id} ကို array index [${idx}] မှာ တွေ့တယ်`,
      );
      // Output:    ↳ Product id 8 ကို array index [0] မှာ တွေ့တယ်

      if (idx === -1) continue;

      cached['data'][idx] = updatedProduct;
      console.log(
        `✏️ Array ထဲက [${idx}] ကို price အသစ်နဲ့ အစားထိုးပြီး:`,
        cached['data'].map((p) => ({ id: p.id, ...p })),
      );
      // Output: ✏️ Array ထဲက [0] ကို price အသစ်နဲ့ အစားထိုးပြီး: [ { id: 8, price: 2500 }, { id: 7, price: 400 } ]

      await this.redis.set(
        key,
        cached,
        this.configService.get<number>('REDIS_TTL'),
      );
      console.log(
        `💾 "${key}" ကို ပြန် save လုပ်ပြီး — page 2, 3, 4... တို့ကို လုံးဝ မထိခဲ့ဘူး`,
      );
      // Output: 💾 "product:11:v1:0:20" ကို ပြန် save လုပ်ပြီး — page 2, 3, 4... တို့ကို လုံးဝ မထိခဲ့ဘူး
    }
  }

  async invalidateProductCache(companyId: number) {
    const redisProductCacheKey = `product:version:${companyId}`;

    const current = await this.redis.getVersion(redisProductCacheKey);
    console.log(`🔢 လက်ရှိ version: ${current}`);
    // Output: 🔢 လက်ရှိ version: 1

    const next = await this.redis.increaseVersionNumber(redisProductCacheKey);
    console.log(`⬆️ Version ကို ${current} → ${next} tick up လုပ်လိုက်ပြီ`);
    // Output: ⬆️ Version ကို 1 → 2 tick up လုပ်လိုက်ပြီ

    console.log(
      '👻 old key "product:11:v1:0:20" ကတော့ Redis ထဲမှာ ရုပ်ပျောက်တစ်ခုလို ကျန်နေတယ် (orphan) — ဘယ်သူမှ ရှာမတွေ့တော့ဘူး',
    );
  }
}

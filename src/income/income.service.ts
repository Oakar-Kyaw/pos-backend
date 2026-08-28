import { Injectable } from '@nestjs/common';
import { CreateIncomeDto } from './dto/create-income.dto';
import { UpdateIncomeDto } from './dto/update-income.dto';
import { PrismaService } from 'prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}
  create(createIncomeDto: CreateIncomeDto) {
    return 'This action adds a new income';
  }

  async findAll(
    userId: number,
    companyId: number,
    branchId: number,
    date?: string,
  ) {
    const now = date ? new Date(date) : new Date();
    const startOfDay = new Date(
      Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
    );
    const endOfDay = new Date(
      Date.UTC(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999,
      ),
    );
    console.log('now', now, endOfDay);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startYear = new Date(now.getFullYear(), 0, 1);
    const endYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    // console.log(startYear, endYear, thisMonth);
    const yearlySale = await this.getTotalByDateAndBranchAndCompany(
      companyId,
      branchId,
      startYear,
      endYear,
    );

    const monthlySale = await this.getTotalByDateAndBranchAndCompany(
      companyId,
      branchId,
      thisMonth,
      now,
    );

    const getMonthByMonth = await this.getMonthlyTotals(
      companyId,
      branchId,
      startYear,
      endYear,
    );

    const getTodaySale = await this.getTotalByDateAndBranchAndCompany(
      companyId,
      branchId,
      startOfDay,
      endOfDay,
    );

    const mostSellingItem = await this.mostSellingItem(
      companyId,
      branchId,
      startYear,
      endYear,
    );

    const leastSellingItem = await this.leastSellingItem(
      companyId,
      branchId,
      startYear,
      endYear,
    );

    const getMonthlyTopSaleUser = await this.getMonthlyTopSaleUser(
      companyId,
      branchId,
      startYear,
      endYear,
    );

    return {
      success: true,
      message: 'Get all income data',
      data: {
        yearlySale: {
          total: yearlySale[0].total,
          tax: yearlySale[0].tax,
          deliveryFee: yearlySale[0].deliveryFee,
          subTotal: yearlySale[0].subTotal,
        },
        monthlySale: {
          total: monthlySale[0].total,
          tax: monthlySale[0].tax,
          deliveryFee: monthlySale[0].deliveryFee,
          subTotal: monthlySale[0].subTotal,
        },
        mostSellingItem,
        leastSellingItem,
        getMonthByMonth,
        getMonthlyTopSaleUser,
        getTodaySale: getTodaySale[0],
      },
    };
  }

  findOne(id: number) {
    return `This action returns a #${id} income`;
  }

  update(id: number, updateIncomeDto: UpdateIncomeDto) {
    return `This action updates a #${id} income`;
  }

  remove(id: number) {
    return `This action removes a #${id} income`;
  }

  async getTotalByDateAndBranchAndCompany(
    companyId: number,
    branchId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const total: [
      { total: number; deliveryFee: number; tax: number; subTotal: number },
    ] = await this.prisma.$queryRaw(
      Prisma.sql`
      SELECT
        COALESCE(SUM("total"), 0) AS "total",
        COALESCE(SUM("deliveryFee"), 0) AS "deliveryFee",
        COALESCE(SUM("tax"), 0) AS "tax",
        COALESCE(SUM("subTotal"), 0) AS "subTotal"
        
      FROM "Voucher"
      WHERE "companyId" = ${companyId} 
        AND "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
    `,
    );

    console.log('total is', total);
    return total;
  }
  async mostSellingItem(
    companyId: number,
    branchId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const result: {
      itemId: number;
      name: string;
      totalQuantity: bigint;
    }[] = await this.prisma.$queryRaw(
      Prisma.sql`
      SELECT
        vi."itemId",
        vi."name",
        SUM(vi."quantity") AS "totalQuantity"
      FROM "VoucherItem" vi
      INNER JOIN "Voucher" v ON vi."voucherId" = v."id"
      WHERE v."companyId" = ${companyId}
        AND v."isDeleted" = false
        ${branchId ? Prisma.sql`AND v."branchId" = ${branchId}` : Prisma.empty}
        ${startDate ? Prisma.sql`AND v."createdAt" >= ${startDate}` : Prisma.empty}
        ${endDate ? Prisma.sql`AND v."createdAt" < ${endDate}` : Prisma.empty}
      GROUP BY vi."itemId", vi."name"
      ORDER BY "totalQuantity" DESC
      LIMIT 10
    `,
    );

    // Convert BigInt → number
    return result.map((item) => ({
      ...item,
      totalQuantity: Number(item.totalQuantity),
    }));
  }
  async leastSellingItem(
    companyId: number,
    branchId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    console.log('sdate is ', startDate, endDate, companyId);
    const result: {
      itemId: number;
      name: string;
      totalQuantity: bigint;
    }[] = await this.prisma.$queryRaw(
      Prisma.sql`
      SELECT
        p."id" AS itemId,
        p."name",
        COALESCE(SUM(
          CASE 
            WHEN v."id" IS NOT NULL
              ${branchId ? Prisma.sql`AND v."branchId" = ${branchId}` : Prisma.empty}
              ${startDate ? Prisma.sql`AND v."createdAt" >= ${startDate}` : Prisma.empty}
              ${endDate ? Prisma.sql`AND v."createdAt" < ${endDate}` : Prisma.empty}
            THEN  vi."quantity"
            ELSE 0
          END
        ), 0) AS "totalQuantity"
      FROM "Product" p
      LEFT JOIN "VoucherItem" vi
          ON p."id" = vi."itemId"
      LEFT JOIN "Voucher" v ON vi."voucherId" = v."id"
        AND v."isDeleted" = false
      WHERE p."companyId" = ${companyId}
      GROUP BY p."id", p."name"
      ORDER BY "totalQuantity" ASC
      LIMIT 10
    `,
    );
    console.log(result);
    // Convert BigInt → number
    return result.map((item) => ({
      ...item,
      totalQuantity: Number(item.totalQuantity),
    }));
  }

  async getMonthlyTotals(
    companyId: number,
    branchId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const totals: {
      month: number;
      total: number;
      deliveryFee: number;
      tax: number;
      subTotal: number;
    }[] = await this.prisma.$queryRaw(
      Prisma.sql`
      SELECT
        EXTRACT(MONTH FROM "createdAt") AS month,
        COALESCE(SUM("total"), 0) AS "total",
        COALESCE(SUM("deliveryFee"), 0) AS "deliveryFee",
        COALESCE(SUM("tax"), 0) AS "tax",
        COALESCE(SUM("subTotal"), 0) AS "subTotal"
      FROM "Voucher"
      WHERE "companyId" = ${companyId}
        AND "createdAt" >= ${startDate}
        AND "createdAt" < ${endDate}
        ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
      GROUP BY month
      ORDER BY month ASC
    `,
    );

    return totals;
  }

  async getMonthlyTopSaleUser(
    companyId: number,
    branchId?: number,
    startDate?: Date,
    endDate?: Date,
  ) {
    const totals: {
      month: number;
      total: number;
      deliveryFee: number;
      tax: number;
      subTotal: number;
    }[] = await this.prisma.$queryRaw(
      Prisma.sql`
      SELECT
        u."firstName" as saleFirstName,
        u."lastName" as saleLastName,
        u."email" as saleEmail,
        u."id" as saleUserId,
        COALESCE(SUM("total"), 0) AS "total",
        COALESCE(SUM("deliveryFee"), 0) AS "deliveryFee",
        COALESCE(SUM("tax"), 0) AS "tax",
        COALESCE(SUM("subTotal"), 0) AS "subTotal"
      FROM "User" u
      LEFT JOIN "Voucher" v ON v."userId" = u."id"
        WHERE v."companyId" = ${companyId}
          AND v."createdAt" >= ${startDate}
          AND v."createdAt" < ${endDate}
        ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
      GROUP BY saleUserId, saleEmail
      ORDER BY total DESC
      LIMIT 10
    `,
    );

    return totals;
  }
}

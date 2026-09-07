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
    // console.log('now', now, endOfDay);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisEndMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
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
      thisEndMonth,
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
    const data = {
      yearlySale: {
        total: yearlySale[0].total,
        tax: yearlySale[0].tax,
        deliveryFee: yearlySale[0].deliveryFee,
        subTotal: yearlySale[0].subTotal,
        packagingFee: yearlySale[0].packagingFee,
        discountAmount: yearlySale[0].discountAmount,
        discountPercent: yearlySale[0].discountPercent,
      },
      monthlySale: {
        total: monthlySale[0].total,
        tax: monthlySale[0].tax,
        deliveryFee: monthlySale[0].deliveryFee,
        subTotal: monthlySale[0].subTotal,
        packagingFee: monthlySale[0].packagingFee,
        discountAmount: monthlySale[0].discountAmount,
        discountPercent: monthlySale[0].discountPercent,
      },
      mostSellingItem,
      leastSellingItem,
      getMonthByMonth,
      getMonthlyTopSaleUser,
      getTodaySale: getTodaySale[0],
    };
    console.log('get dta sale is ', getMonthByMonth);
    return {
      success: true,
      message: 'Get all income data',
      data,
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
    const branchCondition = branchId
      ? Prisma.sql`AND "branchId" = ${branchId}`
      : Prisma.empty;

    const refundSql = Prisma.sql`COALESCE(( SELECT SUM(r."amount")
        FROM "Refund" r
        WHERE r."companyId" = ${companyId}
          AND r."date" >= ${startDate}
          AND r."date" < ${endDate}
          AND r."isDeleted" = FALSE
          ${branchCondition}
          ),0)`;

    const expenseSql = Prisma.sql`COALESCE((
          SELECT SUM(g."amount")
          FROM "GeneralExpense" g
          WHERE g."companyId" = ${companyId}
            AND g."date" >= ${startDate}
            AND g."date" < ${endDate}
            AND g."isDeleted" = FALSE
            ${branchCondition}
      ), 0) `;

    const purchaseSql = Prisma.sql`COALESCE((
          SELECT SUM(p."totalAmount")
          FROM "Purchase" p
          WHERE p."companyId" = ${companyId}
            AND p."receivedDate" >= ${startDate}
            AND p."receivedDate" < ${endDate}
            AND p."isDeleted" = FALSE
            ${branchCondition}
      ), 0)`;

    const total: [
      {
        total: number;
        deliveryFee: number;
        tax: number;
        subTotal: number;
        packagingFee: number;
        discountAmount: number;
        discountPercent: number;
        refundAmount: number;
        debtAmount: number;
        expenseAmount: number;
        purchaseAmount: number;
        netIncome: number;
      },
    ] = await this.prisma.$queryRaw(
      Prisma.sql`
      SELECT
        COALESCE(SUM(v."totalPaymentAmount"), 0)
          - ${refundSql}
          - ${expenseSql}
          - ${purchaseSql}
          AS "netIncome",

         ${refundSql} AS "refundAmount",

         ${expenseSql}AS "expenseAmount",

         ${purchaseSql} AS "purchaseAmount",

        COALESCE(SUM(v."total"), 0) AS "total",
        COALESCE(SUM(v."deliveryFee"), 0) AS "deliveryFee",
        COALESCE(SUM(v."packagingFee"), 0 ) AS "packagingFee",
        COALESCE(SUM(v."discountAmount"), 0 ) AS "discountAmount",
        COALESCE(SUM(v."discountPercent"), 0 ) AS "discountPercent",
        COALESCE(SUM(v."totalPaymentAmount"), 0 ) AS "totalPaymentAmount",
        COALESCE(SUM(v."remainingPaymentAmount"), 0 ) AS "debtAmount",
        COALESCE(SUM(v."tax"), 0) AS "tax",
        COALESCE(SUM(v."subTotal"), 0) AS "subTotal"
      
      FROM "Voucher" v
      WHERE v."companyId" = ${companyId} 
        AND v."createdAt" >= ${startDate}
        AND v."createdAt" < ${endDate}
        AND v."isDeleted" = FALSE
        ${branchCondition}
    `,
    );

    // console.log('total is', total);
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
    // console.log('sdate is ', startDate, endDate, companyId);
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
    // console.log(result);
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
    const voucherBranchCondition = branchId
      ? Prisma.sql`AND v."branchId" = ${branchId}`
      : Prisma.empty;

    const refundBranchCondition = branchId
      ? Prisma.sql`AND r."branchId" = ${branchId}`
      : Prisma.empty;

    const expenseBranchCondition = branchId
      ? Prisma.sql`AND e."branchId" = ${branchId}`
      : Prisma.empty;

    const purchaseBranchCondition = branchId
      ? Prisma.sql`AND p."branchId" = ${branchId}`
      : Prisma.empty;

    const totals = await this.prisma.$queryRaw<
      {
        month: number;
        total: number;
        totalPaymentAmount: number;
        refundAmount: number;
        expenseAmount: number;
        purchaseAmount: number;
        netIncome: number;
        deliveryFee: number;
        packagingFee: number;
        discountAmount: number;
        discountPercent: number;
        tax: number;
        subTotal: number;
      }[]
    >(
      Prisma.sql`
      SELECT
        v.month,

        -- Sales
        v."total",

        v."totalPaymentAmount",

        -- Refund
        COALESCE(r."refundAmount", 0) AS "refundAmount",

        -- Expense
        COALESCE(e."expenseAmount", 0) AS "expenseAmount",

        -- Purchase
        COALESCE(p."purchaseAmount", 0) AS "purchaseAmount",

        -- Net Income
        v."totalPaymentAmount"
          - COALESCE(r."refundAmount", 0)
          - COALESCE(e."expenseAmount", 0)
          - COALESCE(p."purchaseAmount", 0)
          AS "netIncome",

        -- Sales details
        v."deliveryFee",
        v."packagingFee",
        v."discountAmount",
        v."discountPercent",
        v."tax",
        v."subTotal"

      FROM (
        -- ==========================================
        -- VOUCHER / SALES
        -- ==========================================
        SELECT
          EXTRACT(MONTH FROM v."createdAt")::int AS month,

          COALESCE(SUM(v."total"), 0) AS "total",

          COALESCE(SUM(v."totalPaymentAmount"), 0)
            AS "totalPaymentAmount",

          COALESCE(SUM(v."deliveryFee"), 0)
            AS "deliveryFee",

          COALESCE(SUM(v."packagingFee"), 0)
            AS "packagingFee",

          COALESCE(SUM(v."discountAmount"), 0)
            AS "discountAmount",

          COALESCE(SUM(v."discountPercent"), 0)
            AS "discountPercent",

          COALESCE(SUM(v."tax"), 0)
            AS "tax",

          COALESCE(SUM(v."subTotal"), 0)
            AS "subTotal"

        FROM "Voucher" v

        WHERE v."companyId" = ${companyId}
          AND v."createdAt" >= ${startDate}
          AND v."createdAt" < ${endDate}
          AND v."isDeleted" = FALSE
          ${voucherBranchCondition}

        GROUP BY EXTRACT(MONTH FROM v."createdAt")
      ) v

      -- ==========================================
      -- REFUND
      -- ==========================================
      LEFT JOIN (
        SELECT
          EXTRACT(MONTH FROM r."date")::int AS month,

          COALESCE(SUM(r."amount"), 0)
            AS "refundAmount"

        FROM "Refund" r

        WHERE r."companyId" = ${companyId}
          AND r."date" >= ${startDate}
          AND r."date" < ${endDate}
          AND r."isDeleted" = FALSE
          ${refundBranchCondition}

        GROUP BY EXTRACT(MONTH FROM r."date")
      ) r

        ON v.month = r.month

      -- ==========================================
      -- EXPENSE
      -- ==========================================
      LEFT JOIN (
        SELECT
          EXTRACT(MONTH FROM e."date")::int AS month,

          COALESCE(SUM(e."amount"), 0)
            AS "expenseAmount"

        FROM "GeneralExpense" e

        WHERE e."companyId" = ${companyId}
          AND e."date" >= ${startDate}
          AND e."date" < ${endDate}
          AND e."isDeleted" = FALSE
          ${expenseBranchCondition}

        GROUP BY EXTRACT(MONTH FROM e."date")
      ) e

        ON v.month = e.month

      -- ==========================================
      -- PURCHASE
      -- ==========================================
      LEFT JOIN (
        SELECT
          EXTRACT(MONTH FROM p."receivedDate")::int AS month,

          COALESCE(SUM(p."totalAmount"), 0)
            AS "purchaseAmount"

        FROM "Purchase" p

        WHERE p."companyId" = ${companyId}
          AND p."receivedDate" >= ${startDate}
          AND p."receivedDate" < ${endDate}
          AND p."isDeleted" = FALSE
          ${purchaseBranchCondition}

        GROUP BY EXTRACT(MONTH FROM p."receivedDate")
      ) p

        ON v.month = p.month

      ORDER BY v.month ASC
    `,
    );

    return totals;
  }

  // async getMonthlyTotals(
  //   companyId: number,
  //   branchId?: number,
  //   startDate?: Date,
  //   endDate?: Date,
  // ) {
  //   const voucherBranchCondition = branchId
  //     ? Prisma.sql`AND v."branchId" = ${branchId}`
  //     : Prisma.empty;

  //   const refundBranchCondition = branchId
  //     ? Prisma.sql`AND r."branchId" = ${branchId}`
  //     : Prisma.empty;

  //   const totals = await this.prisma.$queryRaw<
  //     {
  //       month: number;
  //       total: number;
  //       deliveryFee: number;
  //       packagingFee: number;
  //       discountAmount: number;
  //       discountPercent: number;
  //       tax: number;
  //       subTotal: number;
  //     }[]
  //   >(
  //     Prisma.sql`
  //   SELECT
  //     v.month,

  //     v.total - COALESCE(r."refundAmount", 0) AS "total",

  //     v."deliveryFee",
  //     v."packagingFee",
  //     v."discountAmount",
  //     v."discountPercent",
  //     v.tax,

  //     v."subTotal" - COALESCE(r."refundAmount", 0) AS "subTotal"

  //   FROM (
  //     SELECT
  //       EXTRACT(MONTH FROM "createdAt")::int AS month,

  //       COALESCE(SUM("total"), 0) AS total,
  //       COALESCE(SUM("deliveryFee"), 0) AS "deliveryFee",
  //       COALESCE(SUM("packagingFee"), 0) AS "packagingFee",
  //       COALESCE(SUM("discountAmount"), 0) AS "discountAmount",
  //       COALESCE(SUM("discountPercent"), 0) AS "discountPercent",
  //       COALESCE(SUM("tax"), 0) AS tax,
  //       COALESCE(SUM("subTotal"), 0) AS "subTotal"

  //     FROM "Voucher" v

  //     WHERE v."companyId" = ${companyId}
  //       AND v."createdAt" >= ${startDate}
  //       AND v."createdAt" < ${endDate}
  //       AND v."isDeleted" = FALSE
  //       ${voucherBranchCondition}

  //     GROUP BY EXTRACT(MONTH FROM v."createdAt")
  //   ) v

  //   LEFT JOIN (
  //     SELECT
  //       EXTRACT(MONTH FROM r."date")::int AS month,
  //       COALESCE(SUM(r."amount"), 0) AS "refundAmount"

  //     FROM "Refund" r

  //     WHERE r."companyId" = ${companyId}
  //       AND r."date" >= ${startDate}
  //       AND r."date" < ${endDate}
  //       AND r."isDeleted" = FALSE
  //       ${refundBranchCondition}

  //     GROUP BY EXTRACT(MONTH FROM r."date")
  //   ) r

  //   ON v.month = r.month

  //   ORDER BY v.month ASC
  // `,
  //   );
  //   // console.log('toatl of monthy', totals);
  //   return totals;
  // }
  // async getMonthlyTotals(
  //   companyId: number,
  //   branchId?: number,
  //   startDate?: Date,
  //   endDate?: Date,
  // ) {
  //   const branchCondition = branchId
  //     ? Prisma.sql`AND "branchId" = ${branchId}`
  //     : Prisma.empty;
  //   const totals: {
  //     month: number;
  //     total: number;
  //     deliveryFee: number;
  //     tax: number;
  //     subTotal: number;
  //   }[] = await this.prisma.$queryRaw(
  //     Prisma.sql`
  //     SELECT
  //       EXTRACT(MONTH FROM "createdAt") AS month,
  //       COALESCE(SUM("total"), 0)
  //       - COALESCE(( SELECT
  //        EXTRACT(MONTH FROM "date") AS month,
  //       SUM(r."amount")
  //       FROM "Refund" r
  //       WHERE r."companyId" = ${companyId}
  //         AND r."date" >= ${startDate}
  //         AND r."date" < ${endDate}
  //         AND r."isDeleted" = FALSE
  //         ${branchCondition}
  //         GROUP BY month
  //         ORDER BY month ASC
  //         ),0)
  //        AS "total",
  //       COALESCE(SUM("deliveryFee"), 0) AS "deliveryFee",
  //       COALESCE(SUM("packagingFee"), 0) AS "packagingFee",
  //       COALESCE(SUM("discountAmount"), 0) AS "discountAmount",
  //       COALESCE(SUM("discountPercent"), 0) AS "discountPercent",
  //       COALESCE(SUM("tax"), 0) AS "tax",
  //       COALESCE(SUM("subTotal"), 0) AS "subTotal"
  //     FROM "Voucher"
  //     WHERE "companyId" = ${companyId}
  //       AND "createdAt" >= ${startDate}
  //       AND "createdAt" < ${endDate}
  //       AND "isDeleted" = FALSE
  //        ${branchCondition}
  //     GROUP BY month
  //     ORDER BY month ASC
  //   `,
  //   );

  //   return totals;
  // }

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
        u."phone" as phone,
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
          AND v."isDeleted" = false
        ${branchId ? Prisma.sql`AND "branchId" = ${branchId}` : Prisma.empty}
      GROUP BY saleUserId, saleEmail
      ORDER BY total DESC
    `,
    );

    return totals;
  }
}

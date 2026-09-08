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
        refundAmount: yearlySale[0].refundAmount,
        debtAmount: yearlySale[0].debtAmount,
        expenseAmount: yearlySale[0].expenseAmount,
        purchaseAmount: yearlySale[0].purchaseAmount,
        netIncome: yearlySale[0].netIncome,
        openingAmount: yearlySale[0].openingAmount,
        totalPaymentAmount: yearlySale[0].paymentIn,
        transferAmount: yearlySale[0].transferAmount,
      },
      monthlySale: {
        total: monthlySale[0].total,
        tax: monthlySale[0].tax,
        deliveryFee: monthlySale[0].deliveryFee,
        subTotal: monthlySale[0].subTotal,
        packagingFee: monthlySale[0].packagingFee,
        discountAmount: monthlySale[0].discountAmount,
        discountPercent: monthlySale[0].discountPercent,
        refundAmount: monthlySale[0].refundAmount,
        debtAmount: monthlySale[0].debtAmount,
        expenseAmount: monthlySale[0].expenseAmount,
        purchaseAmount: monthlySale[0].purchaseAmount,
        netIncome: monthlySale[0].netIncome,
        openingAmount: monthlySale[0].openingAmount,
        totalPaymentAmount: monthlySale[0].paymentIn,
        transferAmount: monthlySale[0].transferAmount,
      },
      mostSellingItem,
      leastSellingItem,
      getMonthByMonth,
      getMonthlyTopSaleUser,
      getTodaySale: getTodaySale[0],
    };
    console.log('get dta sale is ', data);
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

  async profitandloss(
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
    return {
      success: true,
      message: 'Get all Profit and Loss',
    };
  }

  async getTotalByDateAndBranchAndCompany(
    companyId: number,
    branchId: number,
    startDate: Date,
    endDate: Date,
  ) {
    const voucherBranch = branchId
      ? Prisma.sql`AND v."branchId" = ${branchId}`
      : Prisma.empty;
    const purchaseBranch = branchId
      ? Prisma.sql`AND pu."branchId" = ${branchId}`
      : Prisma.empty;
    const expenseBranch = branchId
      ? Prisma.sql`AND ge."branchId" = ${branchId}`
      : Prisma.empty;
    const refundBranch = branchId
      ? Prisma.sql`AND rf."branchId" = ${branchId}`
      : Prisma.empty;
    const repayBranch = branchId
      ? Prisma.sql`AND r."branchId" = ${branchId}`
      : Prisma.empty;

    const paymentInSql = Prisma.sql`COALESCE((
    SELECT SUM(p."amount")
    FROM "Payment" p
    INNER JOIN "Voucher" v ON p."voucherId" = v."id"
    WHERE v."companyId" = ${companyId}
      AND v."isDeleted" = FALSE
      AND p."createdAt" >= ${startDate}
      AND p."createdAt" < ${endDate}
      ${voucherBranch}
  ), 0)`;

    const repayInSql = Prisma.sql`COALESCE((
    SELECT SUM(r."amount")
    FROM "Repay" r
    WHERE r."companyId" = ${companyId}
      AND r."createdAt" >= ${startDate}
      AND r."createdAt" < ${endDate}
      ${repayBranch}
  ), 0)`;

    const refundOutSql = Prisma.sql`COALESCE((
    SELECT SUM(rp."amount")
    FROM "RefundPayment" rp
    INNER JOIN "Refund" rf ON rp."refundId" = rf."id"
    WHERE rf."companyId" = ${companyId}
      AND rf."isDeleted" = FALSE
      AND rp."createdAt" >= ${startDate}
      AND rp."createdAt" < ${endDate}
      ${refundBranch}
  ), 0)`;

    const purchaseOutSql = Prisma.sql`COALESCE((
    SELECT SUM(pu."totalAmount")
    FROM "Purchase" pu 
    WHERE pu."companyId" = ${companyId}
      AND pu."isDeleted" = FALSE
      AND pu."receivedDate" >= ${startDate}
      AND pu."receivedDate" < ${endDate}
      ${purchaseBranch}
  ), 0)`;

    const expenseOutSql = Prisma.sql`COALESCE((
    SELECT SUM(gep."amount")
    FROM "GeneralExpensePayment" gep
    INNER JOIN "GeneralExpense" ge ON gep."generalExpenseId" = ge."id"
    WHERE ge."companyId" = ${companyId}
      AND ge."isDeleted" = FALSE
      AND gep."createdAt" >= ${startDate}
      AND gep."createdAt" < ${endDate}
      ${expenseBranch}
  ), 0)`;

    //   const openingAmountSql = Prisma.sql`COALESCE((
    //   SELECT SUM(sp."amount")
    //   FROM "SaleReport" sp
    //   WHERE sp."companyId" = ${companyId}
    //     AND sp."isDeleted" = FALSE
    //     AND sp."type" = ${'OPENING_BALANCE'}::"TransactionType"
    //     AND sp."date" >= ${startDate}
    //     AND sp."date" < ${endDate}
    //     ${voucherBranch}
    // ), 0)`;

    //   const transferAmountSql = Prisma.sql`COALESCE((
    //   SELECT SUM(tf."amount")
    //   FROM "Transfer" tf
    //   WHERE tf."companyId" = ${companyId}
    //     AND tf."isDeleted" = FALSE
    //     AND tf."date" >= ${startDate}
    //     AND tf."date" < ${endDate}
    //     ${voucherBranch}
    // ), 0)`;
    // still keep sale "value" fields (tax, subTotal, deliveryFee, discount...) from Voucher
    // since those describe the order itself, not cash movement
    const voucherValueSql = Prisma.sql`
    SELECT
      COALESCE(SUM(v."total"), 0) AS "total",
      COALESCE(SUM(v."tax"), 0) AS "tax",
      COALESCE(SUM(v."subTotal"), 0) AS "subTotal",
      COALESCE(SUM(v."deliveryFee"), 0) AS "deliveryFee",
      COALESCE(SUM(v."packagingFee"), 0) AS "packagingFee",
      COALESCE(SUM(v."discountAmount"), 0) AS "discountAmount",
      COALESCE(SUM(v."discountPercent"), 0) AS "discountPercent"
    FROM "Voucher" v
    WHERE v."companyId" = ${companyId}
      AND v."createdAt" >= ${startDate}
      AND v."createdAt" < ${endDate}
      AND v."isDeleted" = FALSE
      ${voucherBranch}
  `;

    const result = await this.prisma.$queryRaw<
      {
        total: number;
        tax: number;
        subTotal: number;
        deliveryFee: number;
        packagingFee: number;
        discountAmount: number;
        discountPercent: number;
        paymentIn: number;
        repayIn: number;
        refundAmount: number;
        purchaseAmount: number;
        expenseAmount: number;
        openingAmount: number;
        transferAmount: number;
        debtAmount: number;
        netIncome: number;
      }[]
    >(
      Prisma.sql`
      SELECT
        vv.*,
        ${paymentInSql} AS "paymentIn",
        ${paymentInSql} AS "totalPaymentAmount",
        ${repayInSql} AS "repayIn",
        ${refundOutSql} AS "refundAmount",
        ${purchaseOutSql} AS "purchaseAmount",
        ${expenseOutSql} AS "expenseAmount",
        (vv."total" - (${paymentInSql} + ${repayInSql})) AS "debtAmount",
        ((${paymentInSql} + ${repayInSql} ) - ${refundOutSql} - ${purchaseOutSql} - ${expenseOutSql} ) AS "netIncome"
      FROM (${voucherValueSql}) vv
    `,
    );

    return result;
  }
  // async getTotalByDateAndBranchAndCompany(
  //   companyId: number,
  //   branchId: number,
  //   startDate: Date,
  //   endDate: Date,
  // ) {
  //   const branchCondition = branchId
  //     ? Prisma.sql`AND "branchId" = ${branchId}`
  //     : Prisma.empty;

  //   const refundSql = Prisma.sql`COALESCE(( SELECT SUM(r."amount")
  //       FROM "Refund" r
  //       WHERE r."companyId" = ${companyId}
  //         AND r."date" >= ${startDate}
  //         AND r."date" < ${endDate}
  //         AND r."isDeleted" = FALSE
  //         ${branchCondition}
  //         ),0)`;

  //   const expenseSql = Prisma.sql`COALESCE((
  //         SELECT SUM(g."amount")
  //         FROM "GeneralExpense" g
  //         WHERE g."companyId" = ${companyId}
  //           AND g."date" >= ${startDate}
  //           AND g."date" < ${endDate}
  //           AND g."isDeleted" = FALSE
  //           ${branchCondition}
  //     ), 0) `;

  //   const purchaseSql = Prisma.sql`COALESCE((
  //         SELECT SUM(p."totalAmount")
  //         FROM "Purchase" p
  //         WHERE p."companyId" = ${companyId}
  //           AND p."receivedDate" >= ${startDate}
  //           AND p."receivedDate" < ${endDate}
  //           AND p."isDeleted" = FALSE
  //           ${branchCondition}
  //     ), 0)`;

  //   const total: [
  //     {
  //       total: number;
  //       deliveryFee: number;
  //       tax: number;
  //       subTotal: number;
  //       packagingFee: number;
  //       discountAmount: number;
  //       discountPercent: number;
  //       refundAmount: number;
  //       debtAmount: number;
  //       expenseAmount: number;
  //       purchaseAmount: number;
  //       netIncome: number;
  //     },
  //   ] = await this.prisma.$queryRaw(
  //     Prisma.sql`
  //     SELECT
  //       COALESCE(SUM(v."totalPaymentAmount"), 0)
  //         - ${refundSql}
  //         - ${expenseSql}
  //         - ${purchaseSql}
  //         AS "netIncome",

  //        ${refundSql} AS "refundAmount",

  //        ${expenseSql}AS "expenseAmount",

  //        ${purchaseSql} AS "purchaseAmount",

  //       COALESCE(SUM(v."total"), 0) AS "total",
  //       COALESCE(SUM(v."deliveryFee"), 0) AS "deliveryFee",
  //       COALESCE(SUM(v."packagingFee"), 0 ) AS "packagingFee",
  //       COALESCE(SUM(v."discountAmount"), 0 ) AS "discountAmount",
  //       COALESCE(SUM(v."discountPercent"), 0 ) AS "discountPercent",
  //       COALESCE(SUM(v."totalPaymentAmount"), 0 ) AS "totalPaymentAmount",
  //       COALESCE(SUM(v."remainingPaymentAmount"), 0 ) AS "debtAmount",
  //       COALESCE(SUM(v."tax"), 0) AS "tax",
  //       COALESCE(SUM(v."subTotal"), 0) AS "subTotal"

  //     FROM "Voucher" v
  //     WHERE v."companyId" = ${companyId}
  //       AND v."createdAt" >= ${startDate}
  //       AND v."createdAt" < ${endDate}
  //       AND v."isDeleted" = FALSE
  //       ${branchCondition}
  //   `,
  //   );

  //   // console.log('total is', total);
  //   return total;
  // }
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
    const voucherBranch = branchId
      ? Prisma.sql`AND v."branchId" = ${branchId}`
      : Prisma.empty;
    const repayBranch = branchId
      ? Prisma.sql`AND r."branchId" = ${branchId}`
      : Prisma.empty;
    const refundBranch = branchId
      ? Prisma.sql`AND rf."branchId" = ${branchId}`
      : Prisma.empty;
    const purchaseBranch = branchId
      ? Prisma.sql`AND pu."branchId" = ${branchId}`
      : Prisma.empty;
    const expenseBranch = branchId
      ? Prisma.sql`AND ge."branchId" = ${branchId}`
      : Prisma.empty;

    // Sales "value" (accrual) — describes the order itself, not cash movement
    const voucherSql = Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM v."createdAt")::int AS year,
      EXTRACT(MONTH FROM v."createdAt")::int AS month,
      COALESCE(SUM(v."total"), 0) AS "total",
      COALESCE(SUM(v."deliveryFee"), 0) AS "deliveryFee",
      COALESCE(SUM(v."packagingFee"), 0) AS "packagingFee",
      COALESCE(SUM(v."discountAmount"), 0) AS "discountAmount",
      COALESCE(SUM(v."discountPercent"), 0) AS "discountPercent",
      COALESCE(SUM(v."tax"), 0) AS "tax",
      COALESCE(SUM(v."subTotal"), 0) AS "subTotal"
    FROM "Voucher" v
    WHERE v."companyId" = ${companyId}
      AND v."createdAt" >= ${startDate}
      AND v."createdAt" < ${endDate}
      AND v."isDeleted" = FALSE
      ${voucherBranch}
    GROUP BY EXTRACT(YEAR FROM v."createdAt"), EXTRACT(MONTH FROM v."createdAt")
  `;

    // Cash IN — actual payment against a voucher
    const paymentSql = Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM p."createdAt")::int AS year,
      EXTRACT(MONTH FROM p."createdAt")::int AS month,
      COALESCE(SUM(p."amount"), 0) AS "paymentIn"
    FROM "Payment" p
    INNER JOIN "Voucher" v ON p."voucherId" = v."id"
    WHERE v."companyId" = ${companyId}
      AND v."isDeleted" = FALSE
      AND p."createdAt" >= ${startDate}
      AND p."createdAt" < ${endDate}
      ${voucherBranch}
    GROUP BY EXTRACT(YEAR FROM p."createdAt"), EXTRACT(MONTH FROM p."createdAt")
  `;

    // Cash IN — debt repayment (companyId/branchId live directly on Repay)
    const repaySql = Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM r."createdAt")::int AS year,
      EXTRACT(MONTH FROM r."createdAt")::int AS month,
      COALESCE(SUM(r."amount"), 0) AS "repayIn"
    FROM "Repay" r
    WHERE r."companyId" = ${companyId}
      AND r."createdAt" >= ${startDate}
      AND r."createdAt" < ${endDate}
      ${repayBranch}
    GROUP BY EXTRACT(YEAR FROM r."createdAt"), EXTRACT(MONTH FROM r."createdAt")
  `;

    // Cash OUT — refund paid back to customer
    const refundSql = Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM rp."createdAt")::int AS year,
      EXTRACT(MONTH FROM rp."createdAt")::int AS month,
      COALESCE(SUM(rp."amount"), 0) AS "refundAmount"
    FROM "RefundPayment" rp
    INNER JOIN "Refund" rf ON rp."refundId" = rf."id"
    WHERE rf."companyId" = ${companyId}
      AND rf."isDeleted" = FALSE
      AND rp."createdAt" >= ${startDate}
      AND rp."createdAt" < ${endDate}
      ${refundBranch}
    GROUP BY EXTRACT(YEAR FROM rp."createdAt"), EXTRACT(MONTH FROM rp."createdAt")
  `;

    // Cash OUT — expense paid
    const expenseSql = Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM gep."createdAt")::int AS year,
      EXTRACT(MONTH FROM gep."createdAt")::int AS month,
      COALESCE(SUM(gep."amount"), 0) AS "expenseAmount"
    FROM "GeneralExpensePayment" gep
    INNER JOIN "GeneralExpense" ge ON gep."generalExpenseId" = ge."id"
    WHERE ge."companyId" = ${companyId}
      AND ge."isDeleted" = FALSE
      AND gep."createdAt" >= ${startDate}
      AND gep."createdAt" < ${endDate}
      ${expenseBranch}
    GROUP BY EXTRACT(YEAR FROM gep."createdAt"), EXTRACT(MONTH FROM gep."createdAt")
  `;

    // Cash OUT — purchase paid to supplier
    const purchaseSql = Prisma.sql`
    SELECT
      EXTRACT(YEAR FROM pu."receivedDate")::int AS year,
      EXTRACT(MONTH FROM pu."receivedDate")::int AS month,
      COALESCE(SUM(pu."totalAmount"), 0) AS "purchaseAmount"
    FROM "Purchase" pu 
    WHERE pu."companyId" = ${companyId}
      AND pu."isDeleted" = FALSE
      AND pu."receivedDate" >= ${startDate}
      AND pu."receivedDate" < ${endDate}
      ${purchaseBranch}
    GROUP BY EXTRACT(YEAR FROM pu."receivedDate"), EXTRACT(MONTH FROM pu."receivedDate")
  `;

    //opening Amount
    //   const openingAmountSql = Prisma.sql`
    //   SELECT
    //     EXTRACT(YEAR FROM sr."date")::int AS year,
    //     EXTRACT(MONTH FROM sr."date")::int AS month,
    //     COALESCE(SUM(sr."amount"), 0) AS "openingAmount"
    //   FROM "SaleReport" sr
    //   WHERE sr."companyId" = ${companyId}
    //     AND sr."type"= ${'OPENING_BALANCE'}::"TransactionType"
    //     AND sr."isDeleted" = FALSE
    //     AND sr."date" >= ${startDate}
    //     AND sr."date" < ${endDate}
    //     ${purchaseBranch}
    //   GROUP BY EXTRACT(YEAR FROM sr."date"), EXTRACT(MONTH FROM sr."date")
    // `;

    //   const transferAmountSql = Prisma.sql`
    //   SELECT
    //     EXTRACT(YEAR FROM tf."date")::int AS year,
    //     EXTRACT(MONTH FROM tf."date")::int AS month,
    //     COALESCE(SUM(tf."amount"), 0) AS "transferAmount"
    //   FROM "Transfer" tf
    //   WHERE tf."companyId" = ${companyId}
    //     AND tf."isDeleted" = FALSE
    //     AND tf."date" >= ${startDate}
    //     AND tf."date" < ${endDate}
    //     ${purchaseBranch}
    //   GROUP BY EXTRACT(YEAR FROM tf."date"), EXTRACT(MONTH FROM tf."date")
    // `;

    const totals = await this.prisma.$queryRaw<
      {
        year: number;
        month: number;
        total: number;
        deliveryFee: number;
        packagingFee: number;
        discountAmount: number;
        discountPercent: number;
        tax: number;
        subTotal: number;
        paymentIn: number;
        repayIn: number;
        refundAmount: number;
        expenseAmount: number;
        purchaseAmount: number;
        debtAmount: number;
        netIncome: number;
        tranferAmount: number;
        openingAmount: number;
      }[]
    >(
      Prisma.sql`
    SELECT
      months.year,
      months.month,

      COALESCE(v."total", 0) AS "total",
      COALESCE(v."deliveryFee", 0) AS "deliveryFee",
      COALESCE(v."packagingFee", 0) AS "packagingFee",
      COALESCE(v."discountAmount", 0) AS "discountAmount",
      COALESCE(v."discountPercent", 0) AS "discountPercent",
      COALESCE(v."tax", 0) AS "tax",
      COALESCE(v."subTotal", 0) AS "subTotal",

      COALESCE(pay."paymentIn", 0) AS "paymentIn",
      COALESCE(rp."repayIn", 0) AS "repayIn",
      COALESCE(rf."refundAmount", 0) AS "refundAmount",
      COALESCE(ex."expenseAmount", 0) AS "expenseAmount",
      COALESCE(pu."purchaseAmount", 0) AS "purchaseAmount",
      -- COALESCE(sr."openingAmount", 0) AS "openingAmount",
      -- COALESCE(tf."transferAmount", 0) AS "transferAmount",

      (COALESCE(v."total", 0) - (COALESCE(pay."paymentIn", 0) + COALESCE(rp."repayIn", 0)))
        AS "debtAmount",

      ((COALESCE(pay."paymentIn", 0) + COALESCE(rp."repayIn", 0) )
        - COALESCE(rf."refundAmount", 0)
        - COALESCE(ex."expenseAmount", 0)
        - COALESCE(pu."purchaseAmount", 0))
        AS "netIncome"

    -- union every month that has ANY activity (sale, payment, repay, refund, expense, or purchase),
    -- so a month with only expenses (no sales) still shows up
    FROM (
      SELECT year, month FROM (${voucherSql}) x
      UNION
      SELECT year, month FROM (${paymentSql}) x
      UNION
      SELECT year, month FROM (${repaySql}) x
      UNION
      SELECT year, month FROM (${refundSql}) x
      UNION
      SELECT year, month FROM (${expenseSql}) x
      UNION
      SELECT year, month FROM (${purchaseSql}) x
    ) months

    LEFT JOIN (${voucherSql}) v ON months.year = v.year AND months.month = v.month
    LEFT JOIN (${paymentSql}) pay ON months.year = pay.year AND months.month = pay.month
    LEFT JOIN (${repaySql}) rp ON months.year = rp.year AND months.month = rp.month
    LEFT JOIN (${refundSql}) rf ON months.year = rf.year AND months.month = rf.month
    LEFT JOIN (${expenseSql}) ex ON months.year = ex.year AND months.month = ex.month
    LEFT JOIN (${purchaseSql}) pu ON months.year = pu.year AND months.month = pu.month

    ORDER BY months.year ASC, months.month ASC
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

/*
  Warnings:

  - A unique constraint covering the columns `[voucherCode]` on the table `Voucher` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Voucher_voucherCode_key" ON "Voucher"("voucherCode");

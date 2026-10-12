-- CreateEnum
CREATE TYPE "PaidStatus" AS ENUM ('PAID', 'UNPAID');

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "paidStatus" "PaidStatus" NOT NULL DEFAULT 'UNPAID';

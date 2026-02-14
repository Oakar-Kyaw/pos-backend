-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('CASH', 'BANK', 'CARD', 'EWALLET');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK', 'CARD', 'EWALLET');

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "paymentDataId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentData" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "accountNumber" TEXT,
    "accountName" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL,
    "companyId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentData_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentDataId_fkey" FOREIGN KEY ("paymentDataId") REFERENCES "PaymentData"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

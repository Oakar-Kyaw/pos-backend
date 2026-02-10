/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `DeviceInfo` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `DeviceInfo` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `DeviceInfo` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `DeviceInfo` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `DeviceInfo` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `DeviceInfo` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- DropForeignKey
ALTER TABLE "DeviceInfo" DROP CONSTRAINT "DeviceInfo_userId_fkey";

-- DropIndex
DROP INDEX "Category_title_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "DeviceInfo" DROP COLUMN "createdAt",
DROP COLUMN "email",
DROP COLUMN "latitude",
DROP COLUMN "location",
DROP COLUMN "longitude",
DROP COLUMN "userId";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dateOfBirth";

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "barcode" TEXT,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "costPrice" DECIMAL(10,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "minStock" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Product_code_key" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

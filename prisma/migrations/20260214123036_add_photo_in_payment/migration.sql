-- CreateTable
CREATE TABLE "PaymentPhoto" (
    "id" SERIAL NOT NULL,
    "voucherId" INTEGER NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPhoto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PaymentPhoto" ADD CONSTRAINT "PaymentPhoto_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

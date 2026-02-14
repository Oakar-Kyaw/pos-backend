-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "type" "PaymentType" NOT NULL DEFAULT 'CASH';

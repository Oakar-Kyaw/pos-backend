-- CreateTable
CREATE TABLE "Currency" (
    "id" SERIAL NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 1,
    "setDefault" BOOLEAN NOT NULL DEFAULT false,
    "currencySymbol" TEXT NOT NULL,
    "companyId" INTEGER NOT NULL,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Currency_currencyCode_key" ON "Currency"("currencyCode");

-- AddForeignKey
ALTER TABLE "Currency" ADD CONSTRAINT "Currency_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

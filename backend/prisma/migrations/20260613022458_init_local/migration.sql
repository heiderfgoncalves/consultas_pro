-- DropForeignKey
ALTER TABLE "Consultation" DROP CONSTRAINT "Consultation_requestedByUserId_fkey";

-- AlterTable
ALTER TABLE "ApiToken" ADD COLUMN     "allowedOrigins" JSONB;

-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "externalUserId" TEXT,
ALTER COLUMN "requestedByUserId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Consultation_companyId_externalUserId_idx" ON "Consultation"("companyId", "externalUserId");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "ProductSessionFieldAssignment_productId_sessionKey_canonicalFie" RENAME TO "ProductSessionFieldAssignment_productId_sessionKey_canonica_key";

-- CreateTable
CREATE TABLE "ProductSessionFieldAssignment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "canonicalFieldId" TEXT NOT NULL,
    "sessionKey" TEXT NOT NULL,
    "sourcePath" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSessionFieldAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductSessionFieldAssignment_productId_sessionKey_canonicalFieldI_key"
ON "ProductSessionFieldAssignment"("productId", "sessionKey", "canonicalFieldId");

-- CreateIndex
CREATE INDEX "ProductSessionFieldAssignment_productId_sessionKey_idx"
ON "ProductSessionFieldAssignment"("productId", "sessionKey");

-- CreateIndex
CREATE INDEX "ProductSessionFieldAssignment_canonicalFieldId_idx"
ON "ProductSessionFieldAssignment"("canonicalFieldId");

-- AddForeignKey
ALTER TABLE "ProductSessionFieldAssignment"
ADD CONSTRAINT "ProductSessionFieldAssignment_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "ProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSessionFieldAssignment"
ADD CONSTRAINT "ProductSessionFieldAssignment_canonicalFieldId_fkey"
FOREIGN KEY ("canonicalFieldId") REFERENCES "CanonicalFieldCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

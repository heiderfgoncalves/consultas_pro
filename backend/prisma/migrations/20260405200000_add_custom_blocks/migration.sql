-- CreateTable
CREATE TABLE "custom_blocks" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'custom',
    "template" TEXT NOT NULL,
    "skeleton" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_blocks_tenantId_idx" ON "custom_blocks"("tenantId");

-- AddForeignKey
ALTER TABLE "custom_blocks" ADD CONSTRAINT "custom_blocks_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

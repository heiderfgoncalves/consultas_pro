-- CreateTable
CREATE TABLE "SollosFactoryDraft" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "officialSampleCount" INTEGER NOT NULL,
    "attemptedSamples" INTEGER NOT NULL,
    "successfulSamples" INTEGER NOT NULL,
    "failedSamples" INTEGER NOT NULL,
    "validSamples" INTEGER NOT NULL,
    "invalidSamples" INTEGER NOT NULL,
    "uniquePathCount" INTEGER NOT NULL,
    "totalLeafPathCount" INTEGER NOT NULL,
    "coveredLeafPathCount" INTEGER NOT NULL,
    "representativeResponse" JSONB NOT NULL,
    "fieldTypes" JSONB NOT NULL,
    "fieldMappings" JSONB NOT NULL,
    "typeItemFilters" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "structuralPaths" JSONB NOT NULL,
    "sampleValidations" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SollosFactoryDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SollosFactoryDraft_providerId_externalId_key"
ON "SollosFactoryDraft"("providerId", "externalId");

-- CreateIndex
CREATE INDEX "SollosFactoryDraft_providerId_idx"
ON "SollosFactoryDraft"("providerId");

-- CreateIndex
CREATE INDEX "SollosFactoryDraft_status_idx"
ON "SollosFactoryDraft"("status");

-- AddForeignKey
ALTER TABLE "SollosFactoryDraft"
ADD CONSTRAINT "SollosFactoryDraft_providerId_fkey"
FOREIGN KEY ("providerId") REFERENCES "Provider"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

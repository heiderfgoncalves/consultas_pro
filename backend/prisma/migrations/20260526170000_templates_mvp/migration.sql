-- CreateEnum
CREATE TYPE "MvpTemplateKey" AS ENUM ('DIVIDAS_SIMPLES', 'BACEN_SIMPLES', 'PREMIUM');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('CPF', 'CNPJ');

-- CreateTable
CREATE TABLE "TemplateMvpConfig" (
    "id" TEXT NOT NULL,
    "templateKey" "MvpTemplateKey" NOT NULL,
    "documentType" "DocumentKind" NOT NULL,
    "displayName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateMvpConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateMvpRuleStage" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "providerProductId" TEXT,
    "productCode" TEXT NOT NULL,
    "stageName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "onFailure" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "mergeInto" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateMvpRuleStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateMvpTestPool" (
    "id" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "documentType" "DocumentKind" NOT NULL,
    "hasDebt" BOOLEAN NOT NULL DEFAULT false,
    "sourceFile" TEXT NOT NULL,
    "payload" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TemplateMvpTestPool_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TemplateMvpConfig_templateKey_documentType_key" ON "TemplateMvpConfig"("templateKey", "documentType");

-- CreateIndex
CREATE INDEX "TemplateMvpConfig_templateKey_idx" ON "TemplateMvpConfig"("templateKey");

-- CreateIndex
CREATE INDEX "TemplateMvpConfig_documentType_idx" ON "TemplateMvpConfig"("documentType");

-- CreateIndex
CREATE INDEX "TemplateMvpRuleStage_configId_idx" ON "TemplateMvpRuleStage"("configId");

-- CreateIndex
CREATE INDEX "TemplateMvpRuleStage_providerProductId_idx" ON "TemplateMvpRuleStage"("providerProductId");

-- CreateIndex
CREATE INDEX "TemplateMvpRuleStage_priority_idx" ON "TemplateMvpRuleStage"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateMvpTestPool_providerProductId_document_sourceFile_key" ON "TemplateMvpTestPool"("providerProductId", "document", "sourceFile");

-- CreateIndex
CREATE INDEX "TemplateMvpTestPool_providerProductId_idx" ON "TemplateMvpTestPool"("providerProductId");

-- CreateIndex
CREATE INDEX "TemplateMvpTestPool_documentType_idx" ON "TemplateMvpTestPool"("documentType");

-- CreateIndex
CREATE INDEX "TemplateMvpTestPool_document_idx" ON "TemplateMvpTestPool"("document");

-- AddForeignKey
ALTER TABLE "TemplateMvpRuleStage" ADD CONSTRAINT "TemplateMvpRuleStage_configId_fkey" FOREIGN KEY ("configId") REFERENCES "TemplateMvpConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateMvpRuleStage" ADD CONSTRAINT "TemplateMvpRuleStage_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "ProviderProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateMvpTestPool" ADD CONSTRAINT "TemplateMvpTestPool_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "ProviderProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

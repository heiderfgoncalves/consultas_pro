-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'COMPANY_OWNER', 'COMPANY_MANAGER', 'USER');

-- CreateEnum
CREATE TYPE "InviteType" AS ENUM ('COMPANY', 'USER');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TokenOwnerType" AS ENUM ('TENANT', 'INTERNAL');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT', 'BONUS', 'RECHARGE');

-- CreateEnum
CREATE TYPE "ProviderAuthType" AS ENUM ('NONE', 'API_KEY', 'BEARER', 'BASIC_AUTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProviderOperationType" AS ENUM ('BALANCE_CHECK', 'RECHARGE', 'CUSTOM');

-- CreateEnum
CREATE TYPE "HttpMethod" AS ENUM ('GET', 'POST', 'PUT', 'PATCH', 'DELETE');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('DRAFT', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'SKIPPED', 'CACHED');

-- CreateEnum
CREATE TYPE "TemplateVisibility" AS ENUM ('PRIVATE', 'COMPANY', 'GLOBAL');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "branding" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiToken" (
    "id" TEXT NOT NULL,
    "ownerType" "TokenOwnerType" NOT NULL,
    "tenantId" TEXT,
    "label" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "scopes" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "document" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "document" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invite" (
    "id" TEXT NOT NULL,
    "type" "InviteType" NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "companyId" TEXT,
    "invitedByUserId" TEXT,
    "email" TEXT NOT NULL,
    "document" TEXT,
    "roleToAssign" "Role",
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "consultationId" TEXT,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceBefore" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationType" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetSectionKeys" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalFieldCatalog" (
    "id" TEXT NOT NULL,
    "pathKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalFieldCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "authType" "ProviderAuthType" NOT NULL DEFAULT 'NONE',
    "credentials" JSONB,
    "defaultHeaders" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderOperation" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "operationType" "ProviderOperationType" NOT NULL,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'POST',
    "headersTemplate" JSONB,
    "queryTemplate" JSONB,
    "bodyTemplate" JSONB,
    "timeoutMs" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderProduct" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "consultationTypeId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalId" TEXT,
    "endpointPath" TEXT NOT NULL,
    "method" "HttpMethod" NOT NULL DEFAULT 'POST',
    "queryTemplate" JSONB,
    "bodyTemplate" JSONB,
    "headersTemplate" JSONB,
    "timeoutMs" INTEGER,
    "cost" DECIMAL(14,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sampleRequest" JSONB,
    "sampleResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderFieldMapping" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "canonicalFieldId" TEXT NOT NULL,
    "sourcePath" TEXT NOT NULL,
    "transformName" TEXT,
    "fallbackValue" TEXT,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderTestLog" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "productId" TEXT,
    "operationId" TEXT,
    "createdById" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "normalizedPayload" JSONB,
    "statusCode" INTEGER,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderTestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "TemplateVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "alias" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "templateId" TEXT,
    "subjectDocument" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "ConsultationStatus" NOT NULL DEFAULT 'DRAFT',
    "mergedPayload" JSONB,
    "renderPayload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationItem" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "providerProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "requestedCost" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "ConsultationItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultationExecution" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "consultationItemId" TEXT,
    "providerId" TEXT NOT NULL,
    "productId" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "usedCache" BOOLEAN NOT NULL DEFAULT false,
    "requestPayload" JSONB,
    "rawResponse" JSONB,
    "normalizedPayload" JSONB,
    "providerCost" DECIMAL(14,2),
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MergeLog" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT,
    "createdById" TEXT,
    "sourceReferenceIds" TEXT[],
    "mergedPayload" JSONB NOT NULL,
    "strategy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MergeLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ApiToken_tokenHash_key" ON "ApiToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiToken_tenantId_idx" ON "ApiToken"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Company_document_key" ON "Company"("document");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_document_key" ON "User"("document");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite"("tokenHash");

-- CreateIndex
CREATE INDEX "Invite_companyId_idx" ON "Invite"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_companyId_key" ON "Wallet"("companyId");

-- CreateIndex
CREATE INDEX "LedgerEntry_walletId_idx" ON "LedgerEntry"("walletId");

-- CreateIndex
CREATE INDEX "LedgerEntry_companyId_idx" ON "LedgerEntry"("companyId");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_idx" ON "LedgerEntry"("userId");

-- CreateIndex
CREATE INDEX "LedgerEntry_consultationId_idx" ON "LedgerEntry"("consultationId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationType_key_key" ON "ConsultationType"("key");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalFieldCatalog_pathKey_key" ON "CanonicalFieldCatalog"("pathKey");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_slug_key" ON "Provider"("slug");

-- CreateIndex
CREATE INDEX "ProviderOperation_providerId_idx" ON "ProviderOperation"("providerId");

-- CreateIndex
CREATE INDEX "ProviderProduct_providerId_idx" ON "ProviderProduct"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderProduct_providerId_code_key" ON "ProviderProduct"("providerId", "code");

-- CreateIndex
CREATE INDEX "ProviderFieldMapping_productId_idx" ON "ProviderFieldMapping"("productId");

-- CreateIndex
CREATE INDEX "ProviderFieldMapping_canonicalFieldId_idx" ON "ProviderFieldMapping"("canonicalFieldId");

-- CreateIndex
CREATE INDEX "ProviderTestLog_providerId_idx" ON "ProviderTestLog"("providerId");

-- CreateIndex
CREATE INDEX "ProviderTestLog_productId_idx" ON "ProviderTestLog"("productId");

-- CreateIndex
CREATE INDEX "ProviderTestLog_operationId_idx" ON "ProviderTestLog"("operationId");

-- CreateIndex
CREATE INDEX "Template_companyId_idx" ON "Template"("companyId");

-- CreateIndex
CREATE INDEX "Template_userId_idx" ON "Template"("userId");

-- CreateIndex
CREATE INDEX "TemplateItem_providerProductId_idx" ON "TemplateItem"("providerProductId");

-- CreateIndex
CREATE UNIQUE INDEX "TemplateItem_templateId_providerProductId_key" ON "TemplateItem"("templateId", "providerProductId");

-- CreateIndex
CREATE INDEX "Consultation_companyId_idx" ON "Consultation"("companyId");

-- CreateIndex
CREATE INDEX "Consultation_requestedByUserId_idx" ON "Consultation"("requestedByUserId");

-- CreateIndex
CREATE INDEX "Consultation_templateId_idx" ON "Consultation"("templateId");

-- CreateIndex
CREATE INDEX "ConsultationItem_consultationId_idx" ON "ConsultationItem"("consultationId");

-- CreateIndex
CREATE INDEX "ConsultationItem_providerProductId_idx" ON "ConsultationItem"("providerProductId");

-- CreateIndex
CREATE INDEX "ConsultationExecution_consultationId_idx" ON "ConsultationExecution"("consultationId");

-- CreateIndex
CREATE INDEX "ConsultationExecution_providerId_idx" ON "ConsultationExecution"("providerId");

-- CreateIndex
CREATE INDEX "ConsultationExecution_productId_idx" ON "ConsultationExecution"("productId");

-- CreateIndex
CREATE INDEX "MergeLog_consultationId_idx" ON "MergeLog"("consultationId");

-- CreateIndex
CREATE INDEX "MergeLog_createdById_idx" ON "MergeLog"("createdById");

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiToken" ADD CONSTRAINT "ApiToken_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invite" ADD CONSTRAINT "Invite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderOperation" ADD CONSTRAINT "ProviderOperation_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProduct" ADD CONSTRAINT "ProviderProduct_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderProduct" ADD CONSTRAINT "ProviderProduct_consultationTypeId_fkey" FOREIGN KEY ("consultationTypeId") REFERENCES "ConsultationType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFieldMapping" ADD CONSTRAINT "ProviderFieldMapping_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFieldMapping" ADD CONSTRAINT "ProviderFieldMapping_canonicalFieldId_fkey" FOREIGN KEY ("canonicalFieldId") REFERENCES "CanonicalFieldCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTestLog" ADD CONSTRAINT "ProviderTestLog_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTestLog" ADD CONSTRAINT "ProviderTestLog_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProviderProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTestLog" ADD CONSTRAINT "ProviderTestLog_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "ProviderOperation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderTestLog" ADD CONSTRAINT "ProviderTestLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Template" ADD CONSTRAINT "Template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateItem" ADD CONSTRAINT "TemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateItem" ADD CONSTRAINT "TemplateItem_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "ProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "Template"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationItem" ADD CONSTRAINT "ConsultationItem_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationItem" ADD CONSTRAINT "ConsultationItem_providerProductId_fkey" FOREIGN KEY ("providerProductId") REFERENCES "ProviderProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationExecution" ADD CONSTRAINT "ConsultationExecution_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationExecution" ADD CONSTRAINT "ConsultationExecution_consultationItemId_fkey" FOREIGN KEY ("consultationItemId") REFERENCES "ConsultationItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationExecution" ADD CONSTRAINT "ConsultationExecution_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationExecution" ADD CONSTRAINT "ConsultationExecution_productId_fkey" FOREIGN KEY ("productId") REFERENCES "ProviderProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeLog" ADD CONSTRAINT "MergeLog_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergeLog" ADD CONSTRAINT "MergeLog_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

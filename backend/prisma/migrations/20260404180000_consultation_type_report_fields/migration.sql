-- CreateTable
CREATE TABLE "ConsultationTypeReportField" (
    "id" TEXT NOT NULL,
    "consultationTypeId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "colorRules" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultationTypeReportField_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultationTypeReportField_consultationTypeId_fieldKey_key" ON "ConsultationTypeReportField"("consultationTypeId", "fieldKey");

-- CreateIndex
CREATE INDEX "ConsultationTypeReportField_consultationTypeId_idx" ON "ConsultationTypeReportField"("consultationTypeId");

-- AddForeignKey
ALTER TABLE "ConsultationTypeReportField" ADD CONSTRAINT "ConsultationTypeReportField_consultationTypeId_fkey" FOREIGN KEY ("consultationTypeId") REFERENCES "ConsultationType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

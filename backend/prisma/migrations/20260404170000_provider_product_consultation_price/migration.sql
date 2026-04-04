-- Valor cobrado do usuário/empresa (carteira); custo com o provedor permanece em "cost"

ALTER TABLE "ProviderProduct" ADD COLUMN "consultationPrice" DECIMAL(14,2);

UPDATE "ProviderProduct" SET "consultationPrice" = "cost" WHERE "consultationPrice" IS NULL;

ALTER TABLE "ProviderProduct" ALTER COLUMN "consultationPrice" SET NOT NULL;

ALTER TABLE "CanonicalFieldCatalog"
ADD COLUMN "uiItemFilters" JSONB;

ALTER TABLE "ProviderFieldMapping"
ADD COLUMN "uiStartLine" INTEGER,
ADD COLUMN "uiEndLine" INTEGER;

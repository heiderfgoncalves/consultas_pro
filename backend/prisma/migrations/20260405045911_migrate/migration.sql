-- This migration was auto-generated to rename a truncated index.
-- The index name varies depending on Prisma version; handle both cases.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'ProductSessionFieldAssignment_productId_sessionKey_canonicalFieldI_key') THEN
    ALTER INDEX "ProductSessionFieldAssignment_productId_sessionKey_canonicalFieldI_key"
    RENAME TO "ProductSessionFieldAssignment_productId_sessionKey_canonica_key";
  END IF;
END $$;

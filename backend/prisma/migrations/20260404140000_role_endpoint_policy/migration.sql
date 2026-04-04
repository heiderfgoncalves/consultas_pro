-- CreateTable
CREATE TABLE "RoleEndpointPolicy" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "routeKey" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoleEndpointPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleEndpointPolicy_role_routeKey_key" ON "RoleEndpointPolicy"("role", "routeKey");

-- CreateIndex
CREATE INDEX "RoleEndpointPolicy_role_idx" ON "RoleEndpointPolicy"("role");

-- Defaults: todos os papéis com acesso a todos os endpoints do catálogo inicial (compatível com comportamento anterior).
INSERT INTO "RoleEndpointPolicy" ("id", "role", "routeKey", "isEnabled", "createdAt", "updatedAt")
SELECT
  ('rep_' || "role"::text || '_' || rk) AS "id",
  "role",
  rk AS "routeKey",
  true AS "isEnabled",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  SELECT unnest(ARRAY['PLATFORM_ADMIN'::"Role", 'COMPANY_OWNER'::"Role", 'COMPANY_MANAGER'::"Role", 'USER'::"Role"]) AS "role"
) roles
CROSS JOIN (
  SELECT unnest(ARRAY[
    'api.consultations.create',
    'api.consultations.list',
    'api.consultations.get',
    'api.consultations.mergePreview'
  ]) AS rk
) keys;

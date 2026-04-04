-- Critérios de filtro por tipo canônico, armazenados por produto (consulta).
ALTER TABLE "ProviderProduct" ADD COLUMN "typeItemFilters" JSONB;

import { PrismaClient } from '@prisma/client';
import { buildTypeKeyedData } from './modules/providers/canonical-builder.service';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TESTANDO EXTRACAO DE DADOS PARA PROTESTO_CARTORIO ===');
  
  const product = await prisma.providerProduct.findFirst({
    where: {
      OR: [
        { code: '1079' },
        { id: '1079' }
      ]
    },
    include: {
      mappings: {
        include: {
          canonicalField: true
        }
      }
    }
  });

  if (!product) {
    console.log('Produto não encontrado!');
    return;
  }

  const sampleResponse = typeof product.sampleResponse === 'string' 
    ? product.sampleResponse 
    : JSON.stringify(product.sampleResponse);

  const fieldMappings = product.mappings
    .filter((m) => m.isActive)
    .map((m) => ({
      jsonPath: m.sourcePath,
      fieldTypeKey: m.canonicalField.pathKey,
      label: m.canonicalField.label,
    }));

  const productFilters: Record<string, any> = (typeof product.typeItemFilters === 'string'
    ? JSON.parse(product.typeItemFilters)
    : product.typeItemFilters) || {};

  const dbFields = await prisma.canonicalFieldCatalog.findMany({
    where: {
      isActive: true,
      dataType: 'object',
    },
  });

  const ft = dbFields.find((f) => f.pathKey === 'PROTESTO_CARTORIO');
  if (!ft) {
    console.log('Tipo canônico PROTESTO_CARTORIO não encontrado!');
    return;
  }

  let reportFieldConfig: any = undefined;
  if (ft.reportFieldConfig) {
    const parsed = typeof ft.reportFieldConfig === 'string'
      ? JSON.parse(ft.reportFieldConfig)
      : ft.reportFieldConfig;
    if (parsed && Array.isArray(parsed.fields)) {
      const assignKeysToReportFields = (fields: any[]) => {
        const slugify = (text: string) => {
          return text
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, '-')
            .replace(/[^\w\-]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-+/, '')
            .replace(/-+$/, '');
        };
        const seen = new Set<string>();
        return fields.map((f, i) => {
          let k = slugify(f.label || `field-${i + 1}`).replace(/-/g, '_');
          if (!k) k = `field_${i + 1}`;
          let original = k;
          let counter = 1;
          while (seen.has(k)) {
            k = `${original}_${counter}`;
            counter += 1;
          }
          seen.add(k);
          return { ...f, key: k };
        });
      };
      reportFieldConfig = {
        version: parsed.version || 1,
        title: parsed.title,
        fields: assignKeysToReportFields(parsed.fields),
      };
    }
  }

  const fieldType = {
    id: ft.id,
    key: ft.pathKey,
    label: ft.label,
    reportFieldConfig,
  };

  const mapsForType = fieldMappings.filter((m) => m.fieldTypeKey === 'PROTESTO_CARTORIO');
  const typeItemFilterConfig = productFilters['PROTESTO_CARTORIO'] || {
    version: 2,
    groups: [],
    fieldMappings: [],
    dedupFieldIds: [],
  };

  console.log('Maps for type:', JSON.stringify(mapsForType, null, 2));
  console.log('TypeItemFilterConfig fieldMappings:', JSON.stringify(typeItemFilterConfig.fieldMappings, null, 2));

  const result = buildTypeKeyedData({
    sampleResponse,
    trechoMappings: mapsForType,
    fieldType: fieldType as any,
    typeItemFilterConfig,
  });

  console.log('RESULTADO DA EXTRACAO:');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

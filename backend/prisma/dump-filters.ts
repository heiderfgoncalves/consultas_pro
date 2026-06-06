import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.providerProduct.findFirst({
    where: {
      externalId: '1079'
    }
  });

  if (!product) {
    console.log("Product with externalId 1079 not found");
    return;
  }

  console.log(`Product Name: ${product.name}`);
  console.log(`Product Code: ${product.code}`);
  console.log(`Product ID: ${product.id}`);
  
  fs.writeFileSync('sample-filters.json', JSON.stringify(product.typeItemFilters, null, 2));
  console.log("Filters dumped to sample-filters.json");
}

main().catch(console.error).finally(() => prisma.$disconnect());

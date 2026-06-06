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

  const filePath = path.join(__dirname, '../sample-filters.json');
  if (!fs.existsSync(filePath)) {
    console.log(`sample-filters.json not found at ${filePath}`);
    return;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const typeItemFilters = JSON.parse(fileContent);

  await prisma.providerProduct.update({
    where: { id: product.id },
    data: {
      typeItemFilters
    }
  });

  console.log("Filters from sample-filters.json successfully imported to product 1079 in DB");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

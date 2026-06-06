import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.providerProduct.findFirst({
    where: {
      externalId: '1079'
    }
  });
  if (!product) {
    console.log("Product not found by externalId '1079'. Trying by name...");
    const productsByName = await prisma.providerProduct.findMany({
      where: {
        name: {
          contains: 'COMPLETA BRASIL'
        }
      }
    });
    console.log(`Found ${productsByName.length} products by name.`);
    for (const p of productsByName) {
      console.log(`ID: ${p.id}, Name: ${p.name}, Code: ${p.code}, ExternalId: ${p.externalId}`);
    }
    if (productsByName.length > 0) {
      console.log("\nDetails of the first product found:");
      console.log(JSON.stringify({
        id: productsByName[0].id,
        name: productsByName[0].name,
        code: productsByName[0].code,
        typeItemFilters: productsByName[0].typeItemFilters,
        sampleResponseLength: String(productsByName[0].sampleResponse).length,
        sampleResponsePreview: String(productsByName[0].sampleResponse).substring(0, 500)
      }, null, 2));
    }
  } else {
    console.log(JSON.stringify({
      id: product.id,
      name: product.name,
      code: product.code,
      typeItemFilters: product.typeItemFilters,
      sampleResponseLength: String(product.sampleResponse).length,
      sampleResponsePreview: String(product.sampleResponse).substring(0, 500)
    }, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

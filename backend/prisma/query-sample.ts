import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.providerProduct.findFirst({
    where: {
      code: '1079'
    }
  });
  if (!product || !product.sampleResponse) {
    console.log("Product or sampleResponse not found.");
    return;
  }
  
  const sample = JSON.stringify(product.sampleResponse);
  console.log("Length of sampleResponse:", sample.length);

  // Search for the contract and show context around it
  const contract = "BBH02100049991283";
  let index = sample.indexOf(contract);
  while (index !== -1) {
    console.log(`\nFound contract at index ${index}:`);
    console.log(sample.substring(index - 400, index + 400));
    index = sample.indexOf(contract, index + 1);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

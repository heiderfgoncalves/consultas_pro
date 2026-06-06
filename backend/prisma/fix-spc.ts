import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const product = await prisma.providerProduct.findFirst({
    where: {
      externalId: '1079'
    }
  });

  if (!product) {
    console.log("Product not found");
    return;
  }

  const filters = product.typeItemFilters as any;
  if (filters && filters.DIVIDAS_SPC) {
    const dedupIds: string[] = filters.DIVIDAS_SPC.dedupFieldIds || [];
    const beforeLength = dedupIds.length;
    // Remove computed_mada2fjla
    filters.DIVIDAS_SPC.dedupFieldIds = dedupIds.filter(id => id !== 'computed_mada2fjla');
    const afterLength = filters.DIVIDAS_SPC.dedupFieldIds.length;

    if (beforeLength !== afterLength) {
      await prisma.providerProduct.update({
        where: { id: product.id },
        data: {
          typeItemFilters: filters
        }
      });
      console.log(`Updated! Removed computed_mada2fjla from DIVIDAS_SPC.dedupFieldIds. (Before: ${beforeLength}, After: ${afterLength})`);
    } else {
      console.log("computed_mada2fjla was not present in DIVIDAS_SPC.dedupFieldIds");
    }
  } else {
    console.log("No DIVIDAS_SPC filter found in product configuration");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INVENTÁRIO DO BANCO DE DADOS REMOTO ATUAL ===");

  const tables = [
    { name: 'User', count: () => prisma.user.count() },
    { name: 'Company', count: () => prisma.company.count() },
    { name: 'Wallet', count: () => prisma.wallet.count() },
    { name: 'ApiToken', count: () => prisma.apiToken.count() },
    { name: 'Template', count: () => prisma.template.count() },
    { name: 'TemplateItem', count: () => prisma.templateItem.count() },
    { name: 'TemplateMvpConfig', count: () => prisma.templateMvpConfig.count() },
    { name: 'TemplateMvpRuleStage', count: () => prisma.templateMvpRuleStage.count() },
    { name: 'ProductSessionFieldAssignment', count: () => prisma.productSessionFieldAssignment.count() },
    { name: 'RoleEndpointPolicy', count: () => prisma.roleEndpointPolicy.count() },
    { name: 'Consultation', count: () => prisma.consultation.count() },
    { name: 'ConsultationItem', count: () => prisma.consultationItem.count() },
    { name: 'LedgerEntry', count: () => prisma.ledgerEntry.count() },
    { name: 'ProviderFieldMapping', count: () => prisma.providerFieldMapping.count() },
    { name: 'ProviderProduct', count: () => prisma.providerProduct.count() },
    { name: 'Provider', count: () => prisma.provider.count() },
    { name: 'CanonicalFieldCatalog', count: () => prisma.canonicalFieldCatalog.count() },
    { name: 'ConsultationTypeReportField', count: () => prisma.consultationTypeReportField.count() },
    { name: 'CanonicalFolder', count: () => prisma.canonicalFolder.count() },
    { name: 'CanonicalFieldFolderAssociation', count: () => prisma.canonicalFieldFolderAssociation.count() },
    { name: 'ProviderTestLog', count: () => prisma.providerTestLog.count() },
  ];

  for (const t of tables) {
    try {
      const count = await t.count();
      console.log(`- ${t.name.padEnd(30)}: ${count}`);
    } catch (e: any) {
      console.log(`- ${t.name.padEnd(30)}: ERRO (${e.message})`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

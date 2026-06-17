import { PrismaClient, Role } from '@prisma/client';
// @ts-ignore
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log('Iniciando o seed dos novos administradores...');

  const passwordHash = await hashPassword('senha123');

  // 1. Cria ou garante que o e-mail Master inicial (admin@consultas.pro) possui o papel correto
  const masterEmail = 'admin@consultas.pro';
  const existingMaster = await prisma.user.findUnique({
    where: { email: masterEmail },
  });

  if (existingMaster) {
    await prisma.user.update({
      where: { id: existingMaster.id },
      data: { role: Role.PLATFORM_ADMIN },
    });
    console.log(`Usuário Master (${masterEmail}) atualizado para PLATFORM_ADMIN.`);
  } else {
    // Se não existisse, criaria, mas o usuário disse que ele é o master já existente
    console.log(`Usuário Master (${masterEmail}) já deve existir no banco.`);
  }

  // 2. Criação da Empresa Parceira padrão para Claudio Tomich (N1) se ele for criar empresas
  const partnerCompanyName = 'Tomich Parceiros LTDA';
  const partnerCompanySlug = 'tomich-parceiros';
  let partnerCompany = await prisma.company.findUnique({
    where: { slug: partnerCompanySlug },
  });

  if (!partnerCompany) {
    partnerCompany = await prisma.company.create({
      data: {
        name: partnerCompanyName,
        slug: partnerCompanySlug,
        document: '11.111.111/0001-11',
        email: 'parcerias@tomich.pro',
        phone: '11999991111',
        wallet: { create: { balance: 10000.00 } }, // Começa com 10.000,00 de saldo para testes
      },
    });
    console.log(`Empresa parceira criada: ${partnerCompanyName}`);
  }

  // 3. Criação de claudio.tomich@consultas.pro (N1 - CUSTOMER_ADMIN)
  const n1Email = 'claudio.tomich@consultas.pro';
  const existingN1 = await prisma.user.findUnique({ where: { email: n1Email } });
  if (!existingN1) {
    await prisma.user.create({
      data: {
        fullName: 'Claudio Tomich',
        email: n1Email,
        document: '111.111.111-11',
        phone: '11999991111',
        passwordHash,
        mustResetPassword: true,
        role: Role.CUSTOMER_ADMIN,
        companyId: partnerCompany.id,
      },
    });
    console.log(`Usuário N1 criado: ${n1Email}`);
  } else {
    await prisma.user.update({
      where: { id: existingN1.id },
      data: { role: Role.CUSTOMER_ADMIN, mustResetPassword: true, passwordHash },
    });
    console.log(`Usuário N1 atualizado para CUSTOMER_ADMIN com reset obrigatório de senha.`);
  }

  // 4. Criação da Empresa de MMVI Consultoria (N2)
  const companySlug = 'mmvi-consultoria';
  let mmviCompany = await prisma.company.findUnique({
    where: { slug: companySlug },
  });

  if (!mmviCompany) {
    mmviCompany = await prisma.company.create({
      data: {
        name: 'MMVI Consultoria',
        slug: companySlug,
        document: '22.222.222/0001-22',
        email: 'contato@mmvi.pro',
        phone: '11999992222',
        metadata: { partnerId: existingN1?.id || 'claudio_tomich_id_placeholder' }, // Vincula ao parceiro N1
        wallet: { create: { balance: 1000.00 } }, // Começa com 1000 de saldo
      },
    });
    console.log('Empresa MMVI Consultoria criada com vínculo ao parceiro N1.');
  }

  // 5. Criação de mmvi.consultoria@consultas.pro (N2 - COMPANY_ADMIN)
  const n2Email = 'mmvi.consultoria@consultas.pro';
  const existingN2 = await prisma.user.findUnique({ where: { email: n2Email } });
  if (!existingN2) {
    await prisma.user.create({
      data: {
        fullName: 'MMVI Consultoria Admin',
        email: n2Email,
        document: '222.222.222-22',
        phone: '11999992222',
        passwordHash,
        mustResetPassword: true,
        role: Role.COMPANY_ADMIN,
        companyId: mmviCompany.id,
      },
    });
    console.log(`Usuário N2 criado: ${n2Email}`);
  } else {
    await prisma.user.update({
      where: { id: existingN2.id },
      data: { role: Role.COMPANY_ADMIN, mustResetPassword: true, passwordHash, companyId: mmviCompany.id },
    });
    console.log(`Usuário N2 atualizado para COMPANY_ADMIN com reset obrigatório de senha.`);
  }

  // Ajusta o metadata da empresa se o id de claudio estiver disponível agora
  const finalN1 = await prisma.user.findUnique({ where: { email: n1Email } });
  if (finalN1) {
    await prisma.company.update({
      where: { id: mmviCompany.id },
      data: {
        metadata: { partnerId: finalN1.id },
      },
    });
  }

  // 6. Criação de marcus.vinicius@consultas.pro (N3 - COMPANY_COMMON)
  const n3Email = 'marcus.vinicius@consultas.pro';
  const existingN3 = await prisma.user.findUnique({ where: { email: n3Email } });
  if (!existingN3) {
    await prisma.user.create({
      data: {
        fullName: 'Marcus Vinicius',
        email: n3Email,
        document: '333.333.333-33',
        phone: '11999993333',
        passwordHash,
        mustResetPassword: true,
        role: Role.COMPANY_COMMON,
        companyId: mmviCompany.id, // Pertence à mesma empresa MMVI Consultoria
      },
    });
    console.log(`Usuário N3 criado: ${n3Email}`);
  } else {
    await prisma.user.update({
      where: { id: existingN3.id },
      data: { role: Role.COMPANY_COMMON, mustResetPassword: true, passwordHash, companyId: mmviCompany.id },
    });
    console.log(`Usuário N3 atualizado para COMPANY_COMMON com reset obrigatório de senha.`);
  }

  console.log('Seed de novos administradores executado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

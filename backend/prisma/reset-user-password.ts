import 'dotenv/config';

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/hash';

/**
 * Redefine a senha de um usuário existente (hash bcrypt, mesmo fluxo do auth).
 *
 * Uso (na pasta backend):
 *   RESET_USER_PASSWORD='sua-nova-senha' npx tsx prisma/reset-user-password.ts
 *   RESET_USER_PASSWORD='sua-nova-senha' npx tsx prisma/reset-user-password.ts outro@email.com
 *
 * Não commite senhas; use apenas em ambiente controlado.
 */

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim() || 'admin@consultas.pro';
  const password = process.env.RESET_USER_PASSWORD?.trim();

  if (!password || password.length < 6) {
    console.error(
      'Defina RESET_USER_PASSWORD com pelo menos 6 caracteres (mínimo do login).\n' +
        'Ex.: RESET_USER_PASSWORD="..." npx tsx prisma/reset-user-password.ts [email]',
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Usuário não encontrado: ${email}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      isActive: true,
      accountStatus: 'ACTIVE',
    },
  });

  console.log(`Senha atualizada para ${email} (conta ativa).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

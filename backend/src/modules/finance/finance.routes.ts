import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../core/auth';
import { ok } from '../../core/http';

export async function registerFinanceRoutes(app: FastifyInstance) {
  app.get('/finance/me/balance', { preHandler: [authenticate] }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    if (!companyId) {
      return ok(reply, { balance: 0, ledgerEnabled: false });
    }

    const wallet = await app.prisma.wallet.findUnique({
      where: { companyId },
    });

    return ok(reply, {
      balance: wallet?.balance ?? 0,
      ledgerEnabled: true,
    });
  });

  app.get('/finance/me/ledger', { preHandler: [authenticate] }, async (request, reply) => {
    const companyId = request.authUser?.companyId;
    if (!companyId) return ok(reply, []);

    const entries = await app.prisma.ledgerEntry.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return ok(reply, entries);
  });
}

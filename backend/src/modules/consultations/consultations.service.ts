import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { ConflictError, NotFoundError, ValidationError } from '../../core/errors';
import { consultationExecutionQueue } from '../../queues';
import { normalizeDocument } from '../../lib/documents';
import {
  computeConsultationJobPriority,
  getEffectiveIntegrationSettingsForCompany,
} from '../../lib/integration-settings';

export async function createConsultation(app: FastifyInstance, input: {
  requestedByUserId: string;
  companyId?: string | null;
  subjectDocument: string;
  subjectType: string;
  templateId?: string;
  providerProductIds?: string[];
}) {
  if (!input.templateId && (!input.providerProductIds || input.providerProductIds.length === 0)) {
    throw new ValidationError('Informe um template ou pelo menos um produto de consulta');
  }

  const products = input.templateId
    ? await loadProductsByTemplate(app, input.templateId)
    : await app.prisma.providerProduct.findMany({
        where: { id: { in: input.providerProductIds! }, isActive: true },
        orderBy: { name: 'asc' },
      });

  if (!products.length) throw new NotFoundError('Nenhum produto de consulta encontrado');

  const companyWallet = input.companyId
    ? await app.prisma.wallet.findUnique({ where: { companyId: input.companyId } })
    : null;

  const totalCost = products.reduce((acc, item) => acc.add(item.consultationPrice), new Prisma.Decimal(0));

  if (input.companyId && (!companyWallet || companyWallet.balance.lessThan(totalCost))) {
    throw new ConflictError('Saldo insuficiente para emitir a consulta');
  }

  if (input.companyId) {
    const integrationSettings = await getEffectiveIntegrationSettingsForCompany(app.prisma, input.companyId);
    if (integrationSettings.pauseNewConsultations) {
      throw new ConflictError('Novas consultas estão pausadas pela configuração de integrações.');
    }
  }

  const consultation = await app.prisma.$transaction(async (tx) => {
    const created = await tx.consultation.create({
      data: {
        companyId: input.companyId ?? null,
        requestedByUserId: input.requestedByUserId,
        templateId: input.templateId,
        subjectDocument: normalizeDocument(input.subjectDocument),
        subjectType: input.subjectType,
        totalCost,
        status: 'QUEUED',
        items: {
          createMany: {
            data: products.map((product, index) => ({
              providerProductId: product.id,
              sortOrder: index,
              requestedCost: product.consultationPrice,
            })),
          },
        },
      },
      include: {
        items: true,
      },
    });

    if (input.companyId && companyWallet) {
      await tx.wallet.update({
        where: { id: companyWallet.id },
        data: {
          balance: { decrement: totalCost },
        },
      });

      await tx.ledgerEntry.create({
        data: {
          walletId: companyWallet.id,
          companyId: input.companyId,
          userId: input.requestedByUserId,
          consultationId: created.id,
          type: 'DEBIT',
          amount: totalCost,
          balanceBefore: companyWallet.balance,
          balanceAfter: companyWallet.balance.sub(totalCost),
          description: `Débito da consulta ${created.id}`,
          metadata: {
            productIds: products.map((product) => product.id),
          },
        },
      });
    }

    return created;
  });

  const tenantBase = await getEffectiveIntegrationSettingsForCompany(app.prisma, input.companyId);
  const priority = computeConsultationJobPriority(tenantBase, products);

  await consultationExecutionQueue.add(
    'consultation.execute',
    { consultationId: consultation.id },
    { priority },
  );

  return consultation;
}

export async function loadProductsByTemplate(app: FastifyInstance, templateId: string) {
  const template = await app.prisma.template.findUnique({
    where: { id: templateId },
    include: {
      items: {
        include: { providerProduct: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!template) throw new NotFoundError('Template não encontrado');
  return template.items.map((item) => item.providerProduct);
}

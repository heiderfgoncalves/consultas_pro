import type { FastifyInstance } from 'fastify';
import { authenticate, requireEndpointAccess } from '../../core/auth';
import { ok } from '../../core/http';
import { createConsultationSchema, mergePreviewSchema } from './consultations.schemas';
import { createConsultation } from './consultations.service';
import { previewMerge } from '../providers/providers.service';

export async function registerConsultationRoutes(app: FastifyInstance) {
  app.post('/consultations', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.create')],
  }, async (request, reply) => {
    const payload = createConsultationSchema.parse(request.body);

    return ok(reply, await createConsultation(app, {
      requestedByUserId: request.authUser?.userId === 'api-bot' ? null : request.authUser?.userId,
      companyId: request.authUser?.companyId,
      subjectDocument: payload.subjectDocument,
      subjectType: payload.subjectType,
      templateId: payload.templateId,
      providerProductIds: payload.providerProductIds,
      externalUserId: payload.externalUserId,
    }), 201);
  });

  app.get('/consultations', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.list')],
  }, async (request, reply) => {
    const consultations = await app.prisma.consultation.findMany({
      where: request.authUser?.companyId
        ? { companyId: request.authUser.companyId }
        : { requestedByUserId: request.authUser!.userId },
      include: {
        template: { select: { id: true, name: true } },
        items: {
          include: {
            providerProduct: {
              include: { provider: true, consultationType: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return ok(reply, consultations);
  });

  app.post('/consultations/merge-preview', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.mergePreview')],
  }, async (request, reply) => {
    const payload = mergePreviewSchema.parse(request.body);
    return ok(reply, await previewMerge(app, {
      actorUserId: request.authUser?.userId,
      executionIds: payload.executionIds,
      testLogIds: payload.testLogIds,
    }));
  });

  app.get('/consultations/:id', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.get')],
  }, async (request, reply) => {
    const params = request.params as { id: string };

    const consultation = await app.prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        template: { select: { id: true, name: true, layout: true, logo: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            providerProduct: {
              include: {
                provider: true,
                consultationType: true,
              },
            },
          },
        },
        executions: {
          select: {
            id: true,
            status: true,
            errorMessage: true,
            normalizedPayload: true,
            rawResponse: true,
            startedAt: true,
            completedAt: true,
            providerCost: true,
            statusCode: true,
            product: { select: { id: true, name: true, code: true } },
            provider: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });

    return ok(reply, consultation);
  });

  const getPdfHandler = async (request: any, reply: any) => {
    const params = request.params as { id: string };

    const consultation = await app.prisma.consultation.findUnique({
      where: { id: params.id },
      include: {
        company: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, layout: true, logo: true } },
        items: {
          orderBy: { sortOrder: 'asc' },
          include: {
            providerProduct: {
              include: {
                provider: true,
                consultationType: true,
              },
            },
          },
        },
      },
    });

    if (!consultation) {
      return reply.code(404).send({ error: 'Consulta não encontrada' });
    }

    const realData = (consultation.renderPayload || consultation.mergedPayload || {}) as any;
    const templateLayout = (consultation.template?.layout ?? null) as any;
    const rawItems = consultation.items ?? [];
    const clientName =
      realData?.cliente?.nome ||
      realData?.clientName ||
      realData?.nome ||
      consultation.subjectDocument ||
      'CLIENTE ANALISADO';

    const consultationDate = new Date(consultation.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(consultation.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const protocol = realData?.protocol ||
                     realData?.template?.protocol ||
                     realData?.hash ||
                     (consultation.subjectDocument
                       ? `REQ-${consultation.subjectDocument.replace(/\D/g, '').slice(0, 8)}`
                       : `REQ-${consultation.id.slice(0, 8).toUpperCase()}`);
    
    const mergedData = {
      ...realData,
      cliente: { nome: clientName, documento: consultation.subjectDocument || '' },
      clientName,
      clientCpf: consultation.subjectDocument || '',
      consultationDate,
      protocol,
      template: {
        date: consultationDate,
        protocol,
        company: consultation.company?.name || 'CONSULTAS PRO',
      },
    };

    const { renderTemplateToHtml } = await import('../../lib/template-engine/renderTemplateToHtml');

    let pagesHtml = '';
    let pageWidth = 794;
    let pageHeight = 1123;

    if (templateLayout?.frames?.length > 0) {
      templateLayout.frames.forEach((f: any) => {
        try {
          const { html } = renderTemplateToHtml(templateLayout, f.id, mergedData);
          pagesHtml += `<section class="page" style="width:${f.width}px;height:${f.height}px;background:${f.background || '#fff'};position:relative;overflow:hidden;box-sizing:border-box;">${html}</section>`;
          pageWidth = f.width;
          pageHeight = f.height;
        } catch (e: any) {
          pagesHtml += `<div class="error">Erro no frame ${f.name || ''}: ${e.message}</div>`;
        }
      });
    } else if (rawItems.length > 0) {
      rawItems.forEach((raw: any) => {
        const pl = raw.providerProduct?.templateLayout as any;
        if (pl?.frames?.length > 0) {
          try {
            const { html } = renderTemplateToHtml(pl, pl.frames[0].id, mergedData);
            pagesHtml += `<section class="page" style="width:${pl.frames[0].width}px;height:${pl.frames[0].height}px;background:${pl.frames[0].background || '#fff'};position:relative;overflow:hidden;box-sizing:border-box;">${html}</section>`;
            pageWidth = pl.frames[0].width;
            pageHeight = pl.frames[0].height;
          } catch (e: any) {
            pagesHtml += `<div class="error">Erro: ${e.message}</div>`;
          }
        }
      });
    }

    if (!pagesHtml) {
      pagesHtml = `<section class="page" style="width:794px;min-height:1123px;padding:48px;background:#fff;position:relative;overflow:hidden;box-sizing:border-box;">
        <h1 style="font-size:22px;font-weight:800;margin:0 0 8px">${consultation.template?.name || 'Relatório'}</h1>
        <p style="font-size:13px;color:#64748b;margin:0 0 24px">Documento: ${consultation.subjectDocument}</p>
        <pre style="font-size:10px;background:#f1f5f9;padding:16px;border-radius:8px;overflow:auto;white-space:pre-wrap">${JSON.stringify(realData, null, 2)}</pre>
      </section>`;
    }

    const logo = consultation.template?.logo
      ? `<img src="${consultation.template.logo}" style="max-height:32px;width:auto;position:absolute;top:16px;right:16px;z-index:10;" />`
      : '';

    const fullHtml = `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Inter:wght@100..900&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://cdn.jsdelivr.net/npm/lucide@0.462.0/dist/umd/lucide.min.js"></script>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important; }
  body { background: #fff; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { position: relative; overflow: hidden; page-break-after: always; box-sizing: border-box; }
  i[data-lucide] svg, svg.lucide { width: 100%; height: 100%; }
</style></head><body>${logo}${pagesHtml}
<script>if(typeof lucide!=='undefined'){lucide.createIcons();}</script>
</body></html>`;

    const { generatePdfFromHtml } = await import('../../lib/pdf');
    try {
      const pdfBuffer = await generatePdfFromHtml(fullHtml, pageWidth, pageHeight);
      const safeDoc = consultation.subjectDocument?.replace(/\D/g, '') || 'sem-doc';
      const filename = `${consultation.template?.name || 'Relatorio'}-${safeDoc}.pdf`;

      return reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"`)
        .send(pdfBuffer);
    } catch (e: any) {
      request.log.error(e, 'Erro ao gerar PDF via Puppeteer');
      return reply.code(500).send({ error: 'Erro interno ao gerar PDF do relatório' });
    }
  };

  app.get('/download/relatorio-:id-document.pdf', getPdfHandler);
  app.get('/reports/:id', getPdfHandler);
  app.get('/consultations/:id/pdf', getPdfHandler);

  app.get('/catalog/canonical-fields', {
    preHandler: [authenticate, requireEndpointAccess('api.consultations.list')],
  }, async (_request, reply) => {
    const fields = await app.prisma.canonicalFieldCatalog.findMany({
      orderBy: { pathKey: 'asc' },
    });
    return ok(reply, fields);
  });


  app.get('/widget.js', async (_request, reply) => {
    const fs = require('fs');
    const path = require('path');
    const widgetPath = path.join(__dirname, '../../public/widget.js');
    const content = fs.readFileSync(widgetPath, 'utf8');
    
    return reply
      .header('Access-Control-Allow-Origin', '*')
      .header('Cross-Origin-Resource-Policy', 'cross-origin')
      .type('application/javascript; charset=utf-8')
      .send(content);
  });
}

import type { FastifyInstance } from 'fastify';
import { registerHealthRoutes } from './system/health.routes';
import { registerAuthRoutes } from './auth/auth.routes';
import { registerUserRoutes } from './users/users.routes';
import { registerCompanyRoutes } from './companies/companies.routes';
import { registerFinanceRoutes } from './finance/finance.routes';
import { registerTemplateRoutes } from './templates/templates.routes';
import { registerConsultationRoutes } from './consultations/consultations.routes';
import { registerAdminRoutes } from './admin/admin.routes';
import { registerCustomBlockRoutes } from './admin/custom-blocks.routes';
import { registerTemplatesMvpAdminRoutes } from './admin/templates-mvp.routes';

export async function registerModules(app: FastifyInstance) {
  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerUserRoutes(app);
  await registerCompanyRoutes(app);
  await registerFinanceRoutes(app);
  await registerTemplateRoutes(app);
  await registerConsultationRoutes(app);
  await registerAdminRoutes(app);
  await registerCustomBlockRoutes(app);
  await registerTemplatesMvpAdminRoutes(app);
}

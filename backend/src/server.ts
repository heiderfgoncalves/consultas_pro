import { buildApp } from './app';
import { env } from './config/env';
import './workers/consultation.worker';

async function bootstrap() {
  const app = await buildApp();

  try {
    await app.listen({
      host: env.HOST,
      port: env.PORT,
    });

    app.log.info(`HTTP server running on ${env.HOST}:${env.PORT}`);

    try {
      const parsedUrl = new URL(env.DATABASE_URL.replace('postgres://', 'http://'));
      const isProd = env.NODE_ENV === 'production' || parsedUrl.hostname !== 'localhost';
      const envName = isProd ? 'PRODUÇÃO' : 'HOMOLOGAÇÃO (LOCALHOST)';
      app.log.info(`[Ambiente: ${envName}] Conectado ao banco Postgres em: ${parsedUrl.hostname}:${parsedUrl.port || 5432}${parsedUrl.pathname}`);
    } catch {
      app.log.warn('Não foi possível obter detalhes do banco de dados a partir da DATABASE_URL.');
    }
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void bootstrap();

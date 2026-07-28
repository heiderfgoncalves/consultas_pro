import { buildApp } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';
import { redis } from './lib/redis';

async function bootstrapLocal() {
  const app = await buildApp();
  let closing = false;

  const close = async (signal: string) => {
    if (closing) return;
    closing = true;
    app.log.info({ signal }, 'local_server_stopping');
    await app.close();
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.once('SIGINT', () => void close('SIGINT'));
  process.once('SIGTERM', () => void close('SIGTERM'));

  try {
    await app.listen({
      host: '127.0.0.1',
      port: env.PORT,
    });
    app.log.info(
      { host: '127.0.0.1', port: env.PORT, worker: false },
      'local_read_only_server_started',
    );
  } catch (error) {
    app.log.error({ error }, 'local_server_start_failed');
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(1);
  }
}

void bootstrapLocal();

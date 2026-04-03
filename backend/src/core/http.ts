import type { FastifyReply } from 'fastify';

export function ok<T>(reply: FastifyReply, data: T, statusCode = 200) {
  return reply.status(statusCode).send({
    success: true,
    data,
  });
}

export function fail(reply: FastifyReply, statusCode: number, code: string, message: string, details?: unknown) {
  return reply.status(statusCode).send({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
}

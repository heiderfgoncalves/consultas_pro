import { createHash } from 'node:crypto';

/**
 * Suporte a produtos assincronos (202 Accepted + polling).
 *
 * A Brasil Cred aceita a consulta com `202`, cobra no aceite e entrega o
 * resultado depois, via `GET /consultations/{id}`. Sem isto, nenhuma chamada a
 * `POST /consult/*` funciona: `Idempotency-Key` e obrigatorio desde 2026-04-27
 * e o corpo do `202` nao carrega dado de provedor, apenas a URL de polling.
 */

/** Estados publicos possiveis de uma consulta assincrona. */
export type AsyncConsultationStatus =
  | 'processing'
  | 'success'
  | 'partial'
  | 'error';

export type AsyncAcceptedEnvelope = {
  consultationId: string | null;
  pollUrl: string | null;
  retryAfterSeconds: number;
};

export type AsyncPollOutcome =
  | { kind: 'ready'; status: 'success' | 'partial'; payload: Record<string, unknown> }
  | { kind: 'pending'; retryAfterSeconds: number }
  | { kind: 'failed'; status: 'error'; message: string; refundExpected: boolean };

const MIN_KEY_LENGTH = 16;
const MAX_KEY_LENGTH = 64;
const DEFAULT_RETRY_SECONDS = 10;
/** Teto de seguranca: ~10 minutos a 10s por tentativa. */
export const MAX_POLL_ATTEMPTS = 60;

/**
 * Chave de idempotencia deterministica: mesmo documento, mesmo solicitante e
 * mesmo dia produzem a mesma chave. Um retry apos falha de rede reaproveita a
 * consulta ja aceita em vez de gerar cobranca nova.
 */
export function buildIdempotencyKey(input: {
  document: string;
  requesterId: string;
  isoDate: string;
}): string {
  const normalizedDocument = input.document.replace(/\D/g, '');
  const day = input.isoDate.slice(0, 10);
  const digest = createHash('sha256')
    .update(`${normalizedDocument}|${input.requesterId}|${day}`)
    .digest('hex');
  // Hex puro: alfanumerico por construcao, dentro da faixa exigida.
  return digest.slice(0, MAX_KEY_LENGTH);
}

export function isValidIdempotencyKey(key: string): boolean {
  return (
    key.length >= MIN_KEY_LENGTH &&
    key.length <= MAX_KEY_LENGTH &&
    /^[a-zA-Z0-9]+$/.test(key)
  );
}

function readRetryAfter(
  payload: Record<string, unknown>,
  header: string | null,
): number {
  const fromPayload = payload.retry_after_seconds;
  if (typeof fromPayload === 'number' && Number.isFinite(fromPayload) && fromPayload > 0) {
    return fromPayload;
  }
  const fromHeader = header ? Number.parseInt(header, 10) : Number.NaN;
  if (Number.isFinite(fromHeader) && fromHeader > 0) return fromHeader;
  return DEFAULT_RETRY_SECONDS;
}

/** Interpreta o `202 Accepted`. Retorna null quando a resposta nao e um aceite. */
export function parseAcceptedEnvelope(
  statusCode: number,
  payload: unknown,
  retryAfterHeader: string | null = null,
): AsyncAcceptedEnvelope | null {
  if (statusCode !== 202) return null;
  const body = (payload ?? {}) as Record<string, unknown>;
  return {
    consultationId:
      typeof body.consultation_id === 'string' ? body.consultation_id : null,
    pollUrl: typeof body.poll_url === 'string' ? body.poll_url : null,
    retryAfterSeconds: readRetryAfter(body, retryAfterHeader),
  };
}

/**
 * Classifica uma resposta de polling.
 *
 * `partial` e faturavel e entrega relatorio com os blocos disponiveis — nao e
 * erro. `error` dispara estorno automatico no provedor.
 */
export function classifyPollResponse(
  statusCode: number,
  payload: unknown,
  retryAfterHeader: string | null = null,
): AsyncPollOutcome {
  const body = (payload ?? {}) as Record<string, unknown>;
  const status = body.status;

  if (statusCode === 202 || status === 'processing') {
    return {
      kind: 'pending',
      retryAfterSeconds: readRetryAfter(body, retryAfterHeader),
    };
  }

  if (statusCode >= 200 && statusCode < 300) {
    if (status === 'success' || status === 'partial') {
      return { kind: 'ready', status, payload: body };
    }
    if (status === 'error') {
      return {
        kind: 'failed',
        status: 'error',
        message:
          typeof body.detail === 'string'
            ? body.detail
            : 'A consulta falhou no provedor.',
        refundExpected: true,
      };
    }
    // Corpo 2xx sem status reconhecido: trata como pendente, nunca como sucesso.
    return { kind: 'pending', retryAfterSeconds: readRetryAfter(body, retryAfterHeader) };
  }

  // 502 upstream_failed tem estorno automatico em curso no provedor.
  const refundExpected = statusCode === 502 || statusCode === 504;
  return {
    kind: 'failed',
    status: 'error',
    message:
      typeof body.detail === 'string'
        ? body.detail
        : `Provedor respondeu ${statusCode}.`,
    refundExpected,
  };
}

/** Decide se vale uma nova tentativa, respeitando o teto de seguranca. */
export function shouldKeepPolling(attempt: number): boolean {
  return attempt < MAX_POLL_ATTEMPTS;
}

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildIdempotencyKey,
  classifyPollResponse,
  isValidIdempotencyKey,
  parseAcceptedEnvelope,
  shouldKeepPolling,
  MAX_POLL_ATTEMPTS,
} from './async-consultation.service';

const base = {
  document: '11.222.333/0001-81',
  requesterId: 'user-1',
  isoDate: '2026-07-31T14:00:00.000Z',
};

test('chave de idempotência é determinística e válida', () => {
  const key = buildIdempotencyKey(base);
  assert.ok(isValidIdempotencyKey(key), `chave inválida: ${key}`);
  // Mesmo documento com mascara diferente gera a mesma chave.
  assert.equal(key, buildIdempotencyKey({ ...base, document: '11222333000181' }));
  // Mesma consulta em horas diferentes do mesmo dia nao recobra.
  assert.equal(
    key,
    buildIdempotencyKey({ ...base, isoDate: '2026-07-31T23:59:00.000Z' }),
  );
});

test('chave muda com documento, solicitante ou dia', () => {
  const key = buildIdempotencyKey(base);
  assert.notEqual(key, buildIdempotencyKey({ ...base, document: '11222333000182' }));
  assert.notEqual(key, buildIdempotencyKey({ ...base, requesterId: 'user-2' }));
  assert.notEqual(
    key,
    buildIdempotencyKey({ ...base, isoDate: '2026-08-01T00:00:00.000Z' }),
  );
});

test('rejeita chave fora do formato exigido pela Brasil Cred', () => {
  assert.equal(isValidIdempotencyKey('too-short'), false);
  assert.equal(isValidIdempotencyKey('com-hifen-nao-alfanumerico-xxxx'), false);
  assert.equal(isValidIdempotencyKey('a'.repeat(65)), false);
  assert.equal(isValidIdempotencyKey('a'.repeat(16)), true);
});

test('interpreta o 202 Accepted', () => {
  const envelope = parseAcceptedEnvelope(202, {
    consultation_id: 'abc',
    poll_url: '/consultations/abc',
    retry_after_seconds: 10,
    status: 'processing',
  });
  assert.equal(envelope?.consultationId, 'abc');
  assert.equal(envelope?.retryAfterSeconds, 10);
  // 201 sincrono nao e aceite assincrono.
  assert.equal(parseAcceptedEnvelope(201, { status: 'success' }), null);
});

test('usa o header Retry-After quando o corpo não traz o intervalo', () => {
  const envelope = parseAcceptedEnvelope(202, { consultation_id: 'x' }, '25');
  assert.equal(envelope?.retryAfterSeconds, 25);
  // Sem nenhuma fonte, cai no padrao de 10s da documentacao.
  assert.equal(parseAcceptedEnvelope(202, {})?.retryAfterSeconds, 10);
});

test('processing continua o polling', () => {
  const outcome = classifyPollResponse(200, { status: 'processing' });
  assert.equal(outcome.kind, 'pending');
});

test('success e partial entregam resultado — partial não é falha', () => {
  const ok = classifyPollResponse(200, { status: 'success', score: { value: 1 } });
  assert.equal(ok.kind, 'ready');

  const partial = classifyPollResponse(200, { status: 'partial' });
  assert.equal(partial.kind, 'ready');
  assert.equal(partial.kind === 'ready' && partial.status, 'partial');
});

test('error e falhas de upstream marcam estorno esperado', () => {
  const err = classifyPollResponse(200, { status: 'error', detail: 'quebrou' });
  assert.equal(err.kind, 'failed');
  assert.equal(err.kind === 'failed' && err.refundExpected, true);

  const upstream = classifyPollResponse(502, { detail: 'upstream_failed' });
  assert.equal(upstream.kind === 'failed' && upstream.refundExpected, true);

  // 401 e erro nosso, nao do provedor: sem estorno.
  const auth = classifyPollResponse(401, { detail: 'unauthorized' });
  assert.equal(auth.kind === 'failed' && auth.refundExpected, false);
});

test('2xx sem status reconhecido nunca vira sucesso', () => {
  const outcome = classifyPollResponse(200, { algo: 'inesperado' });
  assert.equal(outcome.kind, 'pending');
});

test('polling tem teto de segurança', () => {
  assert.equal(shouldKeepPolling(0), true);
  assert.equal(shouldKeepPolling(MAX_POLL_ATTEMPTS - 1), true);
  assert.equal(shouldKeepPolling(MAX_POLL_ATTEMPTS), false);
});

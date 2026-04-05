import type { FastifyInstance } from 'fastify';
import type { Provider, ProviderProduct } from '@prisma/client';
import { AppError } from '../../core/errors';
import { env } from '../../config/env';
import { renderTemplateObject } from '../../lib/template-render';

type ProviderLike = Provider & {
  defaultHeaders: unknown;
  credentials: unknown;
};

type OperationLike = {
  path: string;
  method: string;
  headersTemplate: unknown;
  queryTemplate: unknown;
  bodyTemplate: unknown;
  timeoutMs: number | null;
};

export async function callProviderOperation(
  app: FastifyInstance,
  provider: ProviderLike,
  operation: OperationLike,
  context: Record<string, unknown>,
) {
  const url = new URL(operation.path, provider.baseUrl);

  const query = renderTemplateObject<Record<string, string | number | boolean | null | undefined>>(
    (operation.queryTemplate ?? {}) as Record<string, string | number | boolean | null | undefined>,
    context,
  );

  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = {
    ...((provider.defaultHeaders as Record<string, string>) ?? {}),
    ...(renderTemplateObject<Record<string, string>>((operation.headersTemplate ?? {}) as Record<string, string>, context)),
    ...buildAuthHeaders(provider),
  };

  const body = renderTemplateObject(operation.bodyTemplate, context);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), operation.timeoutMs ?? env.PROVIDER_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: operation.method,
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: ['GET', 'DELETE'].includes(operation.method) ? undefined : JSON.stringify(body ?? {}),
      signal: controller.signal,
    });

    const text = await response.text();

    let payload: unknown = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = { rawText: text };
    }

    return {
      request: {
        url: url.toString(),
        method: operation.method,
        headers,
        body,
      },
      response: {
        statusCode: response.status,
        payload,
      },
    };
  } catch (error) {
    app.log.error({ error }, 'provider_call_failed');
    throw new AppError(502, 'PROVIDER_CALL_FAILED', 'Falha ao chamar o provedor', error);
  } finally {
    clearTimeout(timeout);
  }
}

export async function callProviderProduct(
  app: FastifyInstance,
  provider: ProviderLike,
  product: ProviderProduct,
  context: Record<string, unknown>,
  callOpts?: { timeoutMsOverride?: number | null },
) {
  const timeoutMs = callOpts?.timeoutMsOverride ?? product.timeoutMs;
  return callProviderOperation(app, provider, {
    path: product.endpointPath,
    method: product.method,
    headersTemplate: product.headersTemplate,
    queryTemplate: product.queryTemplate,
    bodyTemplate: product.bodyTemplate,
    timeoutMs,
  }, context);
}

function buildAuthHeaders(provider: ProviderLike) {
  const credentials = (provider.credentials ?? {}) as Record<string, unknown>;

  switch (provider.authType) {
    case 'API_KEY': {
      const headerName = String(credentials.headerName ?? 'x-api-key');
      const value = String(credentials.value ?? '');
      return { [headerName]: value };
    }

    case 'BEARER': {
      return {
        authorization: `Bearer ${String(credentials.token ?? '')}`,
      };
    }

    case 'BASIC_AUTH': {
      const username = String(credentials.username ?? '');
      const password = String(credentials.password ?? '');
      const encoded = Buffer.from(`${username}:${password}`).toString('base64');
      return { authorization: `Basic ${encoded}` };
    }

    case 'CUSTOM': {
      return (credentials.headers as Record<string, string>) ?? {};
    }

    default:
      return {};
  }
}

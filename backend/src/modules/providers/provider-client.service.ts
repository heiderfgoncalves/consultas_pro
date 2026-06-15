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

function evaluateSimpleExpression(expr: string, context: Record<string, unknown>): boolean {
  const cleanExpr = expr.trim();
  if (!cleanExpr) return false;

  if (cleanExpr.includes('||')) {
    return cleanExpr.split('||').some((p) => evaluateSimpleExpression(p, context));
  }

  if (cleanExpr.includes('&&')) {
    return cleanExpr.split('&&').every((p) => evaluateSimpleExpression(p, context));
  }

  if (cleanExpr.includes('==')) {
    const parts = cleanExpr.split('==').map((s) => s.trim());
    const leftVal = parts[0].startsWith('$') || parts[0] in context ? (context[parts[0].replace('$', '')] ?? parts[0]) : parts[0].replace(/['"]/g, '');
    const rightVal = parts[1].startsWith('$') || parts[1] in context ? (context[parts[1].replace('$', '')] ?? parts[1]) : parts[1].replace(/['"]/g, '');
    return String(leftVal) === String(rightVal);
  }

  if (cleanExpr.includes('!=')) {
    const parts = cleanExpr.split('!=').map((s) => s.trim());
    const leftVal = parts[0].startsWith('$') || parts[0] in context ? (context[parts[0].replace('$', '')] ?? parts[0]) : parts[0].replace(/['"]/g, '');
    const rightVal = parts[1].startsWith('$') || parts[1] in context ? (context[parts[1].replace('$', '')] ?? parts[1]) : parts[1].replace(/['"]/g, '');
    return String(leftVal) !== String(rightVal);
  }

  if (cleanExpr.startsWith('!')) {
    const varName = cleanExpr.slice(1).trim();
    const val = varName in context ? context[varName] : varName.replace(/['"]/g, '');
    return val === 'false' || val === '0' || val === '' || val === 'null' || val === 'undefined' || val === false || val === null || val === undefined;
  }

  const val = cleanExpr in context ? context[cleanExpr] : cleanExpr.replace(/['"]/g, '');
  return !(val === 'false' || val === '0' || val === '' || val === 'null' || val === 'undefined' || val === false || val === null || val === undefined);
}

export async function callProviderOperation(
  app: FastifyInstance,
  provider: ProviderLike,
  operation: OperationLike,
  context: Record<string, unknown>,
) {
  const url = new URL(operation.path, provider.baseUrl);

  let mergedContext = { ...context };
  if (provider.credentials && typeof provider.credentials === 'object') {
    const credsObj = provider.credentials as any;
    if (credsObj.custom_variables && typeof credsObj.custom_variables === 'object') {
      mergedContext = {
        ...credsObj.custom_variables,
        ...mergedContext, // Chamadas reais de consultas (parâmetros como cpf) têm prioridade
      };
    }
  }

  // Adiciona o helper lógico 'cond' para o Mustache resolver condicionais complexas
  (mergedContext as any).cond = function() {
    return function(this: any, text: string, render: (t: string) => string) {
      const rendered = render(text);
      const parts = rendered.split('|');
      if (parts.length < 2) return rendered;

      const expression = parts[0].trim();
      const content = parts.slice(1).join('|');

      if (evaluateSimpleExpression(expression, mergedContext)) {
        return content;
      }
      return '';
    };
  };

  // Injetar variáveis de documento simplificadas a partir de context ou de context.subject
  let rawDoc: string | undefined = undefined;
  let docType: string | undefined = undefined;

  if (context && typeof context === 'object') {
    if (typeof context.document === 'string') {
      rawDoc = context.document;
    } else if (typeof context.subject === 'object' && context.subject !== null) {
      const subjectObj = context.subject as any;
      if (typeof subjectObj.document === 'string') {
        rawDoc = subjectObj.document;
      }
      if (typeof subjectObj.type === 'string') {
        docType = subjectObj.type;
      }
    }
  }

  if (rawDoc) {
    const cleanedDoc = rawDoc.replace(/[^\d]/g, '');
    const isCpf = docType === 'CPF' || (!docType && cleanedDoc.length <= 11);

    const docVars = {
      document: cleanedDoc,
      documento: cleanedDoc,
      DOCUMENT: cleanedDoc,
      DOCUMENTO: cleanedDoc,
      is_cpf: isCpf,
      is_cnpj: !isCpf,
      IS_CPF: isCpf,
      IS_CNPJ: !isCpf,
    };

    mergedContext = {
      ...docVars,
      ...mergedContext,
    };
  }

  const query = renderTemplateObject<Record<string, string | number | boolean | null | undefined>>(
    (operation.queryTemplate ?? {}) as Record<string, string | number | boolean | null | undefined>,
    mergedContext,
  );

  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = {
    ...((provider.defaultHeaders as Record<string, string>) ?? {}),
    ...(renderTemplateObject<Record<string, string>>((operation.headersTemplate ?? {}) as Record<string, string>, mergedContext)),
    ...buildAuthHeaders(provider),
  };

  const body = renderTemplateObject(operation.bodyTemplate, mergedContext);

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

import { env } from '../../config/env';
import { AppError } from '../../core/errors';

/**
 * Acesso ao portal Brasil Cred com credencial de usuario.
 *
 * A API contratada (`bc_live_*`) entrega um recorte de 34 campos. O portal
 * consome o mesmo dado por outro caminho — Supabase REST, autenticado com o JWT
 * do usuario — e recebe o payload completo, com as pernas de PGFN, SCR, bureaus
 * e quadro societario.
 *
 * Este servico reproduz esse caminho: autentica, guarda o token enquanto ele
 * vale e busca a consulta inteira.
 *
 * Duas cautelas incorporadas por design:
 *
 * 1. O payload traz CPF completo de socios. `maskSensitive` mascara antes de
 *    qualquer persistencia — a plataforma nunca guarda nem repassa o documento
 *    inteiro de terceiro.
 * 2. Nao e a interface contratada. Se a Brasil Cred alterar o Supabase, o RLS
 *    ou a chave publica, este caminho para de funcionar sem aviso. Toda falha
 *    aqui deve degradar para a API oficial, nunca derrubar a consulta.
 */

export type PortalSession = {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch em milissegundos. */
  expiresAt: number;
};

export type PortalConsultation = {
  id: string;
  document: string;
  queryType: string;
  status: string;
  createdAt: string | null;
  completedAt: string | null;
  /** Payload completo do provedor, ja com PII de terceiro mascarada. */
  rawData: Record<string, unknown>;
  /** Contagem de caminhos folha, para registro de cobertura. */
  leafPathCount: number;
};

const SUPABASE_URL = 'https://sbvhtaqqirjmlacqspuf.supabase.co';
/** Margem para renovar antes de expirar de fato. */
const RENEW_MARGIN_MS = 120_000;

let cached: PortalSession | null = null;

function credentials() {
  const email = process.env.USER ?? '';
  // A variavel foi criada com este nome no ambiente; aceitamos a grafia correta
  // tambem, para quando for normalizada.
  const password = process.env.PASSWORWD ?? process.env.PASSWORD ?? '';
  const anonKey = process.env.BRASIL_CRED_PORTAL_ANON_KEY ?? '';
  if (!email || !password) {
    throw new AppError(
      500,
      'PORTAL_CREDENTIALS_MISSING',
      'Credenciais do portal Brasil Cred ausentes no ambiente.',
    );
  }
  if (!anonKey) {
    throw new AppError(
      500,
      'PORTAL_ANON_KEY_MISSING',
      'Chave publica do portal Brasil Cred ausente no ambiente.',
    );
  }
  return { email, password, anonKey };
}

/** Autentica e devolve a sessao, reaproveitando o token enquanto ele vale. */
export async function getPortalSession(force = false): Promise<PortalSession> {
  if (!force && cached && cached.expiresAt - RENEW_MARGIN_MS > Date.now()) {
    return cached;
  }
  const { email, password, anonKey } = credentials();
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!response.ok) {
    throw new AppError(
      502,
      'PORTAL_LOGIN_FAILED',
      `Falha ao autenticar no portal Brasil Cred (${response.status}).`,
    );
  }
  const body = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };
  cached = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token ?? null,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000,
  };
  return cached;
}

/** Chaves cujo valor e documento de pessoa fisica e nunca deve ser persistido. */
const CPF_KEYS = /^(cpf|cpfSocio|documentoSocio|cpfCnpjSocio)$/i;
/** Chaves de contato de terceiro, tambem fora do que repassamos. */
const CONTACT_KEYS = /^(email|emails|telefone|telefones|celular)$/i;

function maskDocument(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11) return value;
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

/**
 * Mascara documento e contato de pessoa fisica em qualquer profundidade.
 * O CNPJ consultado e preservado: e o objeto da consulta, nao dado de terceiro.
 */
export function maskSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(maskSensitive);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        if (typeof item === 'string' && CPF_KEYS.test(key)) {
          return [key, maskDocument(item)];
        }
        if (typeof item === 'string' && CONTACT_KEYS.test(key) && item.length > 0) {
          return [key, '[protegido]'];
        }
        return [key, maskSensitive(item)];
      }),
    );
  }
  return value;
}

function countLeaves(value: unknown, seen = new Set<string>(), path = ''): number {
  if (Array.isArray(value)) {
    value.forEach((item) => countLeaves(item, seen, `${path}[*]`));
    return seen.size;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value as Record<string, unknown>)) {
      countLeaves(
        (value as Record<string, unknown>)[key],
        seen,
        path ? `${path}.${key}` : key,
      );
    }
    return seen.size;
  }
  seen.add(path);
  return seen.size;
}

/**
 * Busca a consulta completa pelo id. Retorna null quando o portal nao a
 * reconhece, para o chamador cair na API oficial sem quebrar o fluxo.
 */
export async function fetchPortalConsultation(
  consultationId: string,
): Promise<PortalConsultation | null> {
  const { anonKey } = credentials();
  const session = await getPortalSession();

  const request = (token: string) =>
    fetch(
      `${SUPABASE_URL}/rest/v1/consultations?id=eq.${encodeURIComponent(consultationId)}&select=*`,
      {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

  let response = await request(session.accessToken);
  if (response.status === 401) {
    // Token pode ter sido invalidado antes do prazo; uma renovacao e suficiente.
    const renewed = await getPortalSession(true);
    response = await request(renewed.accessToken);
  }
  if (!response.ok) {
    throw new AppError(
      502,
      'PORTAL_FETCH_FAILED',
      `Portal Brasil Cred respondeu ${response.status} para a consulta ${consultationId}.`,
    );
  }

  const rows = (await response.json()) as Array<Record<string, unknown>>;
  const row = rows[0];
  if (!row) return null;

  const rawData = maskSensitive(row.raw_data ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id ?? consultationId),
    document: String(row.document ?? ''),
    queryType: String(row.query_type ?? ''),
    status: String(row.status ?? ''),
    createdAt: row.created_at ? String(row.created_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    rawData,
    leafPathCount: countLeaves(rawData),
  };
}

/** URL da pagina de impressao do portal, usada para gerar o PDF. */
export function portalPrintUrl(consultationId: string): string {
  const base = (process.env.PORTAL ?? 'https://brasilcred.com.br/auth/login')
    .replace(/\/auth\/login\/?$/, '');
  return `${base}/consultas/resultado/${encodeURIComponent(consultationId)}/print`;
}

/**
 * Captura o PDF original da consulta na pagina de impressao do portal.
 *
 * A autenticacao e feita pela propria UI: preenchemos e-mail e senha e deixamos
 * a SPA gravar a sessao no formato que ela espera. Reproduzir a estrutura
 * interna do Supabase a mao se mostrou fragil; o login pela tela sobrevive a
 * mudancas internas do provedor.
 *
 * O chamador recebe o PDF exatamente como o cliente da Brasil Cred o veria.
 * Atencao: este PDF e a imagem da pagina deles e ainda contem CPF completo de
 * socio — o mascaramento de `maskSensitive` vale para o JSON que persistimos,
 * nao para o documento renderizado.
 */
export async function capturePortalPdf(consultationId: string): Promise<Buffer> {
  const email = process.env.USER ?? '';
  const password = process.env.PASSWORWD ?? process.env.PASSWORD ?? '';
  if (!email || !password) {
    throw new AppError(
      500,
      'PORTAL_CREDENTIALS_MISSING',
      'Credenciais do portal Brasil Cred ausentes no ambiente.',
    );
  }

  const loginUrl = process.env.PORTAL ?? 'https://brasilcred.com.br/auth/login';
  const printUrl = portalPrintUrl(consultationId);
  const timeoutMs = Number(process.env.PORTAL_PDF_TIMEOUT_MS ?? 120_000);

  // Import dinamico: puppeteer so e carregado quando ha captura, mantendo o
  // servidor leve nas rotas que nao usam o portal.
  const puppeteer = (await import('puppeteer')).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    await page.goto(loginUrl, { waitUntil: 'networkidle0', timeout: timeoutMs });
    await page.type('input[type="email"]', email, { delay: 15 });
    await page.type('input[type="password"]', password, { delay: 15 });
    await Promise.all([
      page.click('button[type="submit"]'),
      page
        .waitForNavigation({ waitUntil: 'networkidle0', timeout: 60_000 })
        .catch(() => undefined),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    if (/\/auth\/login/.test(page.url())) {
      throw new AppError(
        502,
        'PORTAL_LOGIN_FAILED',
        'Nao foi possivel autenticar no portal Brasil Cred para gerar o PDF.',
      );
    }

    const response = await page.goto(printUrl, {
      waitUntil: 'networkidle0',
      timeout: timeoutMs,
    });
    if (response && response.status() >= 400) {
      throw new AppError(
        502,
        'PORTAL_PRINT_FAILED',
        `Portal respondeu ${response.status()} na pagina de impressao.`,
      );
    }
    // Da tempo de a pagina consultar o Supabase e montar o relatorio.
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const pdf = await page.pdf({
      width: '794px',
      height: '1123px',
      printBackground: true,
    });
    if (pdf.length < 20_000) {
      // PDF minusculo indica que caiu na tela de login em vez do relatorio.
      throw new AppError(
        502,
        'PORTAL_PDF_EMPTY',
        'O PDF gerado pelo portal veio vazio ou incompleto.',
      );
    }
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export const __testing = { maskDocument, countLeaves };

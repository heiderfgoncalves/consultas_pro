const TOKEN_KEY = 'cp_access_token';
const USER_KEY = 'cp_user_json';
const PREVIEW_KEY = 'cp_preview_level';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredUserJson(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function setStoredUserJson(json: string | null) {
  try {
    if (json) localStorage.setItem(USER_KEY, json);
    else localStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredPreviewLevel(): string | null {
  try {
    return localStorage.getItem(PREVIEW_KEY);
  } catch {
    return null;
  }
}

export function setStoredPreviewLevel(level: string | null) {
  try {
    if (level !== null) localStorage.setItem(PREVIEW_KEY, level);
    else localStorage.removeItem(PREVIEW_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function apiBase(): string {
  const base = import.meta.env.VITE_API_URL as string | undefined;
  if (!base) return '';
  return base.replace(/\/$/, '');
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;
  const token = options.token ?? getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });
  const json = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: { code: string; message: string; details?: unknown };
  };

  if (!json.success || json.error) {
    const err = json.error;
    throw new ApiError(
      err?.message ?? 'Erro na requisição',
      err?.code ?? 'UNKNOWN',
      res.status,
      err?.details,
    );
  }

  return json.data as T;
}

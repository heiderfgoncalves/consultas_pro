// Lightweight HTTP client compatible with the original Consultas.Pro backend
// envelope: { success, data, error }. Reads token from localStorage so the
// editor works out-of-the-box once the user is logged into the local API.

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const TOKEN_KEY = "cp_access_token";

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

export function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch { /* ignore */ }
}

export function apiBase(): string {
  const base = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3333";
  return base.replace(/\/$/, "");
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;
  const { token: explicitToken, ...rest } = options;
  const token = explicitToken ?? getStoredToken();

  const headers = new Headers(rest.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const body = rest.body;
  if (typeof body === "string" && body.length > 0 && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(url, { ...rest, headers });
  } catch (e) {
    throw new ApiError(
      `Não foi possível alcançar ${url}. Confira VITE_API_URL e se o backend local está rodando.`,
      "NETWORK",
      0,
      e,
    );
  }

  let json: { success?: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null = null;
  try { json = await res.json(); } catch { /* keep null */ }

  if (!res.ok || !json || json.success === false || json.error) {
    const err = json?.error;
    throw new ApiError(
      err?.message ?? `Erro ${res.status} em ${path}`,
      err?.code ?? `HTTP_${res.status}`,
      res.status,
      err?.details,
    );
  }
  return (json.data ?? (json as unknown as T)) as T;
}

export async function login(email: string, password: string) {
  return apiRequest<{ accessToken: string; user?: unknown }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

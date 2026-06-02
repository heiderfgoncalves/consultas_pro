/**
 * Expression engine — supports $path.sub, {$path.sub} and free-text interpolation.
 */

export function resolvePath(ctx: unknown, path: string): unknown {
  const parts = path.split(/[.[\]]/).filter(Boolean);
  let cur: unknown = ctx;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

const exprRe = /\{\$([\w.[\]]+)\}|\$([\w.[\]]+)/g;

export function interpolate(input: string, ctx: Record<string, unknown>): string {
  if (!input) return input;
  return input.replace(exprRe, (_match, a, b) => {
    const path = a ?? b;
    const v = resolvePath(ctx, path);
    if (v === undefined || v === null) return "";
    if (typeof v === "object") {
      try { return JSON.stringify(v); } catch { return String(v); }
    }
    return String(v);
  });
}

/** Returns raw value when the input is exactly one expression, otherwise interpolated string. */
export function evaluate(input: string, ctx: Record<string, unknown>): unknown {
  if (!input) return input;
  const trimmed = input.trim();
  const wholeRe = /^(?:\{\$([\w.[\]]+)\}|\$([\w.[\]]+))$/;
  const m = trimmed.match(wholeRe);
  if (m) return resolvePath(ctx, m[1] ?? m[2]);
  return interpolate(input, ctx);
}

/** Build dotted suggestion list from context. */
export function listPaths(ctx: Record<string, unknown>, max = 200): string[] {
  const out: string[] = [];
  const walk = (obj: unknown, prefix: string, depth: number) => {
    if (out.length >= max) return;
    if (obj == null || typeof obj !== "object" || depth > 4) return;
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const next = prefix ? `${prefix}.${k}` : k;
      out.push("$" + next);
      if (out.length >= max) return;
      if (v && typeof v === "object" && !Array.isArray(v)) walk(v, next, depth + 1);
    }
  };
  walk(ctx, "", 0);
  return out;
}

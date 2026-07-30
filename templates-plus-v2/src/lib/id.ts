export const nanoid = (n = 8) => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let s = "";
  const r = globalThis.crypto?.getRandomValues?.(new Uint8Array(n));
  for (let i = 0; i < n; i++) s += chars[(r ? r[i] : Math.floor(Math.random() * 256)) % chars.length];
  return s;
};

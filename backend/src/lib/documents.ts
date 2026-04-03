export function normalizeDocument(input: string) {
  return input.replace(/\D/g, '');
}

export function maskDocument(value: string) {
  const doc = normalizeDocument(value);

  if (doc.length === 11) {
    return `${doc.slice(0, 3)}.${doc.slice(3, 6)}.${doc.slice(6, 9)}-${doc.slice(9)}`;
  }

  if (doc.length === 14) {
    return `${doc.slice(0, 2)}.${doc.slice(2, 5)}.${doc.slice(5, 8)}/${doc.slice(8, 12)}-${doc.slice(12)}`;
  }

  return value;
}

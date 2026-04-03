function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${key}:${stableStringify(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function mergeValues(baseValue: unknown, incomingValue: unknown): unknown {
  if (baseValue === null || baseValue === undefined) return incomingValue;
  if (incomingValue === null || incomingValue === undefined) return baseValue;

  if (Array.isArray(baseValue) && Array.isArray(incomingValue)) {
    const output = [...baseValue];
    const seen = new Set(output.map(stableStringify));

    for (const item of incomingValue) {
      const fingerprint = stableStringify(item);
      if (!seen.has(fingerprint)) {
        output.push(item);
        seen.add(fingerprint);
      }
    }

    return output;
  }

  if (isPlainObject(baseValue) && isPlainObject(incomingValue)) {
    const merged: Record<string, unknown> = { ...baseValue };

    for (const [key, value] of Object.entries(incomingValue)) {
      merged[key] = mergeValues(merged[key], value);
    }

    return merged;
  }

  return baseValue ?? incomingValue;
}

export function mergeNormalizedPayloads(payloads: Array<Record<string, unknown>>) {
  return payloads.reduce<Record<string, unknown>>((acc, payload) => {
    for (const [key, value] of Object.entries(payload)) {
      acc[key] = mergeValues(acc[key], value);
    }
    return acc;
  }, {});
}

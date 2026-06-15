// @ts-ignore
import Mustache from 'mustache';

export function renderTemplateObject<T = unknown>(input: T, context: Record<string, unknown>): T {
  if (input === null || input === undefined) return input;

  if (typeof input === 'string') {
    const cleanedInput = input.replace(/\$\{\{document\}\}/g, '{{document}}');
    return Mustache.render(cleanedInput, context) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => renderTemplateObject(item, context)) as T;
  }

  if (typeof input === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      output[key] = renderTemplateObject(value, context);
    }
    return output as T;
  }

  return input;
}

import fs from 'fs';
import { resolveExpression } from './src/features/templates-drawer/engine/resolveExpression.js';
import { parseNumber } from './src/features/templates-drawer/engine/interpolate.js';

const data = JSON.parse(fs.readFileSync('../logs/complata_brasil_preview_1.json', 'utf8'));

const arr = resolveExpression('$[*].totalapontado', data) as any[];
console.log('Result array for totalapontado:', arr);

let sum = 0;
for (const item of (arr || [])) {
  sum += parseNumber(item);
}
console.log('Sum totalapontado:', sum);

const arrDed = resolveExpression('$[*].totaldeduzido', data) as any[];
console.log('Result array for totaldeduzido:', arrDed);

let sumDed = 0;
for (const item of (arrDed || [])) {
  sumDed += parseNumber(item);
}
console.log('Sum totaldeduzido:', sumDed);

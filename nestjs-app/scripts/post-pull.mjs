#!/usr/bin/env node
// `pnpm db:pull` orqali drizzle-kit pull qilingach avtomatik chaqiriladi.
// Maqsad:
//   1. bigserial mode "bigint" → "number" (Number().MAX_SAFE_INTEGER bizga yetadi)
//   2. Buzuq foreignKey bloklarini olib tashlash (drizzle-kit pull bug)
//   3. Buzuq relations.ts'ni saqlab qolmaslik (qo'lda yozilgani bilan almashtirish)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const schemaPath = join(root, 'src/db/schema.ts');
const relationsPath = join(root, 'src/db/relations.ts');

// 1) bigserial bigint → number
let schema = readFileSync(schemaPath, 'utf8');
const before = (schema.match(/bigserial\(\{ mode: "bigint" \}\)/g) || []).length;
schema = schema.replaceAll(
  'bigserial({ mode: "bigint" })',
  'bigserial({ mode: "number" })',
);

// 2) Buzuq foreignKey({...}) bloklarini olib tashlash
function removeFkBlocks(text) {
  let out = '';
  let i = 0;
  let removed = 0;
  for (;;) {
    const idx = text.indexOf('foreignKey({', i);
    if (idx === -1) {
      out += text.slice(i);
      break;
    }
    const lineStart = text.lastIndexOf('\n', idx) + 1;
    out += text.slice(i, lineStart);
    let j = idx + 'foreignKey'.length;
    if (text[j] !== '(') break;
    let depth = 1;
    j++;
    while (j < text.length && depth > 0) {
      const c = text[j];
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === '"' || c === "'") {
        const q = c;
        j++;
        while (j < text.length && text[j] !== q) {
          if (text[j] === '\\') j++;
          j++;
        }
      }
      j++;
    }
    while (j < text.length) {
      while (j < text.length && /[\s]/.test(text[j])) j++;
      if (text[j] !== '.') break;
      j++;
      while (j < text.length && /\w/.test(text[j])) j++;
      if (text[j] === '(') {
        let p = 1;
        j++;
        while (j < text.length && p > 0) {
          const c = text[j];
          if (c === '(') p++;
          else if (c === ')') p--;
          else if (c === '"' || c === "'") {
            const q = c;
            j++;
            while (j < text.length && text[j] !== q) {
              if (text[j] === '\\') j++;
              j++;
            }
          }
          j++;
        }
      }
    }
    if (text[j] === ',') j++;
    if (text[j] === '\n') j++;
    i = j;
    removed++;
  }
  return { text: out, removed };
}

const { text: cleanedSchema, removed: fksRemoved } = removeFkBlocks(schema);
writeFileSync(schemaPath, cleanedSchema);

// 3) relations.ts qo'lda yozilgan — drizzle-kit auto-generate'ini olib tashlamaslik kerak.
// Lekin agar drizzle-kit'ning yangi auto-generate'i fayl ustiga yozsa, biz nazorat qilolmaymiz.
// Hech bo'lmasa ogohlantirish chiqaramiz.
if (existsSync(relationsPath)) {
  const relations = readFileSync(relationsPath, 'utf8');
  if (relations.includes('defineRelations(schema, (r) => ({') &&
      !relations.includes('// Drizzle relations — qo\'lda yozilgan')) {
    console.warn(
      '\n⚠️  relations.ts auto-generate ko\'rinishida.',
      '\n   Qo\'lda yozilgan versiyangizni qayta tiklang yoki `git restore src/db/relations.ts`',
    );
  }
}

console.log(
  `✅ schema.ts cleanup: ${before} bigint → number, ${fksRemoved} broken FKs olib tashlandi.`,
);

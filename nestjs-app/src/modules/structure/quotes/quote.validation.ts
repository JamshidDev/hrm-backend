// Quote store validatsiyasi — Laravel QuoteController::store parity:
//   'text.uz'|'text.ru'|'text.en'|'author.uz'|'author.ru'|'author.en' => 'required|string'
//
// Laravel har nested kalitni MUSTAQIL tekshiradi: `text`/`author` butunlay yo'q
// bo'lsa ham 6 ta `<key> required` xato qaytaradi (`text.uz`, `text.ru`, ...).
// class-validator @ValidateNested esa parent yo'q bo'lsa nested'ni skip qiladi va
// `author must be an object` beradi — shuning uchun qo'lda tekshiramiz.
//
// Flat ValidationError[] (property = "text.uz") quramiz: humanize("text.uz")
// pastki chiziqsiz/customsiz aynan "text.uz" qaytaradi → builder Laravel-format
// (`(and N more errors)` + per-field errors) ni o'zi yasaydi.

import type { ValidationError } from 'class-validator';
import { LaravelValidationException } from '@/common/exceptions/validation.exception';

// Laravel rule ta'rifi tartibi — xatolar shu tartibda chiqadi.
const FIELDS = ['text', 'author'] as const;
const LANGS = ['uz', 'ru', 'en'] as const;

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

export function validateQuoteStore(body: unknown): void {
  const obj = (body ?? {}) as Record<string, unknown>;
  const errors: ValidationError[] = [];

  for (const field of FIELDS) {
    const group = obj[field];
    const groupObj =
      group && typeof group === 'object'
        ? (group as Record<string, unknown>)
        : undefined;

    for (const lang of LANGS) {
      const key = `${field}.${lang}`;
      const value = groupObj?.[lang];

      // required|string: yo'q bo'lsa → required (string implicit skip),
      // mavjud lekin string emas → string.
      if (isBlank(value)) {
        errors.push({ property: key, constraints: { isNotEmpty: 'required' } });
      } else if (typeof value !== 'string') {
        errors.push({ property: key, constraints: { isString: 'string' } });
      }
    }
  }

  if (errors.length) throw new LaravelValidationException(errors);
}

// Update — Laravel `sometimes|string`: faqat MAVJUD kalitlar tekshiriladi (required
// emas), keyin `$quote->update($validated)` — berilgan field'ning JSON column'i
// faqat berilgan sub-kalitlar bilan ALMASHTIRILADI (boshqa sub-kalitlar yo'qoladi),
// berilmagan field tegilmaydi. Tasdiqlangan partial set obyektini qaytaradi.
export interface QuotePartial {
  text?: Record<string, string>;
  author?: Record<string, string>;
}

export function validateQuoteUpdate(body: unknown): QuotePartial {
  const obj = (body ?? {}) as Record<string, unknown>;
  const errors: ValidationError[] = [];
  const result: QuotePartial = {};

  for (const field of FIELDS) {
    const group = obj[field];
    // Field yo'q yoki obyekt emas → `sometimes` ishlamaydi (data_get null) → skip.
    if (!group || typeof group !== 'object') continue;
    const g = group as Record<string, unknown>;
    const sub: Record<string, string> = {};

    for (const lang of LANGS) {
      if (!(lang in g)) continue; // faqat mavjud kalit (sometimes)
      const value = g[lang];
      if (typeof value !== 'string') {
        errors.push({
          property: `${field}.${lang}`,
          constraints: { isString: 'string' },
        });
      } else {
        sub[lang] = value;
      }
    }

    if (Object.keys(sub).length) result[field] = sub;
  }

  if (errors.length) throw new LaravelValidationException(errors);
  return result;
}

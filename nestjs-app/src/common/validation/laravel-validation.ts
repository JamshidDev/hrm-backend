// class-validator `ValidationError[]` → Laravel ValidationException body parity:
//   { message: "<1-xato> (and N more error[s])", errors: { field: [msg, ...] } }
//
// Laravel `Illuminate\Validation\ValidationException::summarize` + validation.php
// xabarlari bilan mos. Til: Accept-Language (uz default).

import type { ValidationError } from 'class-validator';
import {
  VALIDATION_ATTRIBUTES,
  VALIDATION_RULES,
  type ValLang,
} from '@/common/validation/laravel-validation.messages';

export interface LaravelValidationBody {
  message: string;
  errors: Record<string, string[]>;
}

// class-validator constraint kaliti → Laravel rule kaliti.
const CONSTRAINT_TO_RULE: Record<string, string> = {
  // required-oilasi
  isNotEmpty: 'required',
  isDefined: 'required',
  arrayNotEmpty: 'required',
  // tiplar
  isString: 'string',
  isInt: 'integer',
  isNumber: 'numeric',
  isNumberString: 'numeric',
  isArray: 'array',
  isBoolean: 'boolean',
  isBooleanString: 'boolean',
  isDateString: 'date',
  isDate: 'date',
  isEmail: 'email',
  isEnum: 'in',
  isIn: 'in',
  // chegaralar (numeric — class-validator @Min/@Max son uchun)
  min: 'min_numeric',
  max: 'max_numeric',
  arrayMinSize: 'min_string',
  arrayMaxSize: 'max_string',
  // same:other (custom @Match dekoratori — ValidatorConstraint name 'Match')
  Match: 'same',
};

// `required` aniqlovchi konstreyntlar — bular fail bo'lsa Laravel faqat `required`
// xabarini ko'rsatadi (tip qoidalari "implicit" o'tkazib yuboriladi).
const REQUIRED_CONSTRAINTS = new Set([
  'isNotEmpty',
  'isDefined',
  'arrayNotEmpty',
]);

// Bir field ichida bir nechta rule fail bo'lsa — barqaror tartib (Laravel rule tartibi
// taxminiy: tip → format → chegaralar).
const RULE_PRIORITY = [
  'required',
  'string',
  'integer',
  'numeric',
  'boolean',
  'array',
  'date',
  'email',
  'in',
  'min_numeric',
  'max_numeric',
  'min_string',
  'max_string',
  'same',
];

function priorityOf(rule: string): number {
  const i = RULE_PRIORITY.indexOf(rule);
  return i === -1 ? RULE_PRIORITY.length : i;
}

// Laravel `:attribute` — `attributes` array yoki `str_replace('_', ' ', field)`.
function humanize(field: string, lang: ValLang): string {
  const custom = VALIDATION_ATTRIBUTES[lang]?.[field];
  if (custom) return custom;
  return field.replace(/_/g, ' ');
}

// :min / :max qiymatini class-validator xabaridan ajratib olish (best-effort —
// class-validator strukturali argument bermaydi).
function extractBound(message: string): string | undefined {
  const matches = message.match(/-?\d+(?:\.\d+)?/g);
  return matches?.length ? matches[matches.length - 1] : undefined;
}

function applyTemplate(
  tpl: string,
  attr: string,
  ctx: { min?: string; max?: string; date?: string; other?: string },
): string {
  return tpl
    .replace(/:attribute/g, attr)
    .replace(/:min/g, ctx.min ?? '')
    .replace(/:max/g, ctx.max ?? '')
    .replace(/:date/g, ctx.date ?? '')
    .replace(/:other/g, ctx.other ?? '');
}

// @Match defaultMessage formati: "<prop> must match <other>" → <other> ni ajratadi.
function extractOther(message: string): string | undefined {
  const m = message.match(/ must match (\S+)$/);
  return m?.[1];
}

// Bir field (+ uning children) uchun xabarlarni yig'adi.
function collectField(
  err: ValidationError,
  lang: ValLang,
  prefix: string,
  out: Record<string, string[]>,
  flat: string[],
): void {
  const key = prefix ? `${prefix}.${err.property}` : err.property;
  const constraints = err.constraints ?? {};
  const ckeys = Object.keys(constraints);

  if (ckeys.length) {
    const attr = humanize(err.property, lang);
    const rules = VALIDATION_RULES[lang];
    let msgs: string[];

    const hasRequired = ckeys.some((k) => REQUIRED_CONSTRAINTS.has(k));
    if (hasRequired) {
      msgs = [applyTemplate(rules.required, attr, {})];
    } else {
      const byRule = new Map<string, string>();
      for (const k of ckeys) {
        const rule = CONSTRAINT_TO_RULE[k];
        if (rule && rules[rule]) {
          const bound =
            rule.startsWith('min') || rule.startsWith('max')
              ? extractBound(constraints[k])
              : undefined;
          let ctx: { min?: string; max?: string; other?: string } = {};
          if (rule.startsWith('min')) ctx = { min: bound };
          else if (rule.startsWith('max')) ctx = { max: bound };
          else if (rule === 'same') {
            const otherField = extractOther(constraints[k]);
            ctx = { other: otherField ? humanize(otherField, lang) : '' };
          }
          byRule.set(rule, applyTemplate(rules[rule], attr, ctx));
        } else {
          // Mos rule yo'q — class-validator xom xabari (fallback).
          byRule.set(`raw:${k}`, constraints[k]);
        }
      }
      msgs = [...byRule.entries()]
        .sort((a, b) => priorityOf(a[0]) - priorityOf(b[0]))
        .map((e) => e[1]);
    }

    out[key] = msgs;
    flat.push(...msgs);
  }

  // Nested (massiv/obyekt) — Laravel `field.index.subfield` notation.
  if (err.children?.length) {
    for (const child of err.children) {
      collectField(child, lang, key, out, flat);
    }
  }
}

export function buildLaravelValidation(
  errors: ValidationError[],
  lang: ValLang,
): LaravelValidationBody {
  const out: Record<string, string[]> = {};
  const flat: string[] = [];

  for (const err of errors) {
    collectField(err, lang, '', out, flat);
  }

  // Laravel ValidationException::summarize — 1-xabar + "(and N more error[s])".
  // Suffiks Laravel'da tarjima qilinmagan (uz/ru'da ham inglizcha qoladi).
  let message = flat[0] ?? 'The given data was invalid.';
  const more = flat.length - 1;
  if (more > 0) {
    message += ` (and ${more} more ${more === 1 ? 'error' : 'errors'})`;
  }

  return { message, errors: out };
}

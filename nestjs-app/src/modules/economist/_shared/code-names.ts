// Statement to'lov kodlari nomi — 3 ta tilda (uz/ru/en).
// Laravel `StatementService::names()` ekvivalenti.
// JSON fayllari `i18n/` papkasida saqlanadi.

import codeNamesUz from '@/modules/economist/_shared/i18n/code-names.uz.json';
import codeNamesRu from '@/modules/economist/_shared/i18n/code-names.ru.json';
import codeNamesEn from '@/modules/economist/_shared/i18n/code-names.en.json';

export type CodeNamesMap = Record<string, string>;

const dictionaries: Record<string, CodeNamesMap> = {
  uz: codeNamesUz,
  ru: codeNamesRu,
  en: codeNamesEn,
};

/**
 * Til kodi (uz/ru/en) bo'yicha kodlar lug'atini qaytaradi.
 * Default — `uz`. Noma'lum til berilsa ham `uz`.
 */
export function getCodeNames(lang?: string): CodeNamesMap {
  return dictionaries[lang ?? 'uz'] ?? dictionaries.uz;
}

/**
 * Bitta kod uchun nom. Topilmasa kod o'zini qaytaradi.
 */
export function getCodeName(code: string, lang?: string): string {
  return getCodeNames(lang)[code] ?? code;
}

// Statement to'lov kodlari nomi — 3 ta tilda (uz/ru/en).
// Laravel `StatementService::names()` (namesUz/namesRu/namesEn) ekvivalenti.
//
// MUHIM: JSON fayllari `[code, name]` juftliklari MASSIVI ko'rinishida saqlanadi
// (object EMAS). Sabab — JS object integer-like key'larni ('107') leading-zero
// key'lar ('001') oldidan saralaydi, shuning uchun object insertion-order
// saqlanmaydi. Massiv tartibi esa parse'da o'zgarmaydi → Laravel kod tartibi
// AYNAN saqlanadi. Tartib har til uchun alohida: namesUz vs namesRu/namesEn
// (masalan idx 90: uz=355,300 ; ru/en=300,355) farq qiladi.

import codeNamesUz from '@/modules/economist/_shared/i18n/code-names.uz.json';
import codeNamesRu from '@/modules/economist/_shared/i18n/code-names.ru.json';
import codeNamesEn from '@/modules/economist/_shared/i18n/code-names.en.json';

export type CodeNamesMap = Record<string, string>;
type CodePairs = string[][];

// Har til uchun tartiblangan [code, name] juftliklari (Laravel tartibida).
const orderedDictionaries: Record<string, CodePairs> = {
  uz: codeNamesUz,
  ru: codeNamesRu,
  en: codeNamesEn,
};

// Lookup uchun Record (kesh) — `names[code]` uchun; kalit tartibi muhim emas.
const lookupCache: Record<string, CodeNamesMap> = {};

/**
 * Til kodi (uz/ru/en) bo'yicha tartiblangan `[code, name]` juftliklari massivi.
 * Laravel `StatementService::names()` tartibini AYNAN saqlaydi (serialize uchun).
 * Default — `uz`. Noma'lum til berilsa ham `uz`.
 */
export function getCodeNamesOrdered(lang?: string): CodePairs {
  return orderedDictionaries[lang ?? 'uz'] ?? orderedDictionaries.uz;
}

/**
 * Til kodi bo'yicha kodlar lug'ati (Record) — `names[code]` lookup uchun.
 * Default — `uz`. Noma'lum til berilsa ham `uz`.
 */
export function getCodeNames(lang?: string): CodeNamesMap {
  const l = orderedDictionaries[lang ?? 'uz'] ? (lang ?? 'uz') : 'uz';
  if (!lookupCache[l]) {
    const map: CodeNamesMap = {};
    for (const [code, name] of getCodeNamesOrdered(l)) map[code] = name;
    lookupCache[l] = map;
  }
  return lookupCache[l];
}

/**
 * Bitta kod uchun nom. Topilmasa kod o'zini qaytaradi.
 */
export function getCodeName(code: string, lang?: string): string {
  return getCodeNames(lang)[code] ?? code;
}

// Deep-diff comparator — Laravel va NestJS response'larini solishtirish.
// JSON path bilan farqlarni qaytaradi: 'data.data[0].worker.photo'.

import type { DiffEntry } from '@/configs/types';

// Path patterns:
//   'created_at'                 — har joyda created_at
//   'data.per_page'              — aniq path
//   'data.data[].worker.photo'   — array element ichida (har element uchun)
//   'data.data[*].id'            — wildcard (= [])
export function compare(
  laravel: unknown,
  nestjs: unknown,
  ignorePaths: string[] = [],
  maskPaths: string[] = [],
): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const ignoreSet = expandPaths(ignorePaths);
  const maskSet = expandPaths(maskPaths);
  walk(laravel, nestjs, '', diffs, ignoreSet, maskSet);
  return diffs;
}

function walk(
  laravel: unknown,
  nestjs: unknown,
  path: string,
  diffs: DiffEntry[],
  ignore: PathMatcher,
  mask: PathMatcher,
): void {
  // Mask qilingan path — ikkalasini bir xil qiymatga o'rnatamiz (compare o'tib ketadi).
  if (mask.matches(path)) return;
  if (ignore.matches(path)) return;

  // Bir xil qiymat (primitive yoki same reference).
  if (laravel === nestjs) return;

  // Null check.
  if (laravel === null || nestjs === null) {
    if (laravel !== nestjs) {
      diffs.push({
        path: path || '$',
        kind: 'value',
        laravel,
        nestjs,
      });
    }
    return;
  }

  // Type mismatch.
  if (typeof laravel !== typeof nestjs) {
    diffs.push({
      path: path || '$',
      kind: 'type',
      laravel,
      nestjs,
    });
    return;
  }

  // Array.
  if (Array.isArray(laravel) && Array.isArray(nestjs)) {
    if (laravel.length !== nestjs.length) {
      diffs.push({
        path: path || '$',
        kind: 'value',
        laravel: `array(${laravel.length})`,
        nestjs: `array(${nestjs.length})`,
      });
      // Cheksiz farqlarni oldini olamiz — uzunlik bir xil bo'lmasa, faqat birinchi farqni ko'rsatamiz.
      const minLen = Math.min(laravel.length, nestjs.length);
      for (let i = 0; i < minLen; i++) {
        walk(laravel[i], nestjs[i], `${path}[${i}]`, diffs, ignore, mask);
      }
      return;
    }
    for (let i = 0; i < laravel.length; i++) {
      walk(laravel[i], nestjs[i], `${path}[${i}]`, diffs, ignore, mask);
    }
    return;
  }

  // Object.
  if (
    typeof laravel === 'object' &&
    typeof nestjs === 'object' &&
    !Array.isArray(laravel) &&
    !Array.isArray(nestjs)
  ) {
    const lObj = laravel as Record<string, unknown>;
    const nObj = nestjs as Record<string, unknown>;
    const lKeys = Object.keys(lObj);
    const nKeys = Object.keys(nObj);
    const allKeys = new Set([...lKeys, ...nKeys]);

    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      if (ignore.matches(childPath)) continue;
      if (!(key in lObj)) {
        diffs.push({
          path: childPath,
          kind: 'missing-laravel',
          laravel: undefined,
          nestjs: nObj[key],
        });
        continue;
      }
      if (!(key in nObj)) {
        diffs.push({
          path: childPath,
          kind: 'missing-nestjs',
          laravel: lObj[key],
          nestjs: undefined,
        });
        continue;
      }
      walk(lObj[key], nObj[key], childPath, diffs, ignore, mask);
    }
    return;
  }

  // Primitive value mismatch.
  diffs.push({
    path: path || '$',
    kind: 'value',
    laravel,
    nestjs,
  });
}

// Path matcher — '[]' wildcard'ni qo'llab-quvvatlaydi.
interface PathMatcher {
  matches(path: string): boolean;
}

function expandPaths(patterns: string[]): PathMatcher {
  // Pattern'larni regex'ga aylantirib, har bir input path'ni tekshiramiz.
  const regexes = patterns.map((p) => {
    // 'data.data[].worker.photo' → /^data\.data\[\d+\]\.worker\.photo$/
    // 'data.per_page' → /^data\.per_page$/
    const escaped = p
      .replace(/[.+?^${}()|\\]/g, '\\$&')
      .replace(/\[\]/g, '\\[\\d+\\]')
      .replace(/\[\*\]/g, '\\[\\d+\\]');
    return new RegExp(`^${escaped}$`);
  });
  return {
    matches(path: string): boolean {
      // To'liq path mos kelishi yoki path oxirida — 'created_at' har joyda.
      for (const re of regexes) {
        if (re.test(path)) return true;
        // Suffix mos kelishi: 'created_at' har qaerdagi `.created_at` ga mos.
        if (!re.source.startsWith('^') || re.source.includes('\\.')) continue;
      }
      // Suffix-only matching (oddiy field nomi — har joyda)
      const lastSegment = path.split('.').pop();
      if (lastSegment) {
        for (const p of patterns) {
          if (!p.includes('.') && !p.includes('[') && lastSegment === p)
            return true;
        }
      }
      return false;
    },
  };
}

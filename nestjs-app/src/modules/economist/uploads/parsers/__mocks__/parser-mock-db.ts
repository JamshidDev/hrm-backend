// Spec fayllar uchun yagona typed mock DB factory.
// Parser'larning insert/select/delete/execute chain'ini kuzatadi.

import type { DataSource } from '@/db/types';

/** Mock DB insert/delete operatsiyasidagi qator — har xil tipdagi numeric yoki string. */
export type MockRow = Record<string, unknown>;

export interface MockDb {
  db: DataSource;
  inserts: Array<{ rows: MockRow[] }>;
}

/**
 * Yengil mock DataSource — Drizzle'ning standart chain'lariga javob beradi.
 * Parser'lar uchun yetarli: insert, select, delete, execute.
 */
export function buildMockDb(): MockDb {
  const inserts: Array<{ rows: MockRow[] }> = [];

  const dbStub = {
    insert: () => ({
      values: (rows: MockRow[]) => {
        inserts.push({ rows: [...rows] });
        return Promise.resolve();
      },
    }),
    select: () => ({
      from: () => ({ where: () => Promise.resolve([]) }),
    }),
    delete: () => ({ where: () => Promise.resolve() }),
    execute: () => Promise.resolve([{ total: 0 }]),
  };

  return {
    // Mock structure Drizzle DataSource'ning to'liq tipiga mos kelmaydi —
    // faqat parser ishlatadigan minimal subset. Test uchun yetadi.
    db: dbStub as unknown as DataSource,
    inserts,
  };
}

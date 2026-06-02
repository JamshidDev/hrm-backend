// LmsMainService unit testlari.
// `enums()` static obyekt qaytaradi, list helperlari Drizzle chainni chaqiradi.

import { LmsMainService } from '@/modules/lms/main/main.service';
import type { DataSource } from '@/db/types';

// lmsPaginate uchun: har `db.select()` chaqiruvi navbatdagi natijani qaytaradi.
// Tartib: count (idx 0), list (idx 1), keyin mapList ichidagi qo'shimcha select'lar.
function buildMockDb(selectResults: unknown[][] = []) {
  const calls = { select: false, from: false, where: false };
  let idx = 0;
  const makeChain = () => {
    const result = selectResults[idx++] ?? [];
    const promise = Promise.resolve(result);
    const chain: any = {
      from: () => {
        calls.from = true;
        return chain;
      },
      where: () => {
        calls.where = true;
        return chain;
      },
      orderBy: () => chain,
      limit: () => chain,
      offset: () => chain,
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    };
    return chain;
  };
  const db = {
    select: () => {
      calls.select = true;
      return makeChain();
    },
  } as unknown as DataSource;
  return { db, calls };
}

describe('LmsMainService', () => {
  describe('enums (Laravel parity)', () => {
    it('edu_plan_types, exam_types, serials, lesson_exam_types', () => {
      const svc = new LmsMainService({} as DataSource, {} as any);
      const r = svc.enums();

      expect(r.edu_plan_types).toHaveLength(2);
      expect(r.edu_plan_types.map((t) => t.name)).toEqual([
        'Malaka oshirish',
        'Qayta tayyorlash',
      ]);

      expect(r.exam_types).toHaveLength(3);
      expect(r.exam_types.map((t) => t.id)).toEqual([1, 2, 3]);

      expect(r.serials).toHaveLength(3);
      expect(r.serials.map((s) => s.name)).toEqual(['MO-RW', 'MO-LM', 'MO-SM']);

      expect(r.lesson_exam_types).toEqual([{ id: 3, name: 'THREE' }]);
    });
  });

  describe('learningCenters (stub)', () => {
    it('bo`sh array qaytaradi', async () => {
      const svc = new LmsMainService({} as DataSource, {} as any);
      const r = await svc.learningCenters();
      expect(r).toEqual([]);
    });
  });

  describe('listDirections / listSpecializations / listEduPlans', () => {
    it('listDirections — paginated {current_page,total,data}', async () => {
      // select #1 = count, #2 = list.
      const { db, calls } = buildMockDb([
        [{ total: 1 }],
        [{ id: 1, name: 'IT', name_ru: null, name_en: null }],
      ]);
      const svc = new LmsMainService(db, { user: { id: 1 } } as any);
      const r = await svc.listDirections({});
      expect(calls.select).toBe(true);
      expect(calls.from).toBe(true);
      expect(r).toEqual({
        current_page: 1,
        total: 1,
        data: [{ id: 1, name: 'IT', name_ru: null, name_en: null }],
      });
    });

    it('listSpecializations — direction + positions_count:null', async () => {
      const { db } = buildMockDb([
        [{ total: 1 }],
        [
          {
            id: 1,
            name: 'Backend',
            name_ru: null,
            name_en: null,
            direction_id: null,
          },
        ],
      ]);
      const svc = new LmsMainService(db, { user: { id: 1 } } as any);
      const r = await svc.listSpecializations({});
      expect(r.total).toBe(1);
      expect(r.data[0]).toEqual({
        id: 1,
        name: 'Backend',
        direction: null,
        name_ru: null,
        name_en: null,
        positions_count: null,
      });
    });

    it('listEduPlans — bo`sh natija ham bo`la oladi', async () => {
      const { db } = buildMockDb([[{ total: 0 }], []]);
      const svc = new LmsMainService(db, { user: { id: 1 } } as any);
      const r = await svc.listEduPlans({});
      expect(r).toEqual({ current_page: 1, total: 0, data: [] });
    });
  });

  describe('listGroups', () => {
    it('paginated, bo`sh natija', async () => {
      const { db } = buildMockDb([[{ total: 0 }], []]);
      const svc = new LmsMainService(db, { user: { id: 1 } } as any);
      const r = await svc.listGroups({});
      expect(r).toEqual({ current_page: 1, total: 0, data: [] });
    });
  });
});

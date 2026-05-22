// LmsMainService unit testlari.
// `enums()` static obyekt qaytaradi, list helperlari Drizzle chainni chaqiradi.

import { LmsMainService } from '@/modules/lms/main/main.service';
import type { DataSource } from '@/db/types';

function buildMockDb(selectResult: unknown[] = []) {
  const calls: { select?: boolean; from?: boolean; where?: boolean } = {};
  const promise = Promise.resolve(selectResult);

  const chain: any = {
    from: () => {
      calls.from = true;
      return chain;
    },
    where: () => {
      calls.where = true;
      return chain;
    },
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
  const db = {
    select: () => {
      calls.select = true;
      return chain;
    },
  } as unknown as DataSource;
  return { db, calls };
}

describe('LmsMainService', () => {
  describe('enums (Laravel parity)', () => {
    it('edu_plan_types, exam_types, serials, lesson_exam_types', () => {
      const svc = new LmsMainService({} as DataSource);
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
      const svc = new LmsMainService({} as DataSource);
      const r = await svc.learningCenters();
      expect(r).toEqual([]);
    });
  });

  describe('listDirections / listSpecializations / listEduPlans', () => {
    it('listDirections — DB select chain chaqiradi', async () => {
      const { db, calls } = buildMockDb([{ id: 1, name: 'IT' }]);
      const svc = new LmsMainService(db);
      const r = await svc.listDirections();
      expect(calls.select).toBe(true);
      expect(calls.from).toBe(true);
      expect(calls.where).toBe(true);
      expect(r).toEqual([{ id: 1, name: 'IT' }]);
    });

    it('listSpecializations — natija qaytadi', async () => {
      const { db } = buildMockDb([
        { id: 1, name: 'Backend' },
        { id: 2, name: 'Frontend' },
      ]);
      const svc = new LmsMainService(db);
      const r = await svc.listSpecializations();
      expect(r).toHaveLength(2);
    });

    it('listEduPlans — bo`sh natija ham bo`la oladi', async () => {
      const { db } = buildMockDb([]);
      const svc = new LmsMainService(db);
      const r = await svc.listEduPlans();
      expect(r).toEqual([]);
    });
  });

  describe('listGroups', () => {
    it('DB select chain chaqiradi, mock natija qaytaradi', async () => {
      const { db } = buildMockDb([]);
      const svc = new LmsMainService(db);
      const r = await svc.listGroups();
      expect(r).toEqual([]);
    });
  });
});

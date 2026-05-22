// LmsEduPlanExamService unit testlari.
// attach (insert), detach (delete), list, results (stub).

import { LmsEduPlanExamService } from '@/modules/lms/edu-plan-exams/edu-plan-exam.service';
import type { DataSource } from '@/db/types';

interface Recorded {
  inserts: Record<string, unknown>[];
  deletes: number;
}

interface MockOptions {
  selectResults?: unknown[][];
  insertReturning?: unknown[];
  deleteReturning?: unknown[];
}

function buildMockDb(opts: MockOptions = {}) {
  const recorded: Recorded = { inserts: [], deletes: 0 };
  const selectResults = opts.selectResults ?? [];
  let selectIdx = 0;

  const buildSelect = () => {
    const result = selectResults[selectIdx++] ?? [];
    const promise = Promise.resolve(result);

    const chain: any = {
      from: () => chain,
      where: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      offset: () => chain,
      groupBy: () => chain,
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    };
    return chain;
  };

  const db = {
    select: buildSelect,
    insert: () => ({
      values: (row: Record<string, unknown>) => {
        recorded.inserts.push(row);
        return {
          returning: () => Promise.resolve(opts.insertReturning ?? [row]),
        };
      },
    }),
    delete: () => ({
      where: () => ({
        returning: () => {
          recorded.deletes++;
          return Promise.resolve(opts.deleteReturning ?? []);
        },
      }),
    }),
  } as unknown as DataSource;

  return { db, recorded };
}

describe('LmsEduPlanExamService', () => {
  describe('attach', () => {
    it('exam_type default 3 (Final)', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ m: 4 }]],
        insertReturning: [{ id: 5 }],
      });
      const svc = new LmsEduPlanExamService(db);
      await svc.attach({ edu_plan_id: 1, exam_id: 10 });
      expect(recorded.inserts).toHaveLength(1);
      expect(recorded.inserts[0]).toMatchObject({
        id: 5,
        edu_plan_id: 1,
        exam_id: 10,
        exam_type: 3,
        lesson_id: null,
      });
      // mapper natija emas — endi attach faqat {id} qaytaradi
    });

    it('attach faqat {id} qaytaradi (mapper emas)', async () => {
      const { db } = buildMockDb({
        selectResults: [[{ m: 0 }]],
        insertReturning: [{ id: 7 }],
      });
      const svc = new LmsEduPlanExamService(db);
      const r = await svc.attach({ edu_plan_id: 1, exam_id: 10 });
      expect(r).toEqual({ id: 7 });
    });

    it('Berilgan exam_type va lesson_id saqlanadi', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ m: null }]],
        insertReturning: [{ id: 1 }],
      });
      const svc = new LmsEduPlanExamService(db);
      await svc.attach({
        edu_plan_id: 2,
        exam_id: 20,
        exam_type: 1,
        lesson_id: 100,
      });
      expect(recorded.inserts[0]).toMatchObject({
        id: 1,
        exam_type: 1,
        lesson_id: 100,
      });
    });
  });

  describe('detach', () => {
    it('Mavjud examni o`chiradi (hard delete)', async () => {
      const { db, recorded } = buildMockDb({
        deleteReturning: [{ id: 5 }],
      });
      const svc = new LmsEduPlanExamService(db);
      const r = await svc.detach(5);
      expect(r).toEqual({ success: true });
      expect(recorded.deletes).toBe(1);
    });

    it('Topilmagan examId — throw 404', async () => {
      const { db } = buildMockDb({ deleteReturning: [] });
      const svc = new LmsEduPlanExamService(db);
      await expect(svc.detach(999)).rejects.toThrow();
    });
  });

  describe('list', () => {
    it('Paginatsiya (Laravel parity: no per_page) + exam batch join', async () => {
      // 1) count, 2) list, 3) exams batch
      const { db } = buildMockDb({
        selectResults: [
          [{ total: 1 }],
          [{ id: 1, edu_plan_id: 1, exam_id: 5 }],
          [{ id: 5, name: 'Final' }],
        ],
      });
      const svc = new LmsEduPlanExamService(db);
      const r = await svc.list({ page: 1, per_page: 10 });
      expect(r).toMatchObject({ current_page: 1, total: 1 });
      expect(r).not.toHaveProperty('per_page');
      expect(r.data).toHaveLength(1);
      expect(r.data[0]).toEqual({
        id: 1,
        exam: { id: 5, name: 'Final' },
      });
    });

    it('edu_plan_id filter — bo`sh natija', async () => {
      const { db } = buildMockDb({
        selectResults: [[{ total: 0 }], []],
      });
      const svc = new LmsEduPlanExamService(db);
      const r = await svc.list({ edu_plan_id: 42 });
      expect(r.total).toBe(0);
      expect(r.data).toEqual([]);
    });
  });

  describe('results (stub)', () => {
    it('Bo`sh paginatsiya qaytaradi (no per_page)', async () => {
      const svc = new LmsEduPlanExamService({} as DataSource);
      const r = await svc.results({ page: 2, per_page: 5 });
      expect(r).toEqual({
        current_page: 2,
        total: 0,
        data: [],
      });
    });
  });
});

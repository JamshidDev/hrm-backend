// LmsDirectionService unit testlari.
// CRUD operatsiyalarini mock Drizzle chain'lar bilan tekshiradi.

import { LmsDirectionService } from '@/modules/lms/directions/direction.service';
import type { DataSource } from '@/db/types';

interface Recorded {
  inserts: Record<string, unknown>[][];
  updates: Record<string, unknown>[];
}

interface MockOptions {
  selectResults?: unknown[][];
  updateReturning?: unknown[];
  insertReturning?: unknown[];
}

/**
 * Drizzle chain mock — har bosqichda thenable bo'lib, har biri promise'ga
 * yetganda shu select() chaqirig'iga mos natija qaytaradi.
 *
 * lmsPaginate ichida tartib:
 *   1) select({total:count()}).from(countTable).where()  — COUNT (select #1)
 *   2) user query() ichidagi select().from()...           — LIST (select #2)
 */
function buildMockDb(opts: MockOptions = {}) {
  const recorded: Recorded = { inserts: [], updates: [] };
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
        recorded.inserts.push([row]);
        const ret = opts.insertReturning ?? [row];
        return {
          returning: () => Promise.resolve(ret),
        };
      },
    }),
    update: () => ({
      set: (data: Record<string, unknown>) => {
        recorded.updates.push(data);
        return {
          where: () => ({
            returning: () => Promise.resolve(opts.updateReturning ?? [{}]),
          }),
        };
      },
    }),
  } as unknown as DataSource;

  return { db, recorded };
}

describe('LmsDirectionService', () => {
  describe('list (Laravel parity: no per_page)', () => {
    it('current_page, total, data qaytaradi', async () => {
      const { db } = buildMockDb({
        // 1) count query, 2) list query
        selectResults: [
          [{ total: 1 }],
          [{ id: 1, name: 'IT', name_ru: null, name_en: null }],
        ],
      });
      const svc = new LmsDirectionService(db);
      const r = await svc.list({ page: 1, per_page: 10 });
      expect(r).toMatchObject({ current_page: 1, total: 1 });
      expect(r).not.toHaveProperty('per_page');
      expect(r.data).toEqual([
        { id: 1, name: 'IT', name_ru: null, name_en: null },
      ]);
    });

    it('bo`sh natija — total=0, data=[]', async () => {
      const { db } = buildMockDb({
        selectResults: [[{ total: 0 }], []],
      });
      const svc = new LmsDirectionService(db);
      const r = await svc.list({});
      expect(r.current_page).toBe(1);
      expect(r.total).toBe(0);
      expect(r.data).toEqual([]);
    });
  });

  describe('show', () => {
    it('Topilgan record — to`liq mapper natijasi (4 key)', async () => {
      const { db } = buildMockDb({
        selectResults: [
          [{ id: 5, name: 'X', name_ru: 'X-ru', name_en: 'X-en' }],
        ],
      });
      const svc = new LmsDirectionService(db);
      const r = await svc.show(5);
      expect(r).toEqual({
        id: 5,
        name: 'X',
        name_ru: 'X-ru',
        name_en: 'X-en',
      });
    });

    it('Topilmasa — throw 404', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new LmsDirectionService(db);
      await expect(svc.show(999)).rejects.toThrow();
    });
  });

  describe('create', () => {
    it('nextId + insert qiladi (name, name_ru, name_en)', async () => {
      const { db, recorded } = buildMockDb({
        // nextId() select natijasi
        selectResults: [[{ m: 9 }]],
        insertReturning: [
          { id: 10, name: 'Test', name_ru: 'Тест', name_en: 'Test EN' },
        ],
      });
      const svc = new LmsDirectionService(db);
      const r = await svc.create({
        name: 'Test',
        name_ru: 'Тест',
        name_en: 'Test EN',
      });

      expect(recorded.inserts).toHaveLength(1);
      expect(recorded.inserts[0][0]).toMatchObject({
        id: 10,
        name: 'Test',
      });
      expect(r).toEqual({
        id: 10,
        name: 'Test',
        name_ru: 'Тест',
        name_en: 'Test EN',
      });
    });

    it('Optional fieldlar berilmasa — null saqlanadi', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ m: null }]],
        insertReturning: [
          { id: 1, name: 'OnlyUz', name_ru: null, name_en: null },
        ],
      });
      const svc = new LmsDirectionService(db);
      await svc.create({ name: 'OnlyUz' });

      expect(recorded.inserts[0][0].id).toBe(1);
      expect(recorded.inserts[0][0].name_ru).toBe(null);
      expect(recorded.inserts[0][0].name_en).toBe(null);
    });
  });

  describe('update', () => {
    it('Mavjud record yangilanadi', async () => {
      const { db, recorded } = buildMockDb({
        updateReturning: [{ id: 5, name: 'New', name_ru: null, name_en: null }],
      });
      const svc = new LmsDirectionService(db);
      const r = await svc.update(5, { name: 'New' });
      expect(recorded.updates).toHaveLength(1);
      expect(recorded.updates[0]).toMatchObject({ name: 'New' });
      expect(r).toMatchObject({ id: 5, name: 'New' });
    });

    it('Topilmasa — throw 404', async () => {
      const { db } = buildMockDb({ updateReturning: [] });
      const svc = new LmsDirectionService(db);
      await expect(svc.update(999, { name: 'X' })).rejects.toThrow();
    });
  });

  describe('remove (soft-delete)', () => {
    it('deleted_at yangilanadi', async () => {
      const { db, recorded } = buildMockDb({
        updateReturning: [{ id: 7 }],
      });
      const svc = new LmsDirectionService(db);
      await svc.remove(7);
      expect(recorded.updates).toHaveLength(1);
      expect(recorded.updates[0].deleted_at).toBeDefined();
    });

    it('Topilmasa — throw 404', async () => {
      const { db } = buildMockDb({ updateReturning: [] });
      const svc = new LmsDirectionService(db);
      await expect(svc.remove(999)).rejects.toThrow();
    });
  });
});

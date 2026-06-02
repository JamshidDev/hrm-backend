// LmsLessonService unit testlari.
// Asosan show, createZoomMeeting, showParticipants ni qoplaymiz.

import { LmsLessonService } from '@/modules/lms/lessons/lesson.service';
import type { DataSource } from '@/db/types';

interface MockOptions {
  selectResults?: unknown[][];
}

function buildMockDb(opts: MockOptions = {}) {
  const selectResults = opts.selectResults ?? [];
  let idx = 0;

  const buildSelect = () => {
    const result = selectResults[idx++] ?? [];
    const promise = Promise.resolve(result);

    const chain: any = {
      from: () => chain,
      where: () => chain,
      orderBy: () => promise,
      limit: () => promise,
      offset: () => promise,
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    };
    return chain;
  };

  const db = {
    select: buildSelect,
  } as unknown as DataSource;
  return { db };
}

// Minio + i18n — show/participants/zoom testlari ularni ishlatmaydi.
const mockMinio = { fileUrl: (p: string | null) => Promise.resolve(p) } as any;
const mockI18n = { t: (k: string) => k } as any;

describe('LmsLessonService', () => {
  describe('show', () => {
    it('Mavjud darsni qaytaradi', async () => {
      const { db } = buildMockDb({
        selectResults: [[{ id: 1, name: 'NestJS 101' }]],
      });
      const svc = new LmsLessonService(db, mockMinio, mockI18n);
      const r = await svc.show(1);
      expect(r).toMatchObject({ id: 1, name: 'NestJS 101' });
    });

    it('Topilmasa — throw 404', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new LmsLessonService(db, mockMinio, mockI18n);
      await expect(svc.show(999)).rejects.toThrow();
    });
  });

  describe('showParticipants', () => {
    it('Qatnashchilar ro`yxatini qaytaradi', async () => {
      const { db } = buildMockDb({
        selectResults: [
          [
            { id: 1, lesson_id: 5, worker_id: 100 },
            { id: 2, lesson_id: 5, worker_id: 101 },
          ],
        ],
      });
      const svc = new LmsLessonService(db, mockMinio, mockI18n);
      const r = await svc.showParticipants(5);
      expect(r).toHaveLength(2);
      expect(r[0]).toMatchObject({ lesson_id: 5, worker_id: 100 });
    });

    it('Hech kim yo`q — bo`sh array', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new LmsLessonService(db, mockMinio, mockI18n);
      const r = await svc.showParticipants(99);
      expect(r).toEqual([]);
    });
  });

  describe('createZoomMeeting (stub)', () => {
    it('Mavjud lesson — stub natija qaytaradi', async () => {
      const { db } = buildMockDb({
        selectResults: [[{ id: 1 }]],
      });
      const svc = new LmsLessonService(db, mockMinio, mockI18n);
      const r = await svc.createZoomMeeting(1);
      expect(r).toEqual({
        success: true,
        stub: true,
        url: '',
        meeting_id: '',
      });
    });

    it('Topilmagan lesson — throw 404', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new LmsLessonService(db, mockMinio, mockI18n);
      await expect(svc.createZoomMeeting(999)).rejects.toThrow();
    });
  });
});

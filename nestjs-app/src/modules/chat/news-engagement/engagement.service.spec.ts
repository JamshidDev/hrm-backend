// ChatNewsEngagementService unit testlari.
// Asosiy logika: like/dislike counter sync (3 holat: yangi, o'zgartirish, neutral).
//
// Drizzle table internal'larini track qilish murakkab — biz operatsiyalar
// SONI va so'nggi yozilgan PAYLOAD'ini tekshiramiz.

import { ChatNewsEngagementService } from '@/modules/chat/news-engagement/engagement.service';
import type { DataSource } from '@/db/types';
import type { RequestContext } from '@/common/context/request.context';
import type { AuthUser } from '@/common/types/auth-user.type';

interface Recorded {
  inserts: Record<string, unknown>[][];
  updates: Record<string, unknown>[];
  deletes: number;
}

interface MockOptions {
  selectResults: unknown[][];
}

function buildMockDb(opts: MockOptions) {
  const recorded: Recorded = { inserts: [], updates: [], deletes: 0 };
  let selectIdx = 0;

  // Hamma operatsiya bitta `recorded` ga yoziladi (transaction ham, oddiy ham).

  const ops: any = {
    insert: () => ({
      values: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        recorded.inserts.push(Array.isArray(rows) ? rows : [rows]);
        return Promise.resolve();
      },
    }),
    update: () => ({
      set: (data: Record<string, unknown>) => ({
        where: () => {
          recorded.updates.push(data);
          return Promise.resolve();
        },
      }),
    }),
    delete: () => ({
      where: () => {
        recorded.deletes++;
        return Promise.resolve();
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(opts.selectResults[selectIdx++] ?? []),
        }),
      }),
    }),
  };

  const db: any = {
    ...ops,
    transaction: async (cb: (tx: typeof ops) => Promise<unknown>) => cb(ops),
  };

  return { db: db as unknown as DataSource, recorded };
}

function buildCtxStub(userId = 42): RequestContext {
  return {
    user: { id: userId } as AuthUser,
    user_or_fail: { id: userId } as AuthUser,
  } as unknown as RequestContext;
}

describe('ChatNewsEngagementService', () => {
  describe('addView', () => {
    it('Yangi view — insert + views_count update', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [
          [{ id: 10 }], // news
          [], // existingView yo'q
        ],
      });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      const result = await svc.addView(10);

      expect(result).toEqual({ success: true, already_viewed: false });
      expect(recorded.inserts).toHaveLength(1);
      expect(recorded.inserts[0][0]).toMatchObject({
        chat_news_id: 10,
        user_id: 42,
      });
      expect(recorded.updates).toHaveLength(1); // views_count
    });

    it('Allaqachon ko`rilgan — insert yo`q', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [
          [{ id: 10 }],
          [{ id: 100 }], // existing view bor
        ],
      });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      const result = await svc.addView(10);

      expect(result).toEqual({ success: true, already_viewed: true });
      expect(recorded.inserts).toHaveLength(0);
      expect(recorded.updates).toHaveLength(0);
    });

    it('News topilmasa — 404 throw', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      await expect(svc.addView(99999)).rejects.toThrow();
    });
  });

  describe('addReaction', () => {
    it('Yangi Like — 1 insert + 1 update', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ id: 10, likes_count: 5, dislikes_count: 2 }], []],
      });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      const result = await svc.addReaction(10, 1);

      expect(result).toEqual({ success: true, reaction: 1 });
      expect(recorded.inserts).toHaveLength(1);
      expect(recorded.inserts[0][0]).toMatchObject({
        chat_news_id: 10,
        user_id: 42,
        reaction: 1,
      });
      // 1 update — chat_news likes_count + 1
      expect(recorded.updates).toHaveLength(1);
    });

    it('Like → Dislike — 3 update (likes-1, reaction update, dislikes+1)', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [
          [{ id: 10, likes_count: 5, dislikes_count: 2 }],
          [{ id: 100, reaction: 1 }],
        ],
      });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      const result = await svc.addReaction(10, -1);

      expect(result).toEqual({ success: true, reaction: -1 });
      expect(recorded.inserts).toHaveLength(0);
      expect(recorded.updates.length).toBe(3);
      expect(recorded.updates.some((u) => u.reaction === -1)).toBe(true);
    });

    it('Bir xil reaction — no_change', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [
          [{ id: 10, likes_count: 5, dislikes_count: 2 }],
          [{ id: 100, reaction: 1 }],
        ],
      });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      const result = await svc.addReaction(10, 1);

      expect(result).toEqual({ success: true, no_change: true });
      expect(recorded.inserts).toHaveLength(0);
      expect(recorded.updates).toHaveLength(0);
      expect(recorded.deletes).toBe(0);
    });

    it('reaction=0 (neutral) — eski yozuv o`chiriladi', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [
          [{ id: 10, likes_count: 5, dislikes_count: 2 }],
          [{ id: 100, reaction: 1 }],
        ],
      });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      const result = await svc.addReaction(10, 0);

      expect(result).toEqual({ success: true, reaction: 0 });
      expect(recorded.deletes).toBe(1);
      // 1 update: likes_count -1
      expect(recorded.updates).toHaveLength(1);
      expect(recorded.inserts).toHaveLength(0);
    });

    it('News topilmasa — 404 throw', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new ChatNewsEngagementService(db, buildCtxStub(42));

      await expect(svc.addReaction(99999, 1)).rejects.toThrow();
    });
  });
});

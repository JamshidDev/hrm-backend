// ChatNotificationService unit testlari.

import { ChatNotificationService } from '@/modules/chat/notifications/notification.service';
import type { DataSource } from '@/db/types';
import type { RequestContext } from '@/common/context/request.context';
import type { AuthUser } from '@/common/types/auth-user.type';

interface Recorded {
  inserts: Record<string, unknown>[][];
}

interface MockOptions {
  selectResults: unknown[][];
}

/**
 * Mock DB — Drizzle select chain'ini thenable qiladi:
 *   `select().from().where().limit(1)` yoki `select().from()` yoki `.where()` —
 *   barchasi awaitable. Insert .values() obj yoki array qabul qiladi.
 */
function buildMockDb(opts: MockOptions) {
  const recorded: Recorded = { inserts: [] };
  let selectIdx = 0;

  const buildSelect = () => {
    const result = opts.selectResults[selectIdx++] ?? [];
    const promise = Promise.resolve(result);

    const chain: any = {
      from: () => chain,
      where: () => chain,
      limit: () => promise,
      then: promise.then.bind(promise),
      catch: promise.catch.bind(promise),
    };
    return chain;
  };

  const db = {
    select: buildSelect,
    insert: () => ({
      values: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const list = Array.isArray(rows) ? rows : [rows];
        recorded.inserts.push([...list]);
        return Promise.resolve();
      },
    }),
  } as unknown as DataSource;

  return { db, recorded };
}

function buildCtxStub(senderId = 999): RequestContext {
  return { user: { id: senderId } as AuthUser } as unknown as RequestContext;
}

describe('ChatNotificationService', () => {
  describe('enums', () => {
    it('4 ta notification turini qaytaradi', () => {
      const svc = new ChatNotificationService({} as DataSource, buildCtxStub());
      const r = svc.enums();
      expect(r.notificationTypes).toHaveLength(4);
      expect(r.notificationTypes.map((t) => t.id)).toEqual([
        'info',
        'success',
        'warning',
        'error',
      ]);
    });
  });

  describe('send (single)', () => {
    it('Recipient topilmasa — 404', async () => {
      const { db } = buildMockDb({ selectResults: [[]] });
      const svc = new ChatNotificationService(db, buildCtxStub(999));

      await expect(
        svc.send({ userId: 1, title: 'X', message: 'Y', type: 'info' }),
      ).rejects.toThrow();
    });

    it('Mavjud recipient — notification insert qilinadi', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ id: 100 }]],
      });
      const svc = new ChatNotificationService(db, buildCtxStub(999));

      const result = await svc.send({
        userId: 100,
        title: 'Salom',
        message: 'Yangi xabar',
        type: 'info',
      });

      expect(result).toEqual({ success: true, sent_to: 1 });
      expect(recorded.inserts).toHaveLength(1);
      expect(recorded.inserts[0][0]).toMatchObject({
        notifiable_id: 100,
        notifiable_type: 'App\\Models\\User',
        type: 'App\\Notifications\\UserMessageNotification',
        sender_id: 999,
      });
      const data = recorded.inserts[0][0].data as Record<string, unknown>;
      expect(data.title).toBe('Salom');
      expect(data.alert).toBe('info');
    });
  });

  describe('sendBatch', () => {
    it('all=true: barcha foydalanuvchilarga, unCheck dagilarsiz', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]],
      });
      const svc = new ChatNotificationService(db, buildCtxStub(999));

      const result = await svc.sendBatch({
        filter: { userIds: [], all: true, unCheck: [2, 4] },
        title: 'Hammaga',
        message: 'Eslatma',
        type: 'info',
      });

      expect(result).toEqual({ success: true, sent_to: 2 });
      const ids = recorded.inserts[0].map((r) => r.notifiable_id).sort();
      expect(ids).toEqual([1, 3]);
    });

    it('all=false: faqat userIds dagilarga', async () => {
      const { db, recorded } = buildMockDb({
        selectResults: [[{ id: 10 }, { id: 20 }]],
      });
      const svc = new ChatNotificationService(db, buildCtxStub(999));

      const result = await svc.sendBatch({
        filter: { userIds: [10, 20, 30], all: false },
        title: 'X',
        message: 'Y',
        type: 'info',
      });

      expect(result.sent_to).toBe(2);
      const ids = recorded.inserts[0].map((r) => r.notifiable_id).sort();
      expect(ids).toEqual([10, 20]);
    });

    it('Bo`sh natija — sent_to=0', async () => {
      const { db, recorded } = buildMockDb({ selectResults: [[]] });
      const svc = new ChatNotificationService(db, buildCtxStub(999));

      const result = await svc.sendBatch({
        filter: { userIds: [], all: false },
        title: 'X',
        message: 'Y',
        type: 'info',
      });

      expect(result).toEqual({ success: true, sent_to: 0 });
      expect(recorded.inserts).toHaveLength(0);
    });

    it('600 foydalanuvchi — 2 ta chunk (500 + 100)', async () => {
      const allUsers = Array.from({ length: 600 }, (_, i) => ({ id: i + 1 }));
      const { db, recorded } = buildMockDb({ selectResults: [allUsers] });
      const svc = new ChatNotificationService(db, buildCtxStub(999));

      const result = await svc.sendBatch({
        filter: { userIds: [], all: true },
        title: 'X',
        message: 'Y',
        type: 'info',
      });

      expect(result.sent_to).toBe(600);
      expect(recorded.inserts).toHaveLength(2);
      expect(recorded.inserts[0]).toHaveLength(500);
      expect(recorded.inserts[1]).toHaveLength(100);
    });
  });
});

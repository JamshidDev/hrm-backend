// ChatUserEmojiService unit testlari.
// Asosiy mantiq: timestamp (ms) → ISO Date konversiyasi + batch insert.

import { ChatUserEmojiService } from '@/modules/chat/user-emoji/user-emoji.service';
import type { DataSource } from '@/db/types';

interface InsertRecord {
  rows: Record<string, unknown>[];
}

function buildMockDb() {
  const inserts: InsertRecord[] = [];
  const db = {
    insert: () => ({
      values: (rows: Record<string, unknown>[]) => {
        inserts.push({ rows: [...rows] });
        return Promise.resolve();
      },
    }),
  } as unknown as DataSource;
  return { db, inserts };
}

describe('ChatUserEmojiService.send', () => {
  it('Bitta emoji insertini to`g`ri formatlaydi', async () => {
    const { db, inserts } = buildMockDb();
    const svc = new ChatUserEmojiService(db);

    const result = await svc.send({
      items: [
        {
          fromUserId: 100,
          toUserId: 200,
          emoji: '👍',
          ts: 1700000000000,
        },
      ],
    });

    expect(result).toEqual({ ok: true, inserted: 1 });
    expect(inserts).toHaveLength(1);
    expect(inserts[0].rows[0]).toMatchObject({
      from_user_id: 100,
      to_user_id: 200,
      text: '👍',
    });
    // ISO format string (Z bilan tugaydi)
    expect(inserts[0].rows[0].created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(inserts[0].rows[0].updated_at).toBe(inserts[0].rows[0].created_at);
  });

  it('5 ta emoji — bitta batch insert', async () => {
    const { db, inserts } = buildMockDb();
    const svc = new ChatUserEmojiService(db);

    const result = await svc.send({
      items: Array.from({ length: 5 }, (_, i) => ({
        fromUserId: i + 1,
        toUserId: 100,
        emoji: '❤️',
        ts: 1700000000000 + i,
      })),
    });

    expect(result.inserted).toBe(5);
    // Bitta insert call (CHUNK=500 dan kam)
    expect(inserts).toHaveLength(1);
    expect(inserts[0].rows).toHaveLength(5);
  });

  it('501 ta emoji — 2 ta batch (500 + 1)', async () => {
    const { db, inserts } = buildMockDb();
    const svc = new ChatUserEmojiService(db);

    const items = Array.from({ length: 501 }, (_, i) => ({
      fromUserId: 1,
      toUserId: 2,
      emoji: '🔥',
      ts: 1700000000000 + i,
    }));
    const result = await svc.send({ items });

    expect(result.inserted).toBe(501);
    expect(inserts).toHaveLength(2);
    expect(inserts[0].rows).toHaveLength(500);
    expect(inserts[1].rows).toHaveLength(1);
  });

  it('Bir xil timestamp uchun bir xil ISO string', async () => {
    const { db, inserts } = buildMockDb();
    const svc = new ChatUserEmojiService(db);

    const ts = 1700000000000;
    await svc.send({
      items: [
        { fromUserId: 1, toUserId: 2, emoji: 'a', ts },
        { fromUserId: 1, toUserId: 2, emoji: 'b', ts },
      ],
    });

    const row1 = inserts[0].rows[0];
    const row2 = inserts[0].rows[1];
    expect(row1.created_at).toBe(row2.created_at);
  });
});

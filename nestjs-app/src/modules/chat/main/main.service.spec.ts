// ChatMainService unit testlari.

import { ChatMainService } from '@/modules/chat/main/main.service';

describe('ChatMainService', () => {
  let service: ChatMainService;

  beforeEach(() => {
    service = new ChatMainService();
  });

  describe('enums', () => {
    it('telegram_message_types — 3 ta tur', () => {
      const r = service.enums();
      expect(r.telegram_message_types).toHaveLength(3);
      expect(r.telegram_message_types.map((t) => t.id)).toEqual([1, 2, 3]);
    });

    it('har bir tur uchun id + type field', () => {
      const r = service.enums();
      for (const t of r.telegram_message_types) {
        expect(t).toHaveProperty('id');
        expect(t).toHaveProperty('type');
        expect(typeof t.id).toBe('number');
        expect(typeof t.type).toBe('string');
      }
    });
  });
});

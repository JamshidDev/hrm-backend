// Unit testlar: kod guruhlari ro'yxati va `getUploadDeadline` mantiqi.

import {
  TOTAL_ONE_COLUMNS,
  TOTAL_TWO_COLUMNS,
  TOTAL_THREE_COLUMNS,
  TOTAL_FOUR_COLUMNS,
  TOTAL_FIVE_COLUMNS,
  ALL_CODES,
  UNIQUE_CODES,
  getUploadDeadline,
} from '@/modules/economist/_shared/code-groups';

describe('Economist · code-groups', () => {
  describe('TOTAL_* lists (Laravel parity)', () => {
    it('TOTAL_ONE_COLUMNS — 98 ta kod (asosiy daromad, Laravel parity)', () => {
      expect(TOTAL_ONE_COLUMNS.length).toBe(98);
      expect(TOTAL_ONE_COLUMNS).toContain('001');
      expect(TOTAL_ONE_COLUMNS).toContain('481');
      expect(TOTAL_ONE_COLUMNS).not.toContain('042');
    });

    it('TOTAL_TWO_COLUMNS — 16 ta kod (xizmat soliqlari)', () => {
      expect(TOTAL_TWO_COLUMNS.length).toBe(16);
      expect(TOTAL_TWO_COLUMNS).toContain('061');
      expect(TOTAL_TWO_COLUMNS).toContain('600');
    });

    it('TOTAL_THREE_COLUMNS — TOTAL_FOUR + TOTAL_TWO ni o`z ichiga oladi (Laravel parity)', () => {
      // Laravel three = four + two
      for (const c of TOTAL_FOUR_COLUMNS) {
        expect(TOTAL_THREE_COLUMNS).toContain(c);
      }
      for (const c of TOTAL_TWO_COLUMNS) {
        expect(TOTAL_THREE_COLUMNS).toContain(c);
      }
    });

    it('TOTAL_FIVE_COLUMNS — 64 ta kod (saqlanmalar)', () => {
      expect(TOTAL_FIVE_COLUMNS.length).toBe(64);
      expect(TOTAL_FIVE_COLUMNS).toContain('856');
      expect(TOTAL_FIVE_COLUMNS).toContain('999');
      expect(TOTAL_FIVE_COLUMNS).toContain('885'); // in_card kod
    });

    it('UNIQUE_CODES — dublikatsiyalarsiz birlashma', () => {
      const all = new Set(ALL_CODES);
      expect(UNIQUE_CODES.length).toBe(all.size);
      // Hech bir guruh bo'sh emas
      expect(UNIQUE_CODES.length).toBeGreaterThan(150);
    });
  });

  describe('getUploadDeadline', () => {
    it('Yanvar 2024 → fevralning 19-i (dushanba)', () => {
      const d = getUploadDeadline(2024, 1);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(1); // 0-indexed: 1=fevral
      expect(d.getDate()).toBe(19);
      expect(d.getHours()).toBe(23);
      expect(d.getMinutes()).toBe(59);
    });

    it('19-kun shanba bo`lsa → dushanbaga suriladi', () => {
      // 2024-10-19 — shanba
      const d = getUploadDeadline(2024, 9); // sentabrning deadline'i oktabr 19
      expect(d.getMonth()).toBe(9); // oktabr
      expect(d.getDate()).toBe(21); // dushanba
      expect(d.getDay()).toBe(1); // 1 = dushanba
    });

    it('19-kun yakshanba bo`lsa → dushanbaga suriladi', () => {
      // 2025-01-19 — yakshanba
      const d = getUploadDeadline(2024, 12); // 2024-12 deadline = 2025-01-19
      expect(d.getFullYear()).toBe(2025);
      expect(d.getMonth()).toBe(0); // yanvar
      expect(d.getDate()).toBe(20); // dushanba
      expect(d.getDay()).toBe(1);
    });

    it('Dekabr → keyingi yilning yanvarining 19-i', () => {
      const d = getUploadDeadline(2023, 12);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(0);
    });
  });
});

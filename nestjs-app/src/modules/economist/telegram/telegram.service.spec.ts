// EconomistTelegramService uchun unit test.
// Asosiy mantiq: `buildSalaryDetail` private metodi — har statement uchun
// in/out/in_card strukturasini quradi.

import { EconomistTelegramService } from '@/modules/economist/telegram/telegram.service';
import type { DataSource } from '@/db/types';

/** Test'lar uchun statement shape — schema'dagi barcha field'lar optional. */
type TestStatement = Record<string, unknown>;

/** `buildSalaryDetail` natija tipi. */
interface SalaryDetailResult {
  worker: {
    full_name?: unknown;
    pin?: unknown;
    organization_id?: unknown;
    [key: string]: unknown;
  };
  in: Array<{ code: string; amount: number }>;
  in_total: number;
  out: Array<{ code: string; amount: number }>;
  out_total: number;
  in_card: { code: string; amount: number };
}

describe('EconomistTelegramService', () => {
  let service: EconomistTelegramService;

  beforeEach(() => {
    // db argument'i kerak emas — biz faqat private salary builder ni testlaymiz.
    service = new EconomistTelegramService({} as unknown as DataSource);
  });

  describe('salary detail (in/out/in_card pivot)', () => {
    /**
     * Private `buildSalaryDetail` metodini test'dan chaqirish.
     * TypeScript private'ga kirish ruxsat bermaydi — `unknown` orqali kasting.
     */
    const build = (stmt: TestStatement): SalaryDetailResult => {
      const svc = service as unknown as {
        buildSalaryDetail: (s: TestStatement) => SalaryDetailResult;
      };
      return svc.buildSalaryDetail(stmt);
    };

    it('Worker meta-ma`lumotlarini saqlaydi', () => {
      const r = build({
        full_name: 'Ali Valiyev',
        pin: 31606995940026,
        position: 'Programmer',
        main_salary: 3_000_000,
        work_time: 176,
        year: 2025,
        month: 10,
        organization_id: 3,
        s_001: 1_000_000,
      });
      expect(r.worker.full_name).toBe('Ali Valiyev');
      expect(r.worker.pin).toBe(31606995940026);
      expect(r.worker.organization_id).toBe(3);
    });

    it('001..600 — in qatorga tushadi', () => {
      const r = build({
        s_001: 1_000_000,
        s_042: 500_000,
        s_600: 100_000,
      });
      expect(r.in.length).toBe(3);
      expect(r.in_total).toBe(1_600_000);
      expect(r.out.length).toBe(0);
    });

    it('856..999 — out qatorga tushadi', () => {
      const r = build({
        s_856: 200_000,
        s_900: 50_000,
        s_999: 10_000,
      });
      expect(r.out.length).toBe(3);
      expect(r.out_total).toBe(260_000);
      expect(r.in.length).toBe(0);
    });

    it('s_885 — in_card sifatida ham saqlanadi', () => {
      const r = build({ s_885: 2_500_000 });
      expect(r.in_card.code).toBe('885');
      expect(r.in_card.amount).toBe(2_500_000);
      // 885 — out diapazonida bo'lgani uchun out qatorga ham tushadi
      expect(r.out.find((x) => x.code === '885')?.amount).toBe(2_500_000);
    });

    it('0 qiymatli kodlar — qaytarilmaydi', () => {
      const r = build({
        s_001: 0,
        s_002: 100,
        s_856: 0,
      });
      expect(r.in.length).toBe(1);
      expect(r.in[0].code).toBe('002');
      expect(r.out.length).toBe(0);
    });

    it('Bo`sh statement — barcha qatorlar bo`sh', () => {
      const r = build({});
      expect(r.in).toEqual([]);
      expect(r.out).toEqual([]);
      expect(r.in_total).toBe(0);
      expect(r.out_total).toBe(0);
      expect(r.in_card.amount).toBe(0);
    });
  });
});

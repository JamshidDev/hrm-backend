// Unit testlar: ExcelService static helpers + readBuffer round-trip.

import { ExcelService } from '@/shared/excel/excel.service';
import { HEADER_BLUE } from '@/shared/excel/style-presets';

describe('ExcelService · static helpers', () => {
  describe('toNumber', () => {
    it('null/undefined/bo`sh → 0', () => {
      expect(ExcelService.toNumber(null)).toBe(0);
      expect(ExcelService.toNumber(undefined)).toBe(0);
      expect(ExcelService.toNumber('')).toBe(0);
    });

    it('Toza raqam', () => {
      expect(ExcelService.toNumber(123)).toBe(123);
      expect(ExcelService.toNumber(123.45)).toBe(123.45);
    });

    it('Bo`sh joylarni, vergulni tozalaydi', () => {
      expect(ExcelService.toNumber('1 234')).toBe(1234);
      expect(ExcelService.toNumber('1,5')).toBe(1.5);
      expect(ExcelService.toNumber(' 1 234,56 ')).toBe(1234.56);
    });

    it('`-` belgisi yoki bo`sh joy → 0', () => {
      expect(ExcelService.toNumber('-')).toBe(0);
      expect(ExcelService.toNumber('.')).toBe(0);
    });

    it('Manfiy raqamlarni qabul qiladi', () => {
      expect(ExcelService.toNumber('-123.45')).toBe(-123.45);
    });

    it('Formula object {result: number}', () => {
      expect(ExcelService.toNumber({ result: 42 })).toBe(42);
    });

    it('Noto`g`ri matn → 0 (xato bermaydi)', () => {
      expect(ExcelService.toNumber('abc')).toBe(0);
    });
  });

  describe('toText', () => {
    it('null/undefined → bo`sh string', () => {
      expect(ExcelService.toText(null)).toBe('');
      expect(ExcelService.toText(undefined)).toBe('');
    });

    it('Trim qiladi', () => {
      expect(ExcelService.toText('  hello  ')).toBe('hello');
    });

    it('Non-breaking space (NBSP)`ni tozalaydi', () => {
      expect(ExcelService.toText('a b')).toBe('a b'); // NBSP → space, keyin trim
    });

    it('Raqamni stringga aylantiradi', () => {
      expect(ExcelService.toText(42)).toBe('42');
    });

    it('Formula object {result: ...}', () => {
      expect(ExcelService.toText({ result: 'hi' })).toBe('hi');
    });

    it('Rich text {text: ...}', () => {
      expect(ExcelService.toText({ text: 'rich' })).toBe('rich');
    });
  });

  describe('toPin', () => {
    it('To`g`ri 14 raqamli PIN', () => {
      expect(ExcelService.toPin('31606995940026')).toBe(31606995940026);
    });

    it('Apostrof va bo`sh joy tozalanadi', () => {
      expect(ExcelService.toPin("'31606995940026")).toBe(31606995940026);
      expect(ExcelService.toPin(' 316 0699 5940 026 ')).toBe(31606995940026);
    });

    it('Number qiymat ham qabul qilinadi', () => {
      expect(ExcelService.toPin(31606995940026)).toBe(31606995940026);
    });

    it('Bo`sh / non-numeric → null', () => {
      expect(ExcelService.toPin('')).toBeNull();
      expect(ExcelService.toPin('abc123')).toBeNull();
      expect(ExcelService.toPin(null)).toBeNull();
    });
  });
});

describe('ExcelService · build + readBuffer round-trip', () => {
  let service: ExcelService;

  beforeEach(() => {
    service = new ExcelService();
  });

  it('build() Buffer qaytaradi, readBuffer u bilan ishlay oladi', async () => {
    const buffer = await service.build({
      creator: 'Jest',
      sheets: [
        {
          name: 'Test',
          columns: [
            { header: 'Name', key: 'name', width: 20 },
            { header: 'Age', key: 'age', width: 10 },
          ],
          rows: [
            { name: 'Ali', age: 25 },
            { name: 'Vali', age: 30 },
          ],
          headerStyle: HEADER_BLUE,
        },
      ],
    });

    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(1000); // realistik xlsx >1KB

    // readBuffer bilan o'qish — sarlavhani skip qilamiz
    const rows = await service.readBuffer(buffer, 1);
    expect(rows.length).toBe(2);
    expect(rows[0][0]).toBe('Ali');
    expect(rows[0][1]).toBe(25);
    expect(rows[1][0]).toBe('Vali');
    expect(rows[1][1]).toBe(30);
  });

  it('readBuffer bo`sh fayl uchun bo`sh array', async () => {
    const buffer = await service.build({
      sheets: [
        {
          name: 'Empty',
          columns: [{ header: 'X', key: 'x' }],
          rows: [],
        },
      ],
    });
    const rows = await service.readBuffer(buffer, 1);
    expect(rows).toEqual([]);
  });

  it('Multi-sheet workbook — birinchi sheet o`qiladi', async () => {
    const buffer = await service.build({
      sheets: [
        {
          name: 'First',
          columns: [{ header: 'A', key: 'a' }],
          rows: [{ a: 1 }, { a: 2 }],
        },
        {
          name: 'Second',
          columns: [{ header: 'B', key: 'b' }],
          rows: [{ b: 99 }],
        },
      ],
    });
    const rows = await service.readBuffer(buffer, 1);
    expect(rows.length).toBe(2); // 1-sheet'dagi qatorlar
    expect(rows[0][0]).toBe(1);
  });
});

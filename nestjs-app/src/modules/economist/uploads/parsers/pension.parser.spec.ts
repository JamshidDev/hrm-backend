// Pension parser integration test.

import { ExcelService } from '@/shared/excel/excel.service';
import { parsePension } from '@/modules/economist/uploads/parsers/pension.parser';
import { buildMockDb } from '@/modules/economist/uploads/parsers/__mocks__/parser-mock-db';

describe('parsePension', () => {
  let excel: ExcelService;
  beforeAll(() => {
    excel = new ExcelService();
  });

  it('3 ta qatorni tahlil qiladi (SKIP_ROWS=2)', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Pension',
          // 2 ta sarlavha qator
          headerRows: [
            { values: ['Pension Hisobot'] },
            {
              values: [
                'PIN',
                'Last',
                'First',
                'Mid',
                'Tax',
                'Mand',
                'Volun',
                'Total',
              ],
            },
          ],
          columns: Array.from({ length: 8 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            {
              c0: 31111111111111,
              c1: 'Test',
              c2: 'Pension',
              c3: 'One',
              c4: 50_000,
              c5: 200_000,
              c6: 0,
              c7: 250_000,
            },
            {
              c0: 32222222222222,
              c1: 'Test',
              c2: 'Pension',
              c3: 'Two',
              c4: 75_000,
              c5: 250_000,
              c6: 50_000,
              c7: 375_000,
            },
            {
              c0: 33333333333333,
              c1: 'Pensioner',
              c2: 'Three',
              c3: '',
              c4: 60_000,
              c5: 220_000,
              c6: 30_000,
              c7: 310_000,
            },
          ],
        },
      ],
    });
    const { db, inserts } = buildMockDb();
    const result = await parsePension(
      {
        db,
        fileBuffer: buffer,
        organizationId: 3,
        year: 2025,
        month: 10,
        uploadId: 999,
      },
      excel,
    );

    expect(result.inserted).toBe(3);
    expect(result.errors).toHaveLength(0);

    const row = inserts[0].rows[0];
    expect(row.pin).toBe(31111111111111);
    expect(row.last_name).toBe('Test');
    expect(row.first_name).toBe('Pension');
    expect(row.middle_name).toBe('One');
    expect(row.income_tax_paid).toBe(50_000);
    expect(row.mandatory_pension_contribution).toBe(200_000);
    expect(row.voluntary_pension_contribution).toBe(0);
    expect(row.total_contributions).toBe(250_000);
    expect(row.organization_id).toBe(3);
    expect(row.year).toBe(2025);
    expect(row.month).toBe(10);
  });

  it('PIN bo`sh — error message qaytariladi', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Bad',
          headerRows: [{ values: ['h1'] }, { values: ['h2'] }],
          columns: Array.from({ length: 8 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            // PIN bo'sh (index 0 bo'sh)
            { c0: '', c1: 'X', c2: 'Y', c3: 'Z', c4: 1, c5: 1, c6: 1, c7: 1 },
          ],
        },
      ],
    });
    const { db } = buildMockDb();
    const result = await parsePension(
      {
        db,
        fileBuffer: buffer,
        organizationId: 1,
        year: 2025,
        month: 1,
        uploadId: 1,
      },
      excel,
    );
    expect(result.inserted).toBe(0);
    expect(result.errors[0]).toMatch(/PIN bo'sh/);
  });
});

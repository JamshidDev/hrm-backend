// Tax-five parser integration test.

import { ExcelService } from '@/shared/excel/excel.service';
import { parseTaxFive } from '@/modules/economist/uploads/parsers/tax-five.parser';
import { buildMockDb } from '@/modules/economist/uploads/parsers/__mocks__/parser-mock-db';

describe('parseTaxFive', () => {
  let excel: ExcelService;
  beforeAll(() => {
    excel = new ExcelService();
  });

  it('3 ta qatorni tahlil qiladi', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'TaxFive',
          headerRows: [
            { values: ['Tax-5'] },
            { values: ['Yil 2025'] },
            {
              values: [
                '#',
                'F.I.SH',
                'PIN',
                'Tot',
                'Rep',
                'Type',
                'Tax',
                'RepTax',
              ],
            },
          ],
          columns: Array.from({ length: 8 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            {
              c0: 1,
              c1: 'Tax5 One',
              c2: 31111111111111,
              c3: 1_500_000,
              c4: 1_500_000,
              c5: 1,
              c6: 180_000,
              c7: 180_000,
            },
            {
              c0: 2,
              c1: 'Tax5 Two',
              c2: 32222222222222,
              c3: 2_300_000,
              c4: 2_200_000,
              c5: 2,
              c6: 276_000,
              c7: 264_000,
            },
            {
              c0: 3,
              c1: 'Tax5 Three',
              c2: 33333333333333,
              c3: 1_800_000,
              c4: 1_750_000,
              c5: 1,
              c6: 216_000,
              c7: 210_000,
            },
          ],
        },
      ],
    });
    const { db, inserts } = buildMockDb();
    const result = await parseTaxFive(
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
    expect(row.full_name).toBe('Tax5 One');
    expect(row.total_income).toBe(1_500_000);
    expect(row.income_type).toBe(1);
    expect(row.reported_tax).toBe(180_000);
  });

  it('Income_type noto`g`ri qiymat → default 1', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Bad',
          headerRows: [
            { values: ['h1'] },
            { values: ['h2'] },
            { values: ['h3'] },
          ],
          columns: Array.from({ length: 8 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            {
              c0: 1,
              c1: 'X',
              c2: 31111111111111,
              c3: 1,
              c4: 1,
              c5: 99,
              c6: 1,
              c7: 1,
            },
          ],
        },
      ],
    });
    const { db, inserts } = buildMockDb();
    await parseTaxFive(
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
    expect(inserts[0].rows[0].income_type).toBe(1);
  });
});

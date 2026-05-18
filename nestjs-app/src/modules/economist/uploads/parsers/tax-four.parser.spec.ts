// Tax-four parser integration test:
//   - Real .xlsx buffer (ExcelService bilan in-memory yaratiladi)
//   - DataSource mock'lanadi (insert/select/delete/execute jadval bo'yicha kuzatiladi)

import { ExcelService } from '@/shared/excel/excel.service';
import { parseTaxFour } from '@/modules/economist/uploads/parsers/tax-four.parser';
import {
  buildMockDb,
  type MockRow,
} from '@/modules/economist/uploads/parsers/__mocks__/parser-mock-db';

async function buildTaxFourXlsx(excel: ExcelService): Promise<Buffer> {
  return excel.build({
    sheets: [
      {
        name: 'TaxFour',
        // 3 ta sarlavha qator (SKIP_ROWS=3)
        headerRows: [
          { values: ['Tax-4 Hisobot'] },
          { values: ['Yil 2025', 'Oy 10'] },
          {
            values: [
              '#',
              'F.I.SH',
              'Lavozim',
              'PIN',
              'Status',
              'Sh-Type',
              'Total',
              'Reported',
              'Tax',
              'RepTax',
            ],
          },
        ],
        columns: [
          { header: '', key: 'a', width: 5 },
          { header: '', key: 'b', width: 20 },
          { header: '', key: 'c', width: 20 },
          { header: '', key: 'd', width: 16 },
          { header: '', key: 'e', width: 10 },
          { header: '', key: 'f', width: 10 },
          { header: '', key: 'g', width: 14 },
          { header: '', key: 'h', width: 14 },
          { header: '', key: 'i', width: 14 },
          { header: '', key: 'j', width: 14 },
        ],
        rows: [
          {
            a: 1,
            b: 'Tax Worker One',
            c: 'Engineer',
            d: 31111111111111,
            e: 1,
            f: 1,
            g: 5_000_000,
            h: 4_800_000,
            i: 600_000,
            j: 570_000,
          },
          {
            a: 2,
            b: 'Tax Worker Two',
            c: 'Architect',
            d: 32222222222222,
            e: 1,
            f: 2,
            g: 6_500_000,
            h: 6_500_000,
            i: 780_000,
            j: 780_000,
          },
          {
            a: 3,
            b: 'Tax Worker Three',
            c: 'Foreman',
            d: 33333333333333,
            e: 2,
            f: 1,
            g: 4_200_000,
            h: 4_100_000,
            i: 504_000,
            j: 480_000,
          },
        ],
      },
    ],
  });
}

describe('parseTaxFour', () => {
  let excel: ExcelService;

  beforeAll(() => {
    excel = new ExcelService();
  });

  it('3 ta qatorni to`g`ri tahlil qiladi va batch insert qiladi', async () => {
    const buffer = await buildTaxFourXlsx(excel);
    const { db, inserts } = buildMockDb();

    const result = await parseTaxFour(
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

    // Insert chaqirilgan: avval tax_four_applications, keyin aggregates
    const appInserts = inserts.filter((i) =>
      i.rows.some((r: MockRow) => 'employee_status' in r),
    );
    expect(appInserts.length).toBeGreaterThan(0);
    const row = appInserts[0].rows[0];
    expect(row.pin).toBe(31111111111111);
    expect(row.full_name).toBe('Tax Worker One');
    expect(row.position).toBe('Engineer');
    expect(row.employee_status).toBe(1);
    expect(row.contract_type).toBe(1);
    expect(row.total_salary_income).toBe(5_000_000);
    expect(row.reported_tax).toBe(570_000);
    expect(row.organization_id).toBe(3);
    expect(row.year).toBe(2025);
    expect(row.month).toBe(10);
    expect(row.economist_upload_id).toBe(999);
  });

  it('Bo`sh PIN qator — xato hisobiga qo`shiladi', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Bad',
          headerRows: [
            { values: ['h1'] },
            { values: ['h2'] },
            { values: ['h3'] },
          ],
          columns: Array.from({ length: 10 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            // Bo'sh PIN (index 3 bo'sh)
            {
              c0: 1,
              c1: 'NoPin',
              c2: 'Pos',
              c3: '',
              c4: 1,
              c5: 1,
              c6: 100,
              c7: 100,
              c8: 10,
              c9: 10,
            },
          ],
        },
      ],
    });
    const { db } = buildMockDb();
    const result = await parseTaxFour(
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
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toMatch(/PIN bo'sh/);
  });

  it('Noto`g`ri status/contract → default 1 ga aylantiradi', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Defaults',
          headerRows: [
            { values: ['h1'] },
            { values: ['h2'] },
            { values: ['h3'] },
          ],
          columns: Array.from({ length: 10 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            // status=9 (noto'g'ri), contract=99 (noto'g'ri)
            {
              c0: 1,
              c1: 'X',
              c2: 'Y',
              c3: 31111111111111,
              c4: 9,
              c5: 99,
              c6: 1,
              c7: 1,
              c8: 1,
              c9: 1,
            },
          ],
        },
      ],
    });
    const { db, inserts } = buildMockDb();
    await parseTaxFour(
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

    const inserted = inserts.find((i) =>
      i.rows.some((r: MockRow) => 'employee_status' in r),
    );
    expect(inserted?.rows[0].employee_status).toBe(1);
    expect(inserted?.rows[0].contract_type).toBe(1);
  });
});

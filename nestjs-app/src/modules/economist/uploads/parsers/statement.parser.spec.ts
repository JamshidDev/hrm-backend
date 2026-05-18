// Statement parser integration test:
//   - Excel index N → code String(N).padStart(3,'0')
//   - total_one = SUM(TOTAL_ONE_COLUMNS), total_three = SUM(TOTAL_THREE_COLUMNS),
//     total_two = SUM(TOTAL_TWO_COLUMNS), total_five = SUM(TOTAL_FIVE_COLUMNS)
//   - total_four = total_one + total_three

import { ExcelService } from '@/shared/excel/excel.service';
import { parseStatement } from '@/modules/economist/uploads/parsers/statement.parser';
import { buildMockDb } from '@/modules/economist/uploads/parsers/__mocks__/parser-mock-db';

describe('parseStatement', () => {
  let excel: ExcelService;
  beforeAll(() => {
    excel = new ExcelService();
  });

  it('5 ta xodimni Excel`dan o`qiy oladi va total_one/three/four hisoblaydi', async () => {
    // 8 ustun: full_name, PIN, position, salary, work_time, s_005, s_006, s_007
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Stmt',
          // SKIP_ROWS=2
          headerRows: [
            { values: ['Yuqori sarlavha'] },
            {
              values: [
                'FIO',
                'PIN',
                'Lavozim',
                'Maosh',
                'Vaqt',
                '005',
                '006',
                '007',
              ],
            },
          ],
          columns: Array.from({ length: 8 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            {
              c0: 'Worker One',
              c1: 31111111111111,
              c2: 'Programmer',
              c3: 3_000_000,
              c4: 176,
              c5: 1_800_000, // code 005 (TOTAL_ONE)
              c6: 300_000, // code 006 (TOTAL_ONE)
              c7: 150_000, // code 007 (TOTAL_ONE)
            },
          ],
        },
      ],
    });
    const { db, inserts } = buildMockDb();
    const result = await parseStatement(
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

    expect(result.inserted).toBe(1);

    const row = inserts[0].rows[0];
    expect(row.pin).toBe(31111111111111);
    expect(row.full_name).toBe('Worker One');
    expect(row.position).toBe('Programmer');
    expect(row.main_salary).toBe(3_000_000);
    expect(row.work_time).toBe(176);

    // 005, 006, 007 — barchasi TOTAL_ONE_COLUMNS ichida
    expect(row.total_one).toBe(2_250_000);
    expect(row.total_three).toBe(0);
    expect(row.total_two).toBe(0);
    expect(row.total_five).toBe(0);
    expect(row.total_four).toBe(2_250_000); // total_one + total_three

    // Har bir code uchun s_<code> ustun
    expect(row.s_005).toBe(1_800_000);
    expect(row.s_006).toBe(300_000);
    expect(row.s_007).toBe(150_000);
  });

  it('Bo`sh PIN — xato hisobiga qo`shiladi', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'Bad',
          headerRows: [{ values: ['h1'] }, { values: ['h2'] }],
          columns: Array.from({ length: 6 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            // PIN bo'sh (index 1)
            { c0: 'NoPin', c1: '', c2: 'X', c3: 1000, c4: 100, c5: 500 },
          ],
        },
      ],
    });
    const { db } = buildMockDb();
    const result = await parseStatement(
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

  it('Worker matchmaslik holatida xato xabari + worker_id null', async () => {
    const buffer = await excel.build({
      sheets: [
        {
          name: 'NoMatch',
          headerRows: [{ values: ['h1'] }, { values: ['h2'] }],
          columns: Array.from({ length: 6 }, (_, i) => ({
            header: '',
            key: `c${i}`,
          })),
          rows: [
            {
              c0: 'Ghost User',
              c1: 31111111111111,
              c2: 'X',
              c3: 1000,
              c4: 100,
              c5: 500,
            },
          ],
        },
      ],
    });
    const { db, inserts } = buildMockDb();
    // workers jadval bo'sh — match topilmaydi
    const result = await parseStatement(
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

    expect(result.inserted).toBe(1);
    expect(result.errors).toContain('Ghost User tizimda topilmadi');
    expect(inserts[0].rows[0].worker_id).toBeNull();
  });
});

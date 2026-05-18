// Staffing approve service. Laravel: Economist/StaffingApproveController.
// Shtat jadvali tasdiqlash oqimi (generation preview + approve ro'yxati).

import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import QRCode from 'qrcode';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import {
  staffing_approves,
  staffing_approve_positions,
  department_positions,
  positions,
  organizations,
  departments,
} from '@/db/schema';
import {
  pageOf,
  type PageQueryLike,
} from '@/modules/economist/_shared/helpers';
import { ExcelService } from '@/shared/excel/excel.service';
import {
  HEADER_BLUE,
  STATUS_SUCCESS,
  STATUS_WARNING,
  FMT,
} from '@/shared/excel/style-presets';
import type { ExcelHeaderRow } from '@/shared/excel/types';

@Injectable()
export class StaffingService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly excel: ExcelService,
  ) {}

  /**
   * GET /api/v1/economist/staffing/generate — Laravel `DocumentReplace::changedPositions`.
   * `status=PROCESS` (=1) bo'lgan `department_positions`'ni topib, department bo'yicha
   * guruhlaydi. Har position uchun nom, rate, group, rank, salary, amount, changed_status.
   */
  async generateView(q: PageQueryLike & { organization_id?: number | string }) {
    const orgId =
      q?.organization_id !== undefined ? Number(q.organization_id) : undefined;

    // 1. status=PROCESS (1) bo'lgan department_positions
    const conds: SQL[] = [eq(department_positions.status, 1)];
    if (orgId) conds.push(eq(department_positions.organization_id, orgId));

    const depPositions = await this.db
      .select({
        id: department_positions.id,
        organization_id: department_positions.organization_id,
        department_id: department_positions.department_id,
        position_id: department_positions.position_id,
        rate: department_positions.rate,
        group: department_positions.group,
        rank: department_positions.rank,
        salary: department_positions.salary,
        changed_status: department_positions.changed_status,
      })
      .from(department_positions)
      .where(and(...conds));

    if (!depPositions.length) {
      return { positions: [] };
    }

    // 2. Batch loadlar — position nomlari va departmentlar
    const posIds = [
      ...new Set(depPositions.map((d) => d.position_id).filter(Boolean)),
    ] as number[];
    const depIds = [
      ...new Set(depPositions.map((d) => d.department_id).filter(Boolean)),
    ] as number[];

    const positionRows = posIds.length
      ? await this.db
          .select({ id: positions.id, name: positions.name })
          .from(positions)
          .where(inArray(positions.id, posIds))
      : [];
    const departmentRows = depIds.length
      ? await this.db
          .select({
            id: departments.id,
            name: departments.name,
            parent_id: departments.parent_id,
          })
          .from(departments)
          .where(inArray(departments.id, depIds))
      : [];
    const posMap = new Map<number, string | null>();
    for (const p of positionRows) posMap.set(p.id, p.name);
    const depMap = new Map<number, (typeof departmentRows)[0]>();
    for (const d of departmentRows) depMap.set(d.id, d);

    // 3. Department bo'yicha guruhlash
    const grouped = new Map<number, typeof depPositions>();
    for (const dp of depPositions) {
      const did = dp.department_id ?? 0;
      if (!grouped.has(did)) grouped.set(did, []);
      grouped.get(did)!.push(dp);
    }

    const changedStatusName = (id: number | null): string => {
      switch (id) {
        case 1:
          return 'Mavjud';
        case 2:
          return 'Qo`shilgan';
        case 3:
          return 'O`zgartirilgan';
        case 4:
          return 'O`chirilgan';
        default:
          return '-';
      }
    };

    const result = Array.from(grouped.entries()).map(([depId, ps]) => {
      const dep = depMap.get(depId);
      return {
        id: dep?.id ?? depId,
        parent_id: dep?.parent_id ?? null,
        name: dep?.name ?? null,
        positions: ps.map((p) => ({
          id: p.id,
          name: posMap.get(p.position_id ?? -1) ?? '-',
          rate: p.rate,
          group: p.group,
          rank: p.rank,
          salary: p.salary,
          amount: (p.salary ?? 0) * ((p.rate ?? 100) / 100),
          changed_status: {
            id: p.changed_status,
            name: changedStatusName(p.changed_status),
          },
        })),
      };
    });

    return { positions: result };
  }

  // POST /api/v1/economist/staffing/generate — generation job dispatch.
  // eslint-disable-next-line @typescript-eslint/require-await
  async generate(_body: unknown) {
    return { dispatched: true };
  }

  // GET /api/v1/economist/staffing/approve — tasdiqlashga yuborilgan shtatlar ro'yxati.
  async approveList(q: PageQueryLike) {
    const { page, perPage, offset } = pageOf(q);
    const where = notDeleted(staffing_approves);
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(staffing_approves)
        .where(where)
        .orderBy(desc(staffing_approves.id))
        .limit(perPage)
        .offset(offset),
      this.db.select({ total: count() }).from(staffing_approves).where(where),
    ]);
    return {
      current_page: page,
      per_page: perPage,
      total: Number(total),
      data: rows,
    };
  }

  // GET /api/v1/economist/staffing/approve/export — Excel hisobot.
  // Demo: ExcelService bilan styled .xlsx Buffer qaytaradi.
  // Controller bu Buffer'ni download header bilan response stream'ga yozadi.
  async approveListExport(): Promise<Buffer> {
    const rows = await this.db
      .select()
      .from(staffing_approves)
      .where(notDeleted(staffing_approves))
      .orderBy(desc(staffing_approves.id))
      .limit(1000); // ko'p bo'lsa stream'ga o'tkazamiz

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: 'Tasdiqlangan shtatlar',
          columns: [
            { header: '№', key: 'id', width: 8 },
            { header: 'Tashkilot ID', key: 'organization_id', width: 14 },
            { header: 'Buyruq №', key: 'number', width: 12 },
            { header: 'Sana', key: 'date', width: 14, numFmt: FMT.DATE },
            { header: 'Direktor ID', key: 'director_id', width: 14 },
            { header: 'Tasdiqlovchi ID', key: 'confirmatory_id', width: 16 },
            {
              header: 'Generation',
              key: 'generate_label',
              width: 14,
            },
            {
              header: 'Tasdiqlash',
              key: 'confirmation_label',
              width: 14,
            },
            {
              header: 'Yaratilgan',
              key: 'created_at',
              width: 20,
              numFmt: FMT.DATETIME,
            },
          ],
          rows: rows.map((r) => ({
            ...r,
            generate_label: r.generate === 2 ? 'Tugallangan' : 'Jarayonda',
            confirmation_label:
              r.confirmation === 2 ? 'Tasdiqlangan' : 'Kutilmoqda',
          })),
          headerStyle: HEADER_BLUE,
          autoFilter: true,
          freezeHeader: true,
          // Per-row conditional rang — `confirmation` ustuniga (8-ustun) bog'liq.
          rowStyle: (row) =>
            row.confirmation === 2
              ? // tasdiqlangan — to'q yashil emas, butun qatorga juda yumshoq
                {
                  bgColor: 'FFF0FDF4',
                  border: 'thin',
                }
              : {
                  bgColor: 'FFFFFBEB',
                  border: 'thin',
                },
          totalRow: {
            values: { id: 'JAMI', organization_id: rows.length },
          },
        },
        // 2-tab: statuslar bo'yicha pivot
        {
          name: "Statuslar bo'yicha",
          columns: [
            { header: 'Holat', key: 'status', width: 25 },
            { header: 'Soni', key: 'count', width: 12 },
          ],
          rows: [
            {
              status: 'Tasdiqlangan',
              count: rows.filter((r) => r.confirmation === 2).length,
            },
            {
              status: 'Kutilmoqda',
              count: rows.filter((r) => r.confirmation !== 2).length,
            },
          ],
          headerStyle: HEADER_BLUE,
          rowStyle: (row) =>
            row.status === 'Tasdiqlangan' ? STATUS_SUCCESS : STATUS_WARNING,
          autoFilter: false,
        },
      ],
    });
  }

  /**
   * GET /api/v1/economist/staffing/approve/:id/export — to'liq parity Excel.
   *
   * Laravel `StaffingApproveExport` ekvivalenti:
   *   - Row 1: TITLE (A1:H1 merge, font 16pt bold)
   *   - Rows 2-5: TASDIQLAYMAN + direktor pozitsiyasi + qisqa ism + sana (G:H merge)
   *   - Row 6: Tashkilot nomi (A6:H6 merge)
   *   - Row 7: "SHTATLAR JADVALIGA O'ZGARTIRISH/TASDIQLASH" (A7:H7 merge)
   *   - Row 8: bo'sh
   *   - Row 9: Column headers (T/r | Lavozim | Shtat soni | Razryad | Guruh | Maosh | Jami | Holati)
   *   - Row 10+: Data — har organization uchun bir nechta position qator
   *   - G4: QR rasm (drawing)
   *
   * `customize` hook orqali Laravel `WithEvents`/`AfterSheet` parity.
   */
  async approveDetailExport(id: number): Promise<Buffer> {
    // 1. Approve yozuvini olamiz
    const [approve] = await this.db
      .select()
      .from(staffing_approves)
      .where(eq(staffing_approves.id, id))
      .limit(1);
    if (!approve) throw new BusinessException(404, 'not_found');

    // 2. Tashkilot
    const [org] = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        full_name: organizations.full_name,
      })
      .from(organizations)
      .where(eq(organizations.id, approve.organization_id))
      .limit(1);

    // 3. Approve positions + department_position + position name
    const approvePositions = await this.db
      .select({
        id: staffing_approve_positions.id,
        department_position_id:
          staffing_approve_positions.department_position_id,
      })
      .from(staffing_approve_positions)
      .where(eq(staffing_approve_positions.staffing_approve_id, id));

    const depPosIds = approvePositions.map((p) => p.department_position_id);
    const depPositions = depPosIds.length
      ? await this.db
          .select({
            id: department_positions.id,
            position_id: department_positions.position_id,
            organization_id: department_positions.organization_id,
            rate: department_positions.rate,
            group: department_positions.group,
            rank: department_positions.rank,
            salary: department_positions.salary,
            changed_status: department_positions.changed_status,
          })
          .from(department_positions)
          .where(inArray(department_positions.id, depPosIds))
      : [];

    const posIds = [
      ...new Set(depPositions.map((d) => d.position_id).filter(Boolean)),
    ] as number[];
    const positionRows = posIds.length
      ? await this.db
          .select({ id: positions.id, name: positions.name })
          .from(positions)
          .where(inArray(positions.id, posIds))
      : [];
    const posMap = new Map(positionRows.map((p) => [p.id, p.name]));

    // 4. Tashkilot bo'yicha guruhlash → har orgda position'lar nested
    const orgIds = [
      ...new Set(depPositions.map((d) => d.organization_id)),
    ] as number[];
    const orgRows = orgIds.length
      ? await this.db
          .select({ id: organizations.id, name: organizations.name })
          .from(organizations)
          .where(inArray(organizations.id, orgIds))
      : [];
    const orgMap = new Map(orgRows.map((o) => [o.id, o.name]));

    type PosRow = {
      tr: number;
      name: string;
      rate: number;
      rank: string;
      group: number;
      salary: number;
      amount: number;
      changed_status: string;
    };
    const groupsByOrg = new Map<number, PosRow[]>();
    let trCounter = 1;
    for (const dp of depPositions) {
      const orgId = dp.organization_id ?? 0;
      if (!groupsByOrg.has(orgId)) groupsByOrg.set(orgId, []);
      groupsByOrg.get(orgId)!.push({
        tr: trCounter++,
        name: posMap.get(dp.position_id ?? -1) ?? '-',
        rate: dp.rate ?? 0,
        rank: dp.rank ?? '-',
        group: dp.group ?? 0,
        salary: dp.salary ?? 0,
        amount: (dp.salary ?? 0) * ((dp.rate ?? 100) / 100),
        changed_status:
          dp.changed_status === 1
            ? 'Mavjud'
            : dp.changed_status === 2
              ? 'Qo`shilgan'
              : dp.changed_status === 3
                ? 'O`zgartirilgan'
                : 'O`chirilgan',
      });
    }

    // 5. QR rasm (approve id'ni kodlaymiz)
    const qrPayload = `staffing-approve://${approve.id}`;
    const qrBuffer = await QRCode.toBuffer(qrPayload, {
      type: 'png',
      width: 120,
      margin: 0,
    });

    // 6. Title section (9 ta qator) — `headerRows` orqali deklarativ
    const dateStr = approve.date ?? new Date().toISOString().slice(0, 10);
    const orgFullName =
      org?.full_name ?? org?.name ?? `Org #${approve.organization_id}`;

    const titleRows: ExcelHeaderRow[] = [
      // Row 1: TITLE
      {
        values: ['TAKLIF ETILGAN SHTATLAR JADVALI NAMUNASI'],
        merges: ['A1:H1'],
        style: {
          bold: true,
          fontSize: 16,
          align: 'center',
          verticalAlign: 'middle',
          wrapText: true,
        },
        height: 50,
      },
      // Row 2: TASDIQLAYMAN
      {
        values: ['', '', '', '', '', '', '"TASDIQLAYMAN"'],
        merges: ['G2:H2'],
        style: { bold: true, align: 'center', verticalAlign: 'bottom' },
      },
      // Row 3: Direktor pozitsiyasi
      {
        values: ['', '', '', '', '', '', 'Direktor'],
        merges: ['G3:H3'],
        style: {
          bold: true,
          align: 'center',
          verticalAlign: 'bottom',
          wrapText: true,
        },
        height: 40,
      },
      // Row 4: Direktor ismi (QR rasm uchun joy ham shu yerda)
      {
        values: [
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          `Director #${approve.director_id ?? '-'}`,
        ],
        merges: ['F4:G5'],
        style: { bold: true, align: 'center', verticalAlign: 'bottom' },
        height: 30,
      },
      // Row 5: Sana
      {
        values: ['', '', '', '', '', '', '', dateStr],
        style: { bold: true, align: 'center', verticalAlign: 'top' },
        height: 30,
      },
      // Row 6: Tashkilot
      {
        values: [`${orgFullName}ning ${dateStr} xolatiga`],
        merges: ['A6:H6'],
        style: {
          bold: true,
          fontSize: 12,
          align: 'center',
          verticalAlign: 'bottom',
        },
        height: 20,
      },
      // Row 7: Sub-title
      {
        values: ['SHTATLAR JADVALIGA O`ZGARTIRISH/TASDIQLASH'],
        merges: ['A7:H7'],
        style: {
          bold: true,
          fontSize: 16,
          align: 'center',
          verticalAlign: 'top',
          wrapText: true,
        },
        height: 30,
      },
      // Row 8: bo'sh
      { values: [''], style: {} },
      // Row 9: Column headers
      {
        values: [
          'T/r',
          'Lavozim',
          'Shtat soni',
          'Razryad',
          'Guruh',
          'Lavozim maoshi',
          'Jami',
          'Holati',
        ],
        style: {
          bold: true,
          fontSize: 12,
          align: 'center',
          verticalAlign: 'middle',
          border: 'thin',
          wrapText: true,
        },
        height: 24,
      },
    ];

    // 7. Data rows — har organization uchun "merged name" header + position'lar
    const excelRows: Record<string, unknown>[] = [];
    const dataMerges: string[] = [];
    let currentRow = 10; // titleRows.length + 1

    for (const [orgId, posList] of groupsByOrg.entries()) {
      const orgName = orgMap.get(orgId) ?? `Org #${orgId}`;
      // Organization sarlavhasi — A:G merge
      excelRows.push({
        tr: orgName,
        name: '',
        rate: '',
        rank: '',
        group: '',
        salary: '',
        amount: '',
        status: '',
      });
      dataMerges.push(`A${currentRow}:G${currentRow}`);
      currentRow++;

      for (const p of posList) {
        excelRows.push({
          tr: p.tr,
          name: p.name,
          rate: p.rate,
          rank: p.rank,
          group: p.group,
          salary: p.salary,
          amount: p.amount,
          status: p.changed_status,
        });
        currentRow++;
      }
    }

    const lastDataRow = currentRow - 1;

    // 8. ExcelService chaqirig'i
    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: 'Shtatlar jadvali',
          columns: [
            { header: '', key: 'tr', width: 5 },
            { header: '', key: 'name', width: 45 },
            { header: '', key: 'rate', width: 10 },
            { header: '', key: 'rank', width: 10 },
            { header: '', key: 'group', width: 10 },
            { header: '', key: 'salary', width: 10, numFmt: FMT.MONEY },
            { header: '', key: 'amount', width: 15, numFmt: FMT.MONEY },
            { header: '', key: 'status', width: 20 },
          ],
          rows: excelRows,
          headerRows: titleRows,
          merges: dataMerges,
          // Customize: QR drawing + jadval border'lari + page setup
          customize: (ws, wb) => {
            // QR rasm (G4 yacheykaga)
            const qrId = wb.addImage({
              buffer: qrBuffer as unknown as ArrayBuffer,
              extension: 'png',
            });
            ws.addImage(qrId, 'G4:G5');

            // Data qatorlarning hammasi uchun ingichka border + center align
            if (lastDataRow >= 10) {
              ws.getCell(`A10`); // ensure rows materialized
              for (let r = 10; r <= lastDataRow; r++) {
                const row = ws.getRow(r);
                row.eachCell((cell) => {
                  cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                  };
                  cell.alignment = {
                    horizontal: 'center',
                    vertical: 'middle',
                    wrapText: true,
                  };
                });
              }
              // Print area
              ws.pageSetup.printArea = `A1:H${lastDataRow}`;
            }

            // Page setup — landscape, 1 page wide
            ws.pageSetup.orientation = 'landscape';
            ws.pageSetup.fitToWidth = 1;
            ws.pageSetup.fitToHeight = 0;
            ws.pageSetup.margins = {
              left: 0.25,
              right: 0.25,
              top: 0.5,
              bottom: 0.5,
              header: 0,
              footer: 0,
            };
          },
        },
      ],
    });
  }

  // DELETE /api/v1/economist/staffing/approve/{id} — soft-delete.
  // Tasdiqlangan (confirmation=SUCCESS=3) yozuvni o'chirish taqiqlanadi.
  async approveDestroy(id: number) {
    const [row] = await this.db
      .select({
        id: staffing_approves.id,
        confirmation: staffing_approves.confirmation,
      })
      .from(staffing_approves)
      .where(eq(staffing_approves.id, id))
      .limit(1);
    if (!row) throw new BusinessException(404, 'not_found');
    if (row.confirmation === 3) {
      throw new BusinessException(
        400,
        'you_cannot_delete_a_document_that_has_been_approved',
      );
    }
    await this.db
      .update(staffing_approves)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(staffing_approves.id, id));
  }
}

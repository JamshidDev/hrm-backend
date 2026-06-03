// Staffing approve service. Laravel: Economist/StaffingApproveController + App\Services\Economist\DocumentReplace.
// Shtat jadvali tasdiqlash oqimi:
//   - approveList  → GET staffing/approve   (StaffingApprove.filter→ApproveIndexResource)
//   - generateView → GET staffing/generate  (DocumentReplace::changedPositions — shtat o'zgarishlari)
//   - generate     → POST staffing/generate (DocumentReplace::generate — hujjat + raqamli imzo QR)
//   - approveDestroy → DELETE staffing/approve/{id}

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import QRCode from 'qrcode';
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  max,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { I18nService } from 'nestjs-i18n';
import { InjectDb } from '@/db/drizzle.module';
import type { DataSource, Tx } from '@/db/types';
import { BusinessException } from '@/common/exceptions/business.exception';
import { notDeleted } from '@/common/database/soft-delete.helper';
import { OrgScopeService } from '@/common/database/org-scope.service';
import { RequestContext } from '@/common/context/request.context';
import { MinioService } from '@/shared/minio/minio.service';
import { ExcelService } from '@/shared/excel/excel.service';
import { ConvertService } from '@/shared/convert/convert.service';
import {
  staffing_approves,
  staffing_approve_positions,
  staffing_approve_confirmations,
  department_positions,
  positions as positionsTable,
  organizations,
  departments,
  worker_positions,
  workers,
} from '@/db/schema';
import { numberFormat } from '@/modules/economist/_shared/helpers';
import {
  getFullPosition,
  getShortPosition,
} from '@/modules/hr/_shared/position-helper';
import { CONFIRMATION_STATUS_LABELS } from '@/modules/confirmation/confirmations/confirmations.types';
import {
  StaffingApproveListQueryDto,
  StaffingGenerateViewQueryDto,
  StaffingGenerateDto,
} from '@/modules/economist/staffing/dto/staffing.dto';

// Laravel Modules\Economist\Enums\ChangedStatusEnum (1=CREATED, 2=UPDATED, 3=DELETED).
const CHANGED_STATUS_LABELS: Record<number, string> = {
  1: 'messages.economist.changed.change_statuses.created',
  2: 'messages.economist.changed.change_statuses.updated',
  3: 'messages.economist.changed.change_statuses.deleted',
};

// Modules\Confirmation\Enums\ConfirmationStatusEnum.
const CONFIRMATION_STATUS_SUCCESS = 3;
// department_positions.status — DocumentReplace ConfirmationStatusEnum::PROCESS ishlatadi.
const DEPARTMENT_POSITION_STATUS_PROCESS = 1;
// StaffingApprove::generate (boot create) — 3 ("generate qilingan").
const STAFFING_GENERATE = 3;
const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// QR — Laravel SignatureService: config('app.front_url') . '/public/staffing-approve/{uuid}'.
const FRONT_URL = process.env.APP_FRONT_URL ?? 'https://hrm.railway.uz';

// Worker::short_name() istisnolari (2-harfli prefikslar).
const SHORT_NAME_EXCEPTIONS = new Set([
  'Yu',
  'YU',
  'SH',
  'sh',
  'Sh',
  'Ch',
  'CH',
  'ch',
  'yu',
  "O'",
  "o'",
  'O?',
  'o?',
  "G'",
  'G?',
  'g?',
  "g'",
  'Oʻ',
  'O’',
  'Gʻ',
  'G’',
  'oʻ',
  'o’',
  'gʻ',
  'g’',
]);

const UZ_MONTHS = [
  'yanvar',
  'fevral',
  'mart',
  'aprel',
  'may',
  'iyun',
  'iyul',
  'avgust',
  'sentyabr',
  'oktyabr',
  'noyabr',
  'dekabr',
];

// confirmatory (worker_position) join natijasi — WorkerPositionMinimalResource uchun.
interface ConfRow {
  id: number;
  org_id: number | null;
  org_name: string | null;
  org_name_ru: string | null;
  org_name_en: string | null;
  org_group: boolean | null;
  org_full_name: string | null;
  worker_id: number | null;
  worker_photo: string | null;
  worker_last: string | null;
  worker_first: string | null;
  worker_middle: string | null;
  dept_name: string | null;
  dept_level: number | null;
  pos_name: string | null;
}

// generate() uchun worker_position (director/confirmatory/confirmations) ma'lumoti.
interface WpInfo {
  id: number;
  worker_id: number | null;
  worker_first: string | null;
  worker_middle: string | null;
  worker_last: string | null;
  pos_name: string | null;
  dept_name: string | null;
  dept_level: number | null;
  org_full_name: string | null;
}

// changedPositions natijasi (Excel data + JSON javob uchun).
export interface ChangedDepartment {
  id: number;
  parent_id: number | null;
  name: string | null;
  positions: {
    id: number;
    name: string | null;
    rate: number;
    group: number | null;
    rank: string | null;
    salary: string;
    amount: string;
    changed_status: { id: number | null; name: string };
  }[];
}

@Injectable()
export class StaffingService {
  constructor(
    @InjectDb() private readonly db: DataSource,
    private readonly i18n: I18nService,
    private readonly ctx: RequestContext,
    private readonly minio: MinioService,
    private readonly scope: OrgScopeService,
    private readonly excel: ExcelService,
    private readonly convert: ConvertService,
  ) {}

  // i18n enum label — id => map kaliti => tarjima.
  private enumName(
    map: Record<number, string>,
    id: number | null | undefined,
    lang: string,
  ): string {
    const key = id != null ? map[id] : undefined;
    if (!key) return '';
    const v = this.i18n.t(key, { lang });
    return typeof v === 'string' ? v : '';
  }

  // Laravel OrganizationListResource: ru→name_ru, en→name_en, default→name (fallback YO'Q).
  private orgName(
    o: { name: string | null; name_ru: string | null; name_en: string | null },
    lang: string,
  ): string | null {
    if (lang === 'ru') return o.name_ru;
    if (lang === 'en') return o.name_en;
    return o.name;
  }

  // Laravel Worker::short_name() — F.M.Lastname (2-harfli istisno prefikslar bilan).
  private shortName(
    first: string | null,
    middle: string | null,
    last: string | null,
  ): string {
    const shorten = (name: string | null): string => {
      if (!name) return '';
      const two = name.substring(0, 2);
      return SHORT_NAME_EXCEPTIONS.has(two) ? two : name.substring(0, 1);
    };
    return `${shorten(first)}.${shorten(middle)}.${last ?? ''}`;
  }

  // Laravel Helper::getDateTex($date) — "{yil}-yil {kun}-{oy nomi}".
  private getDateTex(dateStr: string): string {
    const [y, m, d] = dateStr.split('-').map((s) => Number(s));
    const month = UZ_MONTHS[(m || 1) - 1] ?? '';
    return `${y}-yil ${String(d).padStart(2, '0')}-${month}`;
  }

  /**
   * GET /api/v1/economist/staffing/approve — Laravel `StaffingApproveController::index`.
   * StaffingApprove::filter(org-scope)->with([organization, confirmatory.*])->orderByDesc(id)->paginate.
   * → ApproveIndexResource {id, number, date, organization, generate, confirmatory, confirmation}.
   */
  async approveList(q: StaffingApproveListQueryDto) {
    const lang = this.ctx.lang;
    const page = q.page ? Number(q.page) : 1;
    const perPage = q.per_page ? Number(q.per_page) : 10;
    const offset = (page - 1) * perPage;

    const inScope = await this.scope.whereOrg(
      staffing_approves.organization_id,
      {
        organizations: q.organizations,
        organization_id: q.organization_id,
      },
    );
    const where = and(notDeleted(staffing_approves), inScope);

    const [{ total }] = await this.db
      .select({ total: count() })
      .from(staffing_approves)
      .where(where);
    const totalNum = Number(total);
    if (totalNum === 0) {
      return { current_page: page, total: 0, data: [] };
    }

    const rows = await this.db
      .select()
      .from(staffing_approves)
      .where(where)
      .orderBy(desc(staffing_approves.id))
      .limit(perPage)
      .offset(offset);

    const orgIds = [
      ...new Set(
        rows
          .map((r) => r.organization_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const confIds = [
      ...new Set(
        rows
          .map((r) => r.confirmatory_id)
          .filter((id): id is number => id != null),
      ),
    ];

    const [orgList, confList] = await Promise.all([
      orgIds.length
        ? this.db
            .select({
              id: organizations.id,
              name: organizations.name,
              name_ru: organizations.name_ru,
              name_en: organizations.name_en,
              group: organizations.group,
            })
            .from(organizations)
            .where(inArray(organizations.id, orgIds))
        : [],
      confIds.length ? this.fetchConfRows(confIds) : [],
    ]);
    const orgMap = new Map(orgList.map((o) => [o.id, o] as const));
    const confMap = new Map<number, ConfRow>(
      confList.map((c): [number, ConfRow] => [c.id, c]),
    );

    const data = await Promise.all(
      rows.map(async (r) => {
        const org =
          r.organization_id != null
            ? (orgMap.get(r.organization_id) ?? null)
            : null;
        const confirmatory =
          r.confirmatory_id != null
            ? confMap.get(r.confirmatory_id)
            : undefined;
        return {
          id: r.id,
          number: r.number,
          date: r.date,
          organization: org
            ? {
                id: org.id,
                name: this.orgName(org, lang),
                group: org.group ?? false,
              }
            : null,
          generate: r.generate,
          confirmatory: await this.buildConfirmatory(confirmatory, lang),
          confirmation: {
            id: r.confirmation,
            name: this.enumName(
              CONFIRMATION_STATUS_LABELS,
              r.confirmation,
              lang,
            ),
          },
        };
      }),
    );

    return { current_page: page, total: totalNum, data };
  }

  // worker_position'lar (confirmatory uchun) — join'li select.
  private fetchConfRows(ids: number[]): Promise<ConfRow[]> {
    return this.db
      .select({
        id: worker_positions.id,
        org_id: organizations.id,
        org_name: organizations.name,
        org_name_ru: organizations.name_ru,
        org_name_en: organizations.name_en,
        org_group: organizations.group,
        org_full_name: organizations.full_name,
        worker_id: workers.id,
        worker_photo: workers.photo,
        worker_last: workers.last_name,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        dept_name: departments.name,
        dept_level: departments.level,
        pos_name: positionsTable.name,
      })
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(
        organizations,
        and(
          eq(organizations.id, worker_positions.organization_id),
          isNull(organizations.deleted_at),
        ),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(inArray(worker_positions.id, ids));
  }

  // Laravel HR\Transformers\WorkerPosition\WorkerPositionMinimalResource.
  private async buildConfirmatory(c: ConfRow | undefined, lang: string) {
    if (!c) return null;
    return {
      id: c.id,
      worker: c.worker_id
        ? {
            id: c.worker_id,
            photo: await this.minio.fileUrl(c.worker_photo),
            last_name: c.worker_last,
            first_name: c.worker_first,
            middle_name: c.worker_middle,
          }
        : null,
      organization: c.org_id
        ? {
            id: c.org_id,
            name: this.orgName(
              {
                name: c.org_name,
                name_ru: c.org_name_ru,
                name_en: c.org_name_en,
              },
              lang,
            ),
            group: c.org_group ?? false,
          }
        : null,
      post_name: getFullPosition({
        position_name: c.pos_name,
        department_name: c.dept_name,
        department_level: c.dept_level,
        organization_full_name: c.org_full_name,
      }),
      post_short_name: getShortPosition({
        position_name: c.pos_name,
        department_name: c.dept_name,
        department_level: c.dept_level,
        organization_full_name: c.org_full_name,
      }),
    };
  }

  /**
   * GET /api/v1/economist/staffing/generate — Laravel `DocumentReplace::changedPositions`.
   * department_positions status=PROCESS(1) + org → department bo'yicha guruh + changed_status.
   */
  async generateView(q: StaffingGenerateViewQueryDto) {
    const orgId =
      q.organization_id != null
        ? Number(q.organization_id)
        : (this.ctx.user?.organization_id ?? null);
    const positions = await this.buildChangedPositions(orgId, []);
    return { positions };
  }

  // changedPositions yadrosi (generateView + Excel data uchun umumiy).
  private async buildChangedPositions(
    orgId: number | null,
    depIds: number[],
  ): Promise<ChangedDepartment[]> {
    const lang = this.ctx.lang;
    const conds: SQL[] = [
      notDeleted(department_positions),
      eq(department_positions.status, DEPARTMENT_POSITION_STATUS_PROCESS),
    ];
    if (orgId != null)
      conds.push(eq(department_positions.organization_id, orgId));
    if (depIds.length) conds.push(inArray(department_positions.id, depIds));

    const rows = await this.db
      .select({
        id: department_positions.id,
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

    if (!rows.length) return [];

    const posIds = [
      ...new Set(
        rows.map((r) => r.position_id).filter((id): id is number => id != null),
      ),
    ];
    const depIdsAll = [
      ...new Set(
        rows
          .map((r) => r.department_id)
          .filter((id): id is number => id != null),
      ),
    ];
    const [positionRows, departmentRows] = await Promise.all([
      posIds.length
        ? this.db
            .select({ id: positionsTable.id, name: positionsTable.name })
            .from(positionsTable)
            .where(inArray(positionsTable.id, posIds))
        : [],
      depIdsAll.length
        ? this.db
            .select({
              id: departments.id,
              name: departments.name,
              parent_id: departments.parent_id,
            })
            .from(departments)
            .where(inArray(departments.id, depIdsAll))
        : [],
    ]);
    const posMap = new Map(positionRows.map((p) => [p.id, p.name] as const));
    const depMap = new Map(departmentRows.map((d) => [d.id, d] as const));

    const grouped = new Map<number, typeof rows>();
    for (const r of rows) {
      const did = r.department_id ?? 0;
      const bucket = grouped.get(did);
      if (bucket) bucket.push(r);
      else grouped.set(did, [r]);
    }

    return Array.from(grouped.entries()).map(([depId, ps]) => {
      const dep = depMap.get(depId);
      return {
        id: dep?.id ?? depId,
        parent_id: dep?.parent_id ?? null,
        name: dep?.name ?? null,
        positions: ps.map((p) => {
          const rate = (p.rate ?? 0) / 100;
          const salary = Number(p.salary ?? 0);
          return {
            id: p.id,
            name:
              p.position_id != null
                ? (posMap.get(p.position_id) ?? null)
                : null,
            rate,
            group: p.group,
            rank: p.rank,
            salary: numberFormat(salary, 2),
            amount: numberFormat(salary * rate, 2),
            changed_status: {
              id: p.changed_status,
              name: this.enumName(
                CHANGED_STATUS_LABELS,
                p.changed_status,
                lang,
              ),
            },
          };
        }),
      };
    });
  }

  /**
   * POST /api/v1/economist/staffing/generate — Laravel `DocumentReplace::generate`.
   *
   * 1) Validatsiya: confirmatory != director, ikkalasi confirmations ichida emas.
   * 2) StaffingApprove yaratish (yangi) yoki olish (staffing_approve_id, confirmation != SUCCESS).
   * 3) department_positions (status=PROCESS) pivot sync.
   * 4) StaffingApproveConfirmation sync (confirmations='s', confirmatory='c', director='d').
   * 5) Excel (StaffingApproveExport layout) + QR → minio; xlsx → PDF → minio.
   */
  async generate(body: StaffingGenerateDto): Promise<void> {
    const user = this.ctx.user_or_fail;
    const orgId = user.organization_id;
    if (orgId == null) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.organization_not_found'),
      );
    }
    const date = body.date ?? new Date().toISOString().slice(0, 10);
    // confirmations — [{id, order}]. order bo'yicha sort qilib worker_position ID'larini extract.
    const confirmations = [...(body.confirmations ?? [])]
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);

    // Validatsiya (Laravel syncConfirmations) — yozuvdan oldin.
    // Laravel `in_array($id, $request->confirmations)` object-array bo'lgani uchun hech qachon
    // mos kelmaydi (int vs object), shuning uchun faqat confirmatory === director tekshiriladi.
    // Bir worker bir vaqtda confirmation + confirmatory bo'lishi mumkin (syncConfirmations
    // updateOrCreate (sa_id, worker_id) bo'yicha deduplikatsiya qiladi).
    if (body.confirmatory_id === body.director_id) {
      throw new BusinessException(
        400,
        this.i18n.t('messages.not_allowed_confirmatory_and_director'),
      );
    }

    // department_positions status=PROCESS va id ∈ body.department_positions.
    const depIdsInput = body.department_positions ?? [];
    const depPosRows = depIdsInput.length
      ? await this.db
          .select({ id: department_positions.id })
          .from(department_positions)
          .where(
            and(
              notDeleted(department_positions),
              eq(
                department_positions.status,
                DEPARTMENT_POSITION_STATUS_PROCESS,
              ),
              inArray(department_positions.id, depIdsInput),
            ),
          )
      : [];
    const departmentPositionsIds = depPosRows.map((r) => r.id);

    // director + confirmatory + confirmations worker_position'lari.
    const allWpIds = [
      ...new Set([body.director_id, body.confirmatory_id, ...confirmations]),
    ];
    const wpRows = await this.db
      .select({
        id: worker_positions.id,
        worker_id: workers.id,
        worker_first: workers.first_name,
        worker_middle: workers.middle_name,
        worker_last: workers.last_name,
        pos_name: positionsTable.name,
        dept_name: departments.name,
        dept_level: departments.level,
        org_full_name: organizations.full_name,
      })
      .from(worker_positions)
      .leftJoin(workers, eq(workers.id, worker_positions.worker_id))
      .leftJoin(
        organizations,
        eq(organizations.id, worker_positions.organization_id),
      )
      .leftJoin(departments, eq(departments.id, worker_positions.department_id))
      .leftJoin(
        positionsTable,
        eq(positionsTable.id, worker_positions.position_id),
      )
      .where(inArray(worker_positions.id, allWpIds));
    const wpMap = new Map<number, WpInfo>(wpRows.map((w) => [w.id, w]));

    const director = wpMap.get(body.director_id);
    if (!director) {
      // Laravel WorkerPosition::findOrFail($request->director_id).
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }

    // tashkilot (Excel sarlavhasi uchun).
    const [org] = await this.db
      .select({ id: organizations.id, full_name: organizations.full_name })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    // Excel data — Laravel changedPositions($user, $departmentPositionsIds).
    // Org-filter = request('organization_id', user.organization_id) — staffing_approve
    // record va Excel sarlavhasi user org bo'lsa-da, department_positions filtri request org.
    const changedOrgId = body.organization_id ?? orgId;
    const changed = await this.buildChangedPositions(
      changedOrgId,
      departmentPositionsIds,
    );

    // ---- DB yozuvlari (transaction) ----
    const saved = await this.db.transaction(async (tx) => {
      let saId: number;
      let uuid: string;
      let file: string;
      let confirmationFile: string;

      if (body.staffing_approve_id) {
        const [existing] = await tx
          .select()
          .from(staffing_approves)
          .where(
            and(
              ne(staffing_approves.confirmation, CONFIRMATION_STATUS_SUCCESS),
              eq(staffing_approves.id, body.staffing_approve_id),
              notDeleted(staffing_approves),
            ),
          )
          .limit(1);
        if (!existing) {
          // Laravel: ['status' => false, 'message' => 'Staffing Approve not found.'].
          throw new BusinessException(400, 'Staffing Approve not found.');
        }
        saId = existing.id;
        uuid = existing.uuid;
        file = existing.file ?? `staffing-approve/${existing.uuid}.xlsx`;
        confirmationFile =
          existing.confirmation_file ??
          `documents/staffing-approve/${existing.uuid}.pdf`;
      } else {
        uuid = randomUUID();
        file = `staffing-approve/${uuid}.xlsx`;
        confirmationFile = `documents/staffing-approve/${uuid}.pdf`;

        // Laravel getNumber: whereYear('date', now()->year) + org → max(number)+1.
        const currentYear = new Date().getFullYear();
        const [{ maxNum }] = await tx
          .select({ maxNum: max(staffing_approves.number) })
          .from(staffing_approves)
          .where(
            and(
              eq(staffing_approves.organization_id, orgId),
              sql`EXTRACT(YEAR FROM ${staffing_approves.date}) = ${currentYear}`,
              notDeleted(staffing_approves),
            ),
          );
        const number = (maxNum ?? 0) + 1;

        const [{ nextId }] = await tx
          .select({
            nextId: sql<number>`COALESCE(MAX(${staffing_approves.id}), 0) + 1`,
          })
          .from(staffing_approves);
        saId = Number(nextId);

        await tx.insert(staffing_approves).values({
          id: saId,
          uuid,
          organization_id: orgId,
          user_id: user.id,
          date,
          confirmatory_id: body.confirmatory_id,
          director_id: body.director_id,
          generate: STAFFING_GENERATE,
          number,
          file,
          confirmation_file: confirmationFile,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }

      // department_positions pivot sync (full replace).
      await tx
        .delete(staffing_approve_positions)
        .where(eq(staffing_approve_positions.staffing_approve_id, saId));
      if (departmentPositionsIds.length) {
        const [{ nextPid }] = await tx
          .select({
            nextPid: sql<number>`COALESCE(MAX(${staffing_approve_positions.id}), 0) + 1`,
          })
          .from(staffing_approve_positions);
        let pid = Number(nextPid);
        await tx.insert(staffing_approve_positions).values(
          departmentPositionsIds.map((dpId) => ({
            id: pid++,
            staffing_approve_id: saId,
            department_position_id: dpId,
            created_at: sql`NOW()`,
            updated_at: sql`NOW()`,
          })),
        );
      }

      // StaffingApproveConfirmation sync.
      await this.syncConfirmations(tx, saId, body, confirmations, wpMap);

      return { uuid, file, confirmationFile };
    });

    // ---- Hujjat generatsiyasi (transaction'dan keyin) ----
    const frontUrl = `${FRONT_URL}/public/staffing-approve/${saved.uuid}`;
    const qrBuffer = await QRCode.toBuffer(frontUrl, {
      type: 'png',
      width: 200,
      margin: 0,
    });

    const directorFullPosition = getFullPosition({
      position_name: director.pos_name,
      department_name: director.dept_name,
      department_level: director.dept_level,
      organization_full_name: director.org_full_name,
    });
    const directorShortName = this.shortName(
      director.worker_first,
      director.worker_middle,
      director.worker_last,
    );
    const orgFullName = org?.full_name ?? '';

    const xlsxBuffer = await this.buildStaffingExcel({
      changed,
      orgFullName,
      date,
      directorFullPosition,
      directorShortName,
      qrBuffer,
    });

    await this.minio.putObject(saved.file, xlsxBuffer, XLSX_MIME);
    const pdfBuffer = await this.convert.xlsxToPdf(xlsxBuffer);
    await this.minio.putObject(
      saved.confirmationFile,
      pdfBuffer,
      'application/pdf',
    );
  }

  // Laravel DocumentReplace::syncConfirmations — updateOrCreate (sa_id, worker_id).
  private async syncConfirmations(
    tx: Tx,
    saId: number,
    body: StaffingGenerateDto,
    confirmations: number[],
    wpMap: Map<number, WpInfo>,
  ): Promise<void> {
    const upsert = async (
      wpId: number,
      type: 's' | 'c' | 'd',
      order: number,
    ): Promise<void> => {
      const wp = wpMap.get(wpId);
      if (!wp || wp.worker_id == null) return;
      const position = getShortPosition({
        position_name: wp.pos_name,
        department_name: wp.dept_name,
        department_level: wp.dept_level,
        organization_full_name: wp.org_full_name,
      });
      const [existing] = await tx
        .select({ id: staffing_approve_confirmations.id })
        .from(staffing_approve_confirmations)
        .where(
          and(
            eq(staffing_approve_confirmations.staffing_approve_id, saId),
            eq(staffing_approve_confirmations.worker_id, wp.worker_id),
            notDeleted(staffing_approve_confirmations),
          ),
        )
        .limit(1);
      if (existing) {
        await tx
          .update(staffing_approve_confirmations)
          .set({ position, type, order, updated_at: sql`NOW()` })
          .where(eq(staffing_approve_confirmations.id, existing.id));
      } else {
        const [{ nextId }] = await tx
          .select({
            nextId: sql<number>`COALESCE(MAX(${staffing_approve_confirmations.id}), 0) + 1`,
          })
          .from(staffing_approve_confirmations);
        await tx.insert(staffing_approve_confirmations).values({
          id: Number(nextId),
          staffing_approve_id: saId,
          worker_id: wp.worker_id,
          position,
          type,
          order,
          created_at: sql`NOW()`,
          updated_at: sql`NOW()`,
        });
      }
    };

    let order = 0;
    for (const c of confirmations) {
      order++;
      await upsert(c, 's', order);
    }
    order++;
    await upsert(body.confirmatory_id, 'c', order);
    order++;
    await upsert(body.director_id, 'd', order);
  }

  /**
   * Laravel `StaffingApproveExport` ekvivalenti — shtatlar jadvali Excel.
   * 9 qatorli sarlavha (title + TASDIQLAYMAN + direktor + sana + org + subtitle + ustun nomlari),
   * keyin har bo'lim uchun nom qatori (A:G merge) + lavozimlar (T/r, nom, rate, group, rank, salary, amount, holat).
   * G4 yacheykada QR rasmi.
   */
  private async buildStaffingExcel(params: {
    changed: ChangedDepartment[];
    orgFullName: string;
    date: string;
    directorFullPosition: string;
    directorShortName: string;
    qrBuffer: Buffer;
  }): Promise<Buffer> {
    const {
      changed,
      orgFullName,
      date,
      directorFullPosition,
      directorShortName,
      qrBuffer,
    } = params;
    const dateTex = this.getDateTex(date);
    const staffOrgText = `${orgFullName}ning ${dateTex} xolatiga`;

    // 9 ta sarlavha qatori (Laravel headings()).
    const headerRows = [
      {
        values: ['TAKLIF ETILGAN SHTATLAR JADVALI NAMUNASI'],
        style: { bold: true, fontSize: 16 },
        height: 50,
      },
      {
        values: ['', '', '', '', '', '', '"TASDIQLAYMAN"'],
        style: { bold: true },
      },
      {
        values: ['', '', '', '', '', '', directorFullPosition],
        style: { bold: true },
        height: 40,
      },
      {
        values: ['', '', '', '', '', '', '', directorShortName],
        style: { bold: true },
        height: 30,
      },
      {
        values: ['', '', '', '', '', '', '', dateTex],
        style: { bold: true },
        height: 30,
      },
      {
        values: [staffOrgText],
        style: { bold: true, fontSize: 12 },
        height: 20,
      },
      {
        values: ["SHTATLAR JADVALIGA O'ZGARTIRISH/TASDIQLASH"],
        style: { bold: true, fontSize: 16 },
        height: 30,
      },
      { values: [''], style: {} },
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
        style: { bold: true, fontSize: 12 },
      },
    ];

    // Data qatorlari + merge'lar (sarlavha + bo'lim nomi).
    const rows: Record<string, unknown>[] = [];
    const merges: string[] = [
      'A1:H1',
      'G2:H2',
      'G3:H3',
      'F4:G5',
      'A6:H6',
      'A7:H7',
    ];
    let currentRow = headerRows.length + 1; // = 10

    for (const dep of changed) {
      // bo'lim nomi qatori — A:G merge (Laravel: col..col+6).
      rows.push({
        tr: dep.name ?? '',
        name: '',
        rate: '',
        group: '',
        rank: '',
        salary: '',
        amount: '',
        status: '',
      });
      merges.push(`A${currentRow}:G${currentRow}`);
      currentRow++;

      let index = 0;
      for (const p of dep.positions) {
        index++;
        // Laravel: D=group, E=rank (sarlavha "Razryad"/"Guruh" bilan teskari — parity).
        rows.push({
          tr: index,
          name: p.name ?? '',
          rate: p.rate,
          group: p.group ?? '',
          rank: p.rank ?? '',
          salary: p.salary,
          amount: p.amount,
          status: p.changed_status.name ?? '',
        });
        currentRow++;
      }
    }
    const lastDataRow = currentRow - 1;

    return this.excel.build({
      creator: 'HRM Economist',
      sheets: [
        {
          name: 'Shtatlar jadvali',
          columns: [
            { header: '', key: 'tr', width: 5 },
            { header: '', key: 'name', width: 45 },
            { header: '', key: 'rate', width: 10 },
            { header: '', key: 'group', width: 10 },
            { header: '', key: 'rank', width: 10 },
            { header: '', key: 'salary', width: 10 },
            { header: '', key: 'amount', width: 15 },
            { header: '', key: 'status', width: 20 },
          ],
          headerRows,
          rows,
          merges,
          customize: (ws, wb) => {
            // QR rasm — G4 (Laravel Drawing setCoordinates('G4'), height 75).
            const qrId = wb.addImage({
              buffer: qrBuffer as unknown as ArrayBuffer,
              extension: 'png',
            });
            ws.addImage(qrId, {
              tl: { col: 6, row: 3 },
              ext: { width: 75, height: 75 },
              editAs: 'oneCell',
            });

            // Butun sheet — markaz + middle + wrapText (Laravel global alignment).
            const highestCol = ws.columnCount;
            const highestRow = ws.rowCount;
            for (let r = 1; r <= highestRow; r++) {
              const row = ws.getRow(r);
              for (let c = 1; c <= highestCol; c++) {
                row.getCell(c).alignment = {
                  horizontal: 'center',
                  vertical: 'middle',
                  wrapText: true,
                };
              }
            }

            // Data qatorlari (10..last) — ingichka border.
            for (let r = 10; r <= lastDataRow; r++) {
              const row = ws.getRow(r);
              for (let c = 1; c <= 8; c++) {
                row.getCell(c).border = {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' },
                };
              }
            }

            // Sahifa sozlamalari — landscape, eniga 1 sahifa.
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
            if (lastDataRow >= 1) {
              ws.pageSetup.printArea = `A1:H${Math.max(lastDataRow, 9)}`;
            }
          },
        },
      ],
    });
  }

  /**
   * DELETE /api/v1/economist/staffing/approve/{id} — Laravel `StaffingApproveController::destroy`.
   * findOrFail → confirmation === SUCCESS bo'lsa o'chirib bo'lmaydi → soft-delete.
   */
  async approveDestroy(id: number): Promise<void> {
    const [row] = await this.db
      .select({
        id: staffing_approves.id,
        confirmation: staffing_approves.confirmation,
      })
      .from(staffing_approves)
      .where(eq(staffing_approves.id, id))
      .limit(1);
    if (!row) {
      throw new BusinessException(404, this.i18n.t('messages.not_found'));
    }
    if (row.confirmation === CONFIRMATION_STATUS_SUCCESS) {
      throw new BusinessException(
        400,
        this.i18n.t(
          'messages.you_cannot_delete_a_document_that_has_been_approved',
        ),
      );
    }
    await this.db
      .update(staffing_approves)
      .set({ deleted_at: sql`NOW()` })
      .where(eq(staffing_approves.id, id));
  }
}
